"use strict";

const validationUtils = require('./validation.js');
const { EVENT, INTEREST_STATE } = require('./constants.js');
const PositionEntity = require('./entity/position_entity.js');
const InterestEntity = require('./entity/interest_entity.js');
const { AoiValidationError, AoiStateError } = require('./errors.js');

/**
 * AOI管理器
 */
class AoiManager {
    /**
     * 构造函数
     * @param {import("./backend/abstract_backend.js")} backend 场景候选后端
     * @param {Function} onNotify 通知回调
     * @param {number} maxAxisExtentXZ 最大轴向范围
     * @param {import("./geometry/bounds.js").WorldBounds} maxBounds 场景边界
     */
    constructor(backend, onNotify, maxAxisExtentXZ, maxBounds) {
        validationUtils.assertFiniteNumbers(maxAxisExtentXZ, 'maxAxisExtentXZ');

        /**
         * 场景候选后端, 负责维护索引和返回候选entityId
         * 不判断polic 修改 interest 或 发生通知
         * @type {import("./backend/abstract_backend.js")}
         */
        this._backend = backend;
        /**
         * 场景边界
         * @type {import("./geometry/bounds.js").WorldBounds}
         * @default null
         */
        this._worldBounds = maxBounds || null;
        /**
         * policy 最大轴向范围
         * @type {number}
         */
        this._maxAxisExtentXZ = maxAxisExtentXZ || Number.POSITIVE_INFINITY;
        /**
         * 通知回调
         * @type {Function}
         */
        this._onNotify = onNotify;
        /**
         * 实体映射
         * entityId ==> PositionEntity
         * @type {Map<number, PositionEntity>}
         */
        this._entities = new Map();
        /**
         * Guid ==> entityId 的索引
         * @type {Map<string|number, number>}
         */
        this._guidToEntityId = new Map();
        /**
         * interestId ==> InterestEntity
         * @type {Map<number, InterestEntity>}
         */
        this._interestEntities = new Map();
        /**
         * 实体Id分配器
         * @type {number}
         */
        this._entityIdAllocator = 0;
        /**
         * 兴趣Id分配器
         * @type {number}
         */
        this._interestIdAllocator = 0;
        /**
         * 所有者实体Id到事件的映射
         * @type {Map<number, {ownerGuid: string|number, ownerEntityId: number, events: Array<{event:string, interestId: number, targetEntityId: number, targetGuid: string|number}>}>}
         */
        this._ownerEntityIdToEvents = new Map();
        /**
         * 是否正在更新
         * @type {boolean}
         */
        this._updating = false;
        /**
         * 是否正在分发
         * @type {boolean}
         */
        this._dispatching = false;
    }

    /**
     * 分配实体Id
     * @returns {number} 实体Id
     */
    _allocateEntityId() {
        return ++this._entityIdAllocator;
    }

    /**
     * 分配兴趣Id
     * @returns {number} 兴趣Id
     */
    _allocateInterestId() {
        return ++this._interestIdAllocator;
    }

    /**
     * 添加事件
     * @param {number} ownerEntityId 所有者实体Id
     * @param {string|number} ownerGuid 所有者Guid
     * @param {{event:string, interestId: number, targetEntityId: number, targetGuid: string|number}} event 事件
     */
    _addEvent(ownerEntityId, ownerGuid, event) {
        let allEvents = this._ownerEntityIdToEvents.get(ownerEntityId);
        if (!allEvents) {
            allEvents = { ownerGuid, ownerEntityId, events: [], };
            this._ownerEntityIdToEvents.set(ownerEntityId, allEvents);
        }
        allEvents.events.push(event);
    }

    /**
     * 获取当前通知队列快照并清空
     * @returns {Array<{ownerEntityId: number, ownerGuid: string|number, events: Array<{event:string, interestId: number, targetEntityId: number, targetGuid: string|number}>}>}
     */
    _snapshotEventsAndClear() {
        const pendingNotifies = this._ownerEntityIdToEvents;
        this._ownerEntityIdToEvents = new Map();

        // 排序保证通知按照实体顺序来 方便上层业务验证
        // 如果不关心顺序 可以不排序 并不改变同一个实体事件的触发顺序
        const ownerEntityIds = Array.from(pendingNotifies.keys()).sort((a, b) => a - b);
        const batches = [];

        for (const ownerEntityId of ownerEntityIds) {
            const allEvents = pendingNotifies.get(ownerEntityId);
            if (allEvents.events.length <= 0) {
                continue;
            }
            batches.push(allEvents);
        }
        return batches;
    }

    /**
    * 从对目标感兴趣的实体中移除目标Id
    * @param {InterestEntity} interestEntity 感兴趣的实体
    * @param {PositionEntity} targetEntity 目标实体
    */
    _removeTargetFromInterestedEntities(interestEntity, targetEntity) {
        // 获取所有者
        const ownerEntity = this._entities.get(interestEntity.ownerEntityId);
        // 移除目标
        const change = interestEntity.removeTarget(targetEntity.entityId);
        // 从目标的被关注列表移除
        targetEntity.interestedMeInterestIds.delete(interestEntity.interestId);
        if (ownerEntity && change.event === EVENT.LEAVE) {
            // 通知观察者目标离开
            this._addEvent(ownerEntity.entityId, ownerEntity.guid, {
                event: change.event,
                interestId: interestEntity.interestId,
                targetEntityId: targetEntity.entityId,
                targetGuid: targetEntity.guid,
            });
        }
        return change;
    }

    /**
     * 应用兴趣状态 会同步更新通知队列和反向索引
     * @param {InterestEntity} interestEntity 兴趣实体
     * @param {PositionEntity} targetEntity 目标实体
     * @param {INTEREST_STATE} interestState 兴趣状态
     * @param {boolean} active 是否激活
     * @desc
     *  只有整体关系从 “不可见” 变为 “可见” 才会产生 enter
     *  只有整体关系从 “可见” 变为 “不可见” 才会产生 leave
     */
    _applyInterestState(interestEntity, targetEntity, interestState, active = false) {
        const ownerEntity = this._entities.get(interestEntity.ownerEntityId);
        if (!ownerEntity) {
            return null;
        }
        const change = interestEntity.setInterestState(targetEntity.entityId, interestState, active);
        if (change.event === EVENT.ENTER) {
            targetEntity.interestedMeInterestIds.add(interestEntity.interestId);
        }
        else if (change.event === EVENT.LEAVE) {
            targetEntity.interestedMeInterestIds.delete(interestEntity.interestId);
        }

        if (change.event !== EVENT.NONE) {
            this._addEvent(ownerEntity.entityId, ownerEntity.guid, {
                event: change.event,
                interestId: interestEntity.interestId,
                targetEntityId: targetEntity.entityId,
                targetGuid: targetEntity.guid,
            });
        }

        return change;
    }

    /**
     * 校验策略
     * @param {import("./policy/interest_policy.js")} policy 策略
     * @throws {AoiValidationError} 如果策略不合法
     */
    _assertPolicy(policy) {
        const extent = policy.getMaxAxisExtentXZ();
        if (extent > this._maxAxisExtentXZ) {
            throw new AoiValidationError(`Policy extent ${extent} is greater than max axis extent ${this._maxAxisExtentXZ}`);
        }
    }

    /**
     * 分发通知快照
     * @param {Array<{ownerEntityId: number, ownerGuid: string|number, events: Array<{event:string, interestId: number, targetEntityId: number, targetGuid: string|number}>}>} batches 通知快照
     */
    _dispatchBatches(batches) {
        this._dispatching = true;
        let firstError = null;
        try {
            for (const batch of batches) {
                try {
                    this._onNotify(batch.ownerGuid, batch.events);
                }
                catch (err) {
                    !firstError && (firstError = err);
                }
            }
        }
        finally {
            this._dispatching = false;
        }

        if (firstError) {
            throw firstError;
        }
    }

    /**
     * 更新观察区域的距离内的状态 不影响强制关注的对象
     * @param {InterestEntity} interestEntity 兴趣实体
     * @description
     *  1. 复查当前的 distance 关系
     *  2. 移除失效的
     *  3. 通过 backend 筛选后端
     *  4. 候选去重排序
     *  5. 按照policy匹配
     *  6. 检查最大观察数量，添加新的 distance 关系
     */
    _refreshDistanceInterest(interestEntity) {
        const ownerEntity = this._entities.get(interestEntity.ownerEntityId);
        if (!ownerEntity) {
            return;
        }
        // 复查当前的 distance 关系 使用快照 循环中可能被删除
        for (const targetEntityId of Array.from(interestEntity.interests.keys())) {
            if (!interestEntity.hasInterestState(targetEntityId, INTEREST_STATE.DISTANCE)) {
                continue;
            }
            const targetEntity = this._entities.get(targetEntityId);
            // 如果目标实体不存在 或者 策略匹配失败 取消 distance 关系
            if (!targetEntity || !interestEntity.policy.matchesDistance(ownerEntity, targetEntity)) {
                if (targetEntity) {
                    this._applyInterestState(interestEntity, targetEntity, INTEREST_STATE.DISTANCE, false);
                }
                else {
                    interestEntity.setInterestState(targetEntityId, INTEREST_STATE.DISTANCE, false);
                }
            }
        }
        // 通过 backend 筛选候选实体Id
        const backendCandidates = this._backend.queryCandidateEntityIds(interestEntity.policy.createCandidateBounds(ownerEntity));
        for (const candidateEntityId of backendCandidates) {
            // 排序自己
            if (candidateEntityId === ownerEntity.entityId) {
                continue;
            }
            const targetEntity = this._entities.get(candidateEntityId);
            if (!targetEntity) {
                continue;
            }
            // 排除距离之外 (距离已经排查过了不再排查)
            if (interestEntity.hasInterestState(candidateEntityId, INTEREST_STATE.DISTANCE) ||
                !interestEntity.policy.matchesDistance(ownerEntity, targetEntity)) {
                continue;
            }
            // 检查容量
            if (!interestEntity.policy.canAcceptDistance(interestEntity.interests.size)) {
                continue;
            }
            // 添加距离关系
            this._applyInterestState(interestEntity, targetEntity, INTEREST_STATE.DISTANCE, true);
        }
    }

    /**
     * 添加实体
     * @param {string|number} guid 实体唯一标识
     * @param {import("./geometry/position.js")} pos 实体位置
     * @param {number} flags 实体标志
     * @returns {number} 实体Id
     */
    addEntity(guid, pos, flags = 0) {
        // 检查重复添加
        if (this._guidToEntityId.has(guid)) {
            throw new AoiValidationError(`Entity with guid ${guid} already exists`);
        }
        // 检查在地图范围之内
        if (!this.isInsideWorldBounds(pos)) {
            throw new AoiValidationError(`Entity with position ${pos} is outside the world bounds`);
        }
        // 创建实体
        const entityId = this._allocateEntityId();
        const entity = new PositionEntity(entityId, guid, pos, flags);
        // 添加到 backend
        this._backend.addEntity(entity.entityId, entity.pos);
        // 添加到 AoiManager
        this._entities.set(entity.entityId, entity);
        this._guidToEntityId.set(guid, entity.entityId);

        return entityId;
    }

    /**
     * 检查位置是否在地图范围之内
     * @param {import("./geometry/position.js")} pos 位置
     * @returns {boolean} 是否在地图范围之内
     */
    isInsideWorldBounds(pos) {
        return !this._worldBounds || this._worldBounds.contains(pos);
    }

    /**
     * 移除实体
     * @param {number} entityId 实体Id
     * @returns {boolean} 是否移除成功
     */
    removeEntity(entityId) {
        const entity = this._entities.get(entityId);
        if (!entity) {
            return false;
        }
        // 从对目标感兴趣的实体中移除目标Id
        for (const interestId of entity.interestedMeInterestIds) {
            const interestEntity = this._interestEntities.get(interestId);
            if (interestEntity) {
                this._removeTargetFromInterestedEntities(interestEntity, entity);
            }
        }
        // 移除自身的观察区域
        for (const interestId of Array.from(entity.interestIds)) {
            this.removeInterest(interestId);
        }

        // 后端中移除实体
        this._backend.removeEntity(entity.entityId, entity.pos);
        entity.deactivate();
        // 从映射中移除
        this._entities.delete(entity.entityId);
        this._guidToEntityId.delete(entity.guid);

        return true;
    }

    /**
     * 移除观察区域 解除它对全部目标的观察状态、
     * 对仍存在的目标会通知队列排队leave，在下一次update统一派发
     * @param {number} interestId 兴趣Id
     */
    removeInterest(interestId) {
        const interestEntity = this._interestEntities.get(interestId);
        if (!interestEntity) {
            return false;
        }
        // 移除目标
        for (const targetEntityId of interestEntity.interests.keys()) {
            const targetEntity = this._entities.get(targetEntityId);
            if (targetEntity) {
                // 目标存在 通知队列排队leave
                this._removeTargetFromInterestedEntities(interestEntity, targetEntity);
            }
            else {
                // 目标不存在 直接移除
                interestEntity.removeTarget(targetEntityId);
            }
        }
        // 移除自身的观察区域
        const ownerEntity = this._entities.get(interestEntity.ownerEntityId);
        if (ownerEntity) {
            ownerEntity.interestIds.delete(interestId);
        }

        interestEntity.deactivate();
        this._interestEntities.delete(interestId);

        return true;
    }

    /**
     * 移动实体
     * @param {number} entityId 实体Id
     * @param {import("./geometry/position.js")} pos 实体位置
     */
    moveEntity(entityId, pos) {
        const entity = this._entities.get(entityId);
        if (!entity) {
            return false;
        }
        // check 位置是否在地图范围之内
        if (!this.isInsideWorldBounds(pos)) {
            return false;
        }
        // 更新位置
        const prevPos = entity.pos;
        entity.setPosition(pos);
        // 后端中移动实体
        if (!this._backend.moveEntity(entityId, prevPos, pos)) {
            // 移动失败 恢复位置
            entity.setPosition(prevPos);
            return false;
        }
        return true;
    }

    /**
     * 改变实体标志
     * @param {number} entityId 实体Id
     * @param {number} flags 实体标志
     */
    changeFlags(entityId, flags) {
        const entity = this._entities.get(entityId);
        if (!entity) {
            return false;
        }
        entity.setFlags(flags);
        return true;
    }

    /**
     * 为实体添加观察目标规则的区域
     * @param {number} ownerEntityId 所有者实体Id
     * @param {import("./policy/policy.js")} policy 策略
     * @returns {number} 兴趣Id
     */
    addInterestWithPolicy(ownerEntityId, policy) {
        const ownerEntity = this._entities.get(ownerEntityId);
        if (!ownerEntity) {
            throw new AoiValidationError(`Owner entity with id ${ownerEntityId} not found`);
        }
        // policy 校验
        this._assertPolicy(policy);
        const interestId = this._allocateInterestId();
        const interestEntity = new InterestEntity(interestId, ownerEntityId, policy);
        this._interestEntities.set(interestId, interestEntity);
        // 添加到所有者实体的观察区域列表
        ownerEntity.interestIds.add(interestId);

        return interestId;
    }

    /**
     * 改变观察区域策略
     * @param {number} interestId 兴趣Id
     * @param {import("./policy/interest_policy.js")} policy 策略
     */
    changeInterestPolicy(interestId, policy) {
        const interestEntity = this._interestEntities.get(interestId);
        if (!interestEntity) {
            return false;
        }
        // policy 校验
        this._assertPolicy(policy);
        interestEntity.setPolicy(policy);
        return true;
    }

    /**
     * 强制将目标实体添加到观察区域中
     * @param {number} interestId 观察区域Id
     * @param {number} targetEntityId 目标实体Id
     */
    addForceInterest(interestId, targetEntityId) {
        const interestEntity = this._interestEntities.get(interestId);
        if (!interestEntity) {
            return false;
        }
        const targetEntity = this._entities.get(targetEntityId);
        if (!targetEntity) {
            return false;
        }
        const ownerEntity = this._entities.get(interestEntity.ownerEntityId);
        if (!ownerEntity) {
            return false;
        }
        // 自己不能观察自己
        if (ownerEntity.entityId === targetEntity.entityId) {
            return false;
        }
        // 如果目标实体已经处于强制观察状态 或者 策略匹配无法满足强制观察条件
        if (interestEntity.hasInterestState(targetEntity.entityId, INTEREST_STATE.FORCE) ||
            interestEntity.policy.matchesForced(ownerEntity, targetEntity)) {
            return false;
        }
        // 添加到观察区域
        this._applyInterestState(interestEntity, targetEntity, INTEREST_STATE.FORCE, true);

        return true;
    }

    /**
     * 解除对目标的强制观察
     * @param {number} interestId 观察区域Id
     * @param {number} targetEntityId 目标实体Id
     */
    removeForceInterest(interestId, targetEntityId) {
        const interestEntity = this._interestEntities.get(interestId);
        const targetEntity = this._entities.get(targetEntityId);

        // 如果兴趣实体不存在 或者 目标实体不存在 或者 目标实体不处于强制观察状态
        if (!interestEntity || !targetEntity || !interestEntity.hasInterestState(targetEntity.entityId, INTEREST_STATE.FORCE)) {
            return false;
        }

        this._applyInterestState(interestEntity, targetEntity, INTEREST_STATE.FORCE, false);
        return true;
    }

    /**
     * 查询正在关注的Guid列表
     * @param {number} interestId 兴趣Id
     * @returns {Array<string|number>} 兴趣实体的Guid列表
     */
    queryInterestGuids(interestId) {
        const interestEntity = this._interestEntities.get(interestId);
        if (!interestEntity) {
            return [];
        }
        const allEntityIds = Array.from(interestEntity.interests.keys());
        const allGuids = [];
        for (const entityId of allEntityIds) {
            const targetEntity = this._entities.get(entityId);
            if (targetEntity) {
                allGuids.push(targetEntity.guid);
            }
        }
        return allGuids;
    }

    /**
     * 执行一次完整AOI更新和同步
     * 1. 按照观察区域更新状态关系
     * 2. 冻结通知快照
     * 3. 通知上层业务变更
     * @warning 上一次 update 未完成前 或者 通知快照未冻结前 禁止重入 update
     */
    update() {
        if (this._updating || this._dispatching) {
            throw new AoiStateError('AOI is already updating or dispatching');
        }
        this._updating = true;
        let batches = [];
        try {
            const allInterestEntities = Array.from(this._interestEntities.values());
            for (const interestEntity of allInterestEntities) {
                if (interestEntity.active) {
                    this._refreshDistanceInterest(interestEntity);
                }
            }
            batches = this._snapshotEventsAndClear();
        }
        finally {
            this._updating = false;
        }

        this._dispatchBatches(batches);
    }

    /**
     * 清空所有实体和观察区域
     */
    clear() {
        for (const entityId of Array.from(this._entities.keys())) {
            this.removeEntity(entityId);
        }
        this._backend.clear();
    }

    /**
     * 使用任意图形执行一次空间查询
     * 只通过 backend 和 shape 筛选，不检查 policy flags maxInterest
     * 不会建立观察关系和产生通知 center 不要求于 worldBounds 内
     * @param {import("./shapes/shape.js")} shape 形状
     * @param {import("./geometry/position.js")} center 中心点
     * @param {Set<number>} excludeEntityIds 排除的实体Id列表
     * @returns {Array<number>} 符合条件的实体guid列表
     */
    query(shape, center, excludeEntityIds = new Set()) {
        const visitedEntityIds = new Set();
        const allGuids = new Set();

        const candidateEntityIds = this._backend.queryCandidateEntityIds(shape.getQueryBoundsXZ(center));
        for (const candidateEntityId of candidateEntityIds) {
            if (excludeEntityIds.has(candidateEntityId)) {
                continue;
            }
            if (visitedEntityIds.has(candidateEntityId)) {
                continue;
            }
            // 访问过
            visitedEntityIds.add(candidateEntityId);
            const entity = this._entities.get(candidateEntityId);
            if (entity && entity.active && shape.contains(center, entity.pos)) {
                allGuids.add(entity.guid);
            }
        }

        return Array.from(allGuids);
    }

    /**
     * 平面圆形的特化即时查询
     * @param {import("./geometry/position.js")} center 中心点
     * @param {number} radius 半径
     * @param {Set<number>} excludeEntityIds 排除的实体Id列表
     * @returns {Array<string|number>} 符合条件的实体guid列表
     */
    queryCircle(center, radius, excludeEntityIds = new Set()) {
        const Cycle = require("./shapes/cycle.js");
        return this.query(new Cycle(radius), center, excludeEntityIds);
    }

    /**
     * 平面矩形的特化即时查询
     * @param {import("./geometry/position.js")} center 中心点
     * @param {import("./geometry/half_extent.js").HalfExtentXZ} halfExtentXZ 半尺寸
     * @param {Set<number>} excludeEntityIds 排除的实体Id列表
     * @returns {Array<string|number>} 符合条件的实体guid列表
     */
    queryRectangle(center, halfExtentXZ, excludeEntityIds = new Set()) {
        const Rectangle = require("./shapes/rectangle.js");
        return this.query(new Rectangle(halfExtentXZ), center, excludeEntityIds);
    }

    /**
     * 平面正方形的特化即时查询
     * @param {import("./geometry/position.js")} center 中心点
     * @param {number} halfSize 半边长
     * @param {Set<number>} excludeEntityIds 排除的实体Id列表
     * @returns {Array<string|number>} 符合条件的实体guid列表
     */
    querySquare(center, halfSize, excludeEntityIds = new Set()) {
        return this.queryRectangle(center, new HalfExtentXZ(halfSize, halfSize), excludeEntityIds);
    }

    /**
     * 三维圆柱体的特化即时查询
     * @param {import("./geometry/position.js")} center 中心点
     * @param {number} radius 半径
     * @param {number} height 高度
     * @param {Set<number>} excludeEntityIds 排除的实体Id列表
     * @returns {Array<string|number>} 符合条件的实体guid列表
     */
    queryCylinder(center, radius, height, excludeEntityIds = new Set()) {
        const Cylinder = require("./shapes/cylinder.js");
        return this.query(new Cylinder(radius, height), center, excludeEntityIds);
    }

    /**
     * 三维长方体的特化即时查询
     * @param {import("./geometry/position.js")} center 中心点
     * @param {import("./geometry/half_extent.js").HalfExtent3D} halfExtent3D 半尺寸
     * @param {Set<number>} excludeEntityIds 排除的实体Id列表
     * @returns {Array<string|number>} 符合条件的实体guid列表
     */
    queryCuboid(center, halfExtent3D, excludeEntityIds = new Set()) {
        const Cuboid = require("./shapes/cuboid.js");
        return this.query(new Cuboid(halfExtent3D), center, excludeEntityIds);
    }

    /**
     * 三维正方体的特化即时查询
     * @param {import("./geometry/position.js")} center 中心点
     * @param {number} halfSize 半边长
     * @param {Set<number>} excludeEntityIds 排除的实体Id列表
     * @returns {Array<string|number>} 符合条件的实体guid列表
     */
    queryCube(center, halfSize, excludeEntityIds = new Set()) {
        return this.queryCuboid(center, new HalfExtent3D(halfSize, halfSize, halfSize), excludeEntityIds);
    }

    /**
     * 平面扇形的特化即时查询
     * @param {import("./geometry/position.js")} center 中心点
     * @param {number} radius 半径
     * @param {number} yaw 偏航角
     * @param {number} halfAngle 半角度
     * @param {Set<number>} excludeEntityIds 排除的实体Id列表
     * @returns {Array<string|number>} 符合条件的实体guid列表
     */
    queryFan(center, radius, yaw, halfAngle, excludeEntityIds = new Set()) {
        const Fan = require("./shapes/fan.js");
        return this.query(new Fan(radius, yaw, halfAngle), center, excludeEntityIds);
    }
}

module.exports = AoiManager;
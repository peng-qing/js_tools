"use strict";

const aoi = require("./source_aoi.js");
const { normalizeScenario } = require("./scenario_validation.js");

const WORLD_HEIGHT_EXTENT = 1000;
const MAX_POLICY_EXTENT_XZ = 100000;
const MAX_CELLS_PER_QUERY = 100000;

function position(value) {
    return new aoi.Position(value.x, value.y, value.z);
}

function createShape(policy) {
    switch (policy.shape) {
        case "circle":
            return new aoi.CycleXZ(policy.radius);
        case "rectangle":
            return new aoi.RectangleXZ(
                new aoi.HalfExtentXZ(policy.halfExtentX, policy.halfExtentZ)
            );
        case "fan":
            return new aoi.FanXZ(policy.radius, policy.yaw, policy.halfAngle);
        case "cylinder":
            return new aoi.Cylinder(policy.radius, policy.halfExtentY);
        case "cuboid":
            return new aoi.Cuboid(
                new aoi.HalfExtent3D(
                    policy.halfExtentX,
                    policy.halfExtentY,
                    policy.halfExtentZ
                )
            );
        default:
            throw new TypeError(`不支持的 Shape: ${policy.shape}`);
    }
}

function createBackend(scenario) {
    switch (scenario.backend) {
        case "grid":
            return new aoi.GridBackend(
                scenario.gridSize,
                MAX_CELLS_PER_QUERY
            );
        case "cross-linked-list":
            // 十字链表不划分固定网格，因此不使用 gridSize。
            return new aoi.CrossLinkedListBackend();
        case "brute":
            return new aoi.BruteBackend();
        default:
            // normalizeScenario 已完成白名单校验；这里保留防御分支，避免
            // 未来扩展校验器后静默回退到错误的 Backend。
            throw new TypeError(`不支持的 Backend: ${scenario.backend}`);
    }
}

function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}

/**
 * 使用 src/aoi 构建一个全新的、一次性的 AOI 场景。
 *
 * HTTP 请求之间不共享 Manager，因而拖动时每次计算都是相同输入对应相同
 * 输出，不会受到上一次请求中 ID、interest 或通知队列状态的污染。
 * 同时返回 Manager interest、即时 Shape 查询和 Policy 匹配三组结果，便于
 * 判断问题位于 Backend 粗筛、Policy，还是 interest 生命周期维护。
 */
function evaluateScenario(input) {
    const scenario = normalizeScenario(input);
    const shape = createShape(scenario.policy);
    const observerPosition = position(scenario.observer);
    const notifications = [];
    // src/aoi 的 WorldBounds 不包含端点。根边界略大于页面显示范围，使
    // 位于可视地图 ±mapExtent 边缘的实体仍然属于有效测试坐标。
    const worldBoundExtent = scenario.mapExtent + Math.max(
        1e-9,
        scenario.mapExtent * Number.EPSILON * 8
    );
    const manager = new aoi.AoiManager(
        createBackend(scenario),
        (ownerGuid, events) => notifications.push({ ownerGuid, events }),
        MAX_POLICY_EXTENT_XZ,
        new aoi.WorldBounds(
            new aoi.Position(
                -worldBoundExtent,
                -WORLD_HEIGHT_EXTENT,
                -worldBoundExtent
            ),
            new aoi.Position(
                worldBoundExtent,
                WORLD_HEIGHT_EXTENT,
                worldBoundExtent
            )
        )
    );
    const observerEntityId = manager.addEntity(
        scenario.observer.guid,
        observerPosition,
        scenario.observer.flags
    );
    const targetEntityIds = new Map();

    for (const target of scenario.targets) {
        targetEntityIds.set(
            target.guid,
            manager.addEntity(target.guid, position(target), target.flags)
        );
    }

    const heightRange = scenario.policy.heightEnabled
        ? new aoi.HeightRange(scenario.policy.minHeight, scenario.policy.maxHeight)
        : aoi.HeightRange.disabled();
    const policy = new aoi.SpatialInterestPolicy(
        shape,
        heightRange,
        new aoi.FlagFilter(
            scenario.policy.anyFlags,
            scenario.policy.needFlags,
            scenario.policy.forbidFlags
        ),
        scenario.policy.maxInterest
    );
    const interestId = manager.addInterestWithPolicy(observerEntityId, policy);
    let updateError = null;

    try {
        manager.update();
    } catch (error) {
        updateError = errorMessage(error);
    }

    let interestGuids = [];
    let interestQueryError = null;

    try {
        interestGuids = manager.queryInterestGuids(interestId);
    } catch (error) {
        interestQueryError = errorMessage(error);
    }

    let shapeQueryGuids = [];
    let shapeQueryError = null;

    try {
        shapeQueryGuids = manager.query(shape, observerPosition, new Set([observerEntityId]));
    } catch (error) {
        shapeQueryError = errorMessage(error);
    }

    const policyMatchedGuids = [];
    const policyErrors = [];
    const observerEntity = new aoi.PositionEntity(
        observerEntityId,
        scenario.observer.guid,
        observerPosition,
        scenario.observer.flags
    );

    for (const target of scenario.targets) {
        const targetEntity = new aoi.PositionEntity(
            targetEntityIds.get(target.guid),
            target.guid,
            position(target),
            target.flags
        );

        try {
            if (policy.matchesDistance(observerEntity, targetEntity)) {
                policyMatchedGuids.push(target.guid);
            }
        } catch (error) {
            policyErrors.push({ guid: target.guid, error: errorMessage(error) });
        }
    }

    const diagnostics = [];

    if (updateError) diagnostics.push(`Manager.update: ${updateError}`);
    if (interestQueryError) diagnostics.push(`queryInterestGuids: ${interestQueryError}`);
    if (shapeQueryError) diagnostics.push(`Manager.query: ${shapeQueryError}`);
    if (policyErrors.length > 0) diagnostics.push(`Policy 匹配异常: ${policyErrors[0].error}`);
    const policyMatchedSet = new Set(policyMatchedGuids);
    const expectedInterestCount = Math.min(
        policyMatchedGuids.length,
        scenario.policy.maxInterest
    );
    const containsUnexpectedInterest = interestGuids.some(
        (guid) => !policyMatchedSet.has(guid)
    );

    // 当前测试场景不创建 FORCE 来源，因此 Manager interest 应当全部来自
    // Policy 距离匹配，并受到 maxInterest 上限约束。只比较集合包含关系和
    // 期望数量，不要求不同 Backend 选择目标的遍历顺序完全相同。
    if (
        !updateError
        && (
            interestGuids.length !== expectedInterestCount
            || containsUnexpectedInterest
        )
    ) {
        diagnostics.push(
            "Manager interest 与 Policy 匹配及 maxInterest 约束不一致，请检查 interest 更新链路"
        );
    }

    const queryBounds = shape.getQueryBoundsXZ(observerPosition);

    return {
        observerEntityId,
        interestId,
        interestGuids,
        shapeQueryGuids,
        policyMatchedGuids,
        notifications,
        diagnostics,
        queryBounds: {
            minX: queryBounds.minX,
            maxX: queryBounds.maxX,
            minZ: queryBounds.minZ,
            maxZ: queryBounds.maxZ,
        },
    };
}

module.exports = { evaluateScenario };

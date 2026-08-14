"use strict";

const AoiBackend = require("./abstract_backend.js");
const {
    CrossLinkedListNode,
    XSortedAxisLinkedList,
    ZSortedAxisLinkedList,
} = require("./structures/cross_linked_list.js");

/**
 * 十字链表AOI后端
 * 
 * 每个实体只有一个节点，但是该节点会同时存在于 X/Z 轴双向链表
 * 删除、移动、添加实体会同步维护两条链
 * 查询根据当前坐标跨度估算 X/Z 轴扫描比例更小,
 * 沿该轴收集落入区间的节点,再用另一轴坐标进行包围盒过滤
 * 不限定固定世界边界或者网格尺寸
 * 但是十字链表不稳定，查询起点定位、插入、远距离移动最快的时间复杂度为 O(n)
 */
class CrossLinkedListBackend extends AoiBackend {
    constructor() {
        super();
        /**
         * entityId 到 十字链表节点 的映射，用于快速定位给节点
         * @type {Map<number, CrossLinkedListNode>}
         */
        this.nodes = new Map();
        /**
         * X 轴双向链表
         * @type {XSortedAxisLinkedList}
         */
        this.xLinkedList = new XSortedAxisLinkedList();
        /**
         * Z 轴双向链表
         * @type {ZSortedAxisLinkedList}
         */
        this.zLinkedList = new ZSortedAxisLinkedList();
    }

    /**
     * 添加实体
     * @param {number} entityId 实体Id
     * @param {import("../geometry/position.js")} pos 实体位置
     * @returns {boolean} 是否成功
     */
    addEntity(entityId, pos) {
        if (this.nodes.has(entityId)) {
            return false;
        }
        const node = new CrossLinkedListNode(entityId, pos);
        this.xLinkedList.insert(node);
        this.zLinkedList.insert(node);
        this.nodes.set(entityId, node);
        return true;
    }

    /**
     * 移除实体 同步移除 x/z 轴双向链表中的节点
     * @param {number} entityId 实体Id
     * @returns {boolean} 是否成功
     */
    removeEntity(entityId) {
        const node = this.nodes.get(entityId);
        if (!node) {
            return false;
        }
        this.xLinkedList.remove(node);
        this.zLinkedList.remove(node);
        this.nodes.delete(entityId);
        return true;
    }

    /**
     * 移动实体  并只重排坐标变化的轴向链表
     * @param {number} entityId 实体Id
     * @param {import("../geometry/position.js")} prevPos 之前的实体位置
     * @param {import("../geometry/position.js")} nextPos 新的实体位置
     * @returns {boolean} 是否成功
     */
    moveEntity(entityId, prevPos, nextPos) {
        const node = this.nodes.get(entityId);
        if (!node) {
            return false;
        }
        const xChange = node.pos.x !== nextPos.x;
        const zChange = node.pos.z !== nextPos.z;
        if (xChange) {
            this.xLinkedList.remove(node);
        }
        if (zChange) {
            this.zLinkedList.remove(node);
        }
        node.pos = nextPos;
        if (xChange) {
            this.xLinkedList.insert(node);
        }
        if (zChange) {
            this.zLinkedList.insert(node);
        }
        return true;
    }

    /**
     * 查询候选实体Id
     * @param {import("../geometry/bounds.js").BoundsXZ} queryBounds 查询范围
     * @returns {Array<number>} 候选实体Id集合
     */
    queryCandidateEntityIds(queryBounds) {
        if (this.nodes.size <= 0) {
            return [];
        }
        // x/z 轴覆盖率
        const xRatio = this.xLinkedList.coverageRatio(queryBounds.minX, queryBounds.maxX);
        const zRatio = this.zLinkedList.coverageRatio(queryBounds.minZ, queryBounds.maxZ);
        // 选择覆盖率更小的轴向进行查询
        return xRatio <= zRatio ? this._queryX(queryBounds) : this._queryZ(queryBounds);
    }

    /**
     * 清空十字链表
     */
    clear() {
        this.xLinkedList.clear();
        this.zLinkedList.clear();
        this.nodes.clear();
    }

    /**
     * 查询 X 轴候选实体Id
     * @param {import("../geometry/bounds.js").BoundsXZ} queryBounds 查询范围
     * @returns {Array<number>} 候选实体Id集合
     */
    _queryX(queryBounds) {
        const entityIds = [];
        const cursor = this.xLinkedList.createAxisRangeCursor(queryBounds.minX, queryBounds.maxX);
        let node = cursor.next();
        while (node) {
            if (node.pos.z >= queryBounds.minZ && node.pos.z <= queryBounds.maxZ) {
                entityIds.push(node.entityId);
            }
            node = cursor.next();
        }
        return entityIds;
    }

    /**
     * 查询 Z 轴候选实体Id
     * @param {import("../geometry/bounds.js").BoundsXZ} queryBounds 查询范围
     * @returns {Array<number>} 候选实体Id集合
     */
    _queryZ(queryBounds) {
        const entityIds = [];
        const cursor = this.zLinkedList.createAxisRangeCursor(queryBounds.minZ, queryBounds.maxZ);
        let node = cursor.next();
        while (node) {
            if (node.pos.x >= queryBounds.minX && node.pos.x <= queryBounds.maxX) {
                entityIds.push(node.entityId);
            }
            node = cursor.next();
        }
        return entityIds;
    }
}

module.exports = CrossLinkedListBackend;
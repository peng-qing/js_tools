"use strict";

const AbstractBackend = require("./abstract_backend.js");

/**
 * 暴力后端实现 直接遍历所有实体
 */
class BruteBackend extends AbstractBackend {
    constructor() {
        super();
        this.entities = new Set();
    }

    /**
     * 添加实体
     * @param {number} entityId 实体Id
     */
    addEntity(entityId) {
        this.entities.add(entityId);
    }

    /**
     * 移除实体
     * @param {number} entityId 实体Id
     */
    removeEntity(entityId) {
        this.entities.delete(entityId);
    }

    /**
     * 移动实体
     * @param {number} entityId 实体Id
     * @param {import("../geometry/position.js")} prevPos 之前的实体位置
     * @param {import("../geometry/position.js")} pos 新的实体位置
     */
    moveEntity(entityId, prevPos, pos) {
        void entityId;
        void prevPos;
        void pos;
    }

    /**
     * 查询候选实体Id列表
     * @param {import("../geometry/bounds.js")} bounds 包围盒
     * @returns {Array<number>} 候选实体Id列表
     */
    queryCandidateEntityIds(bounds) {
        void bounds;
        return Array.from(this.entities);
    }

    /**
     * 清空所有实体
     */
    clear() {
        this.entities.clear();
    }
}

module.exports = BruteBackend;
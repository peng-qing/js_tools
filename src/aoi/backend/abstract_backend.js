"use strict";

/**
 * Aoi抽象后端实现 只进行接口定义
 */
class AbstractBackend {
    constructor() {
    }

    /**
     * 添加实体
     * @param {number} entityId 实体Id
     * @param {import("../geometry/position.js")} pos 实体位置
     */
    addEntity(entityId, pos) {
        throw new Error("Not implemented");
    }

    /**
     * 移除实体
     * @param {number} entityId 实体Id
     * @param {import("../geometry/position.js")} pos 实体位置
     */
    removeEntity(entityId, pos) {
        throw new Error("Not implemented");
    }

    /**
     * 移动实体
     * @param {number} entityId 实体Id
     * @param {import("../geometry/position.js")} prevPos 之前的实体位置
     * @param {import("../geometry/position.js")} pos 新的实体位置
     * @returns {boolean} 是否成功
     */
    moveEntity(entityId, prevPos, pos) {
        throw new Error("Not implemented");
    }

    /**
     * 查询候选实体Id列表
     * @param {import("../geometry/bounds.js")} ownerBounds 所属实体的包围盒
     * @returns {Array<number>} 候选实体Id列表
     */
    queryCandidateEntityIds(ownerBounds) {
        throw new Error("Not implemented");
    }

    /**
     * 清空所有实体
     */
    clear() {
        throw new Error("Not implemented");
    }
}

module.exports = AbstractBackend;
"use strict";

class InterestPolicy {
    constructor() {
        if (new.target === InterestPolicy) {
            throw new Error('InterestPolicy is a abstract class');
        }
    }

    /**
     * 创建候选包围盒
     * @param {import('../entity/position_entity.js')} observer 观察者位置实体
     * @returns {import('../geometry/bounds.js').BoundsXZ} 候选包围盒
     */
    createCandidateBounds(observer) {
        void observer;
        throw new Error('createCandidateBounds is a abstract method');
    }

    /**
     * 判断普通距离规则
     * @param {import('../entity/position_entity.js')} observer 观察者位置实体
     * @param {import('../entity/position_entity.js')} target 目标位置实体
     * @returns {boolean} 是否匹配
     */
    matchesDistance(observer, target) {
        void observer;
        void target;
        throw new Error('matchesDistance is a abstract method');
    }

    /**
     * 判断目标是否允许获得 Force 来源
     * @param {import('../entity/position_entity.js')} observer 观察者位置实体
     * @param {import('../entity/position_entity.js')} target 目标位置实体
     * @returns {boolean} 是否允许获得 Force 来源
     */
    matchesForced(observer, target) {
        void observer;
        void target;
        throw new Error('matchesForced is a abstract method');
    }

    /**
     * 判断是否允许新增一个 distance 来源
     * @param {number} currentInterestCount 当前兴趣目标数
     * @returns {boolean} 是否允许新增一个 distance 来源
     */
    canAcceptDistance(currentInterestCount) {
        void currentInterestCount;
        throw new Error('canAcceptDistance is a abstract method');
    }

    /**
     * 获取最大轴向范围
     * @returns {number} 最大轴向范围
     */
    getMaxAxisExtentXZ() {
        throw new Error('getMaxAxisExtentXZ is a abstract method');
    }
}

module.exports = InterestPolicy;   
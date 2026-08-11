"use strict";

const FlagFilter = require('./flag_filter.js');
const InterestPolicy = require('./interest_policy.js');
const validationUtils = require('../validation.js');
const HeightRange = require('../geometry/height_range.js');

/**
 * 空间兴趣策略
 * 当前aoi提供的默认策略，支持图形、高度、标记过滤检测
 */
class SpatialInterestPolicy extends InterestPolicy {
    /**
     * 构造函数
     * @param {import('../shapes/shape.js')} shape 形状
     * @param {HeightRange} heightRange 高度范围
     * @param {FlagFilter} flagFilter 标志过滤器
     * @param {number} maxInterest 最大关注目标数
     */
    constructor(shape, heightRange = HeightRange.disabled(), flagFilter = new FlagFilter(), maxInterest = 10) {
        super();

        validationUtils.assertNonNegativeNumbers(maxInterest, 'maxInterest');

        /**
         * 形状
         * @type {import('../shapes/shape.js')}
         */
        this.shape = shape;
        /**
         * 高度范围
         * @type {HeightRange}
         */
        this.heightRange = heightRange;
        /**
         * 标志过滤器
         * @type {FlagFilter}
         */
        this.flagFilter = flagFilter;
        /**
         * 最大关注目标数
         * @type {number}
         */
        this.maxInterest = maxInterest;
    }

    /**
     * 创建候选请求
     * @param {import('../entity/position_entity.js')} observer 观察者位置实体
     * @returns {import('../geometry/bounds.js').BoundsXZ} 候选请求边界
     */
    createCandidateBounds(observer) {
        return this.shape.getQueryBoundsXZ(observer.pos);
    }

    /**
     * 判断普通距离规则
     * @param {import('../entity/position_entity.js')} observer 观察者位置实体
     * @param {import('../entity/position_entity.js')} target 目标位置实体
     * @returns {boolean} 是否匹配
     */
    matchesDistance(observer, target) {
        return (
            // 形状包含
            this.shape.contains(observer.pos, target.pos) &&
            // 高度范围包含
            this.heightRange.contains(target.pos) &&
            // 标志过滤器匹配
            this.flagFilter.matches(target.flags)
        )
    }

    /**
     * 判断目标是否允许获得 Force 来源
     * @param {import('../entity/position_entity.js')} observer 观察者位置实体
     * @param {import('../entity/position_entity.js')} target 目标位置实体
     * @returns {boolean} 是否允许获得 Force 来源
     */
    matchesForced(observer, target) {
        void observer;
        return this.flagFilter.matches(target.flags);
    }

    /**
     * 判断是否允许新增一个 distance 来源
     * @param {number} currentInterestCount 当前兴趣目标数
     * @returns {boolean} 是否允许新增一个 distance 来源
     */
    canAcceptDistance(currentInterestCount) {
        return currentInterestCount < this.maxInterest;
    }

    /**
     * 获取最大轴向范围
     * @returns {number} 最大轴向范围
     */
    getMaxAxisExtentXZ() {
        return this.shape.getMaxAxisExtentXZ();
    }
}

module.exports = SpatialInterestPolicy;
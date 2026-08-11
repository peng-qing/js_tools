"use strict";

const Shape = require("./shape.js");
const { SHAPE_KIND } = require("../constants.js");
const validationUtils = require("../validation.js");
const { BoundsXZ } = require("../geometry/bounds.js");
const { AoiValidationError } = require("../errors.js");

/** 边缘比较的容忍度(公差) */
const COMPARE_TOLERANCE = Number.EPSILON * 8;

/**
 * 扇形形状
 * 在XZ平面上，以中心点为扇形，半径为r，角度为theta的扇形
 * 角度和朝向的定义如下：
 * 
 *                   +Z
                   ↑
         yaw=PI/2  │
                   │
yaw=PI  ←──────────┼──────────→ yaw=0
        -X         │                  +X
                   │
                   ↓
                  -Z
              yaw=-PI/2
 */
class FanXZ extends Shape {
    constructor(radius, yaw, halfAngle) {
        super(SHAPE_KIND.FAN_XZ);
        validationUtils.assertNonNegativeNumbers(radius, "radius");
        validationUtils.assertNonNegativeNumbers(yaw, "yaw");
        validationUtils.assertNonNegativeNumbers(halfAngle, "halfAngle");
        if (halfAngle >= Math.PI) {
            throw new AoiValidationError(`halfAngle must be less than or equal to Math.PI`);
        }

        /**
         * 半径
         * @type {number}
         */
        this.radius = radius;
        /**
         * 偏航角
         * @type {number}
         */
        this.yaw = yaw;
        /**
         * 半角
         * @type {number}
         */
        this.halfAngle = halfAngle;

        Object.freeze(this);
    }

    /**
     * 获取查询XZ包围盒
     * @param {import("../geometry/position.js")} center 中心点
     * @returns {BoundsXZ} 查询XZ包围盒
     */
    getQueryBoundsXZ(center) {
        // 这里不需要生成紧致的包围盒所以直接用圆形的包围盒就行
        // 需要在后续的 contains 方法中判断是否在扇形内
        // 实现更简单 虽然会多扫描目标 但是不会漏目标
        return new BoundsXZ(
            center.x - this.radius,
            center.x + this.radius,
            center.z - this.radius,
            center.z + this.radius);
    }

    /**
     * 判断目标是否在形状内 
     * @param {import("../geometry/position.js")} observer 观察者位置
     * @param {import("../geometry/position.js")} target 目标位置
     * @returns {boolean} 是否在形状内
     */
    contains(observer, target) {
        // (x1-x2)^2 + (z1-z2)^2 > r^2
        const distanceSquared = (target.x - observer.x) ** 2 + (target.z - observer.z) ** 2;
        if (distanceSquared > this.radius ** 2) {
            return false;
        }
        // 说明二者的坐标是一样的
        // 此时方向角是没有意义的
        if (distanceSquared === 0) return true;

        // 计算扇形朝向的单位向量 (directionX, directionZ)
        const directionX = Math.cos(this.yaw);
        const directionZ = Math.sin(this.yaw);
        // 计算 observer 到 target 的朝向向量(diffX, diffZ) 需要指向 target
        const diffX = target.x - observer.x;
        const diffZ = target.z - observer.z;

        // 计算二者的点积 A · B = |A| × |B| × cos(θ)
        const dotProduct = diffX * directionX + diffZ * directionZ;
        // 根据点积的公式计算 cos(θ) = A · B / (|A| × |B|)
        // 其中A为单位向量 所以 模为1 所以公式简化为 cos(θ) = A · B / |B|
        const cosTheta = dotProduct / (Math.sqrt(distanceSquared));
        // 计算二者的夹角 θ = acos(cosTheta) 
        // 因为 halfAngle 是扇形半角他的区间是 [0, Math.PI]
        // 这个区间内 cos(theta) 是递减的 所以 cos(theta) >= cos(halfAngle) 等价于 theta <= halfAngle
        // return cosTheta >= Math.cos(this.halfAngle);
        // 由于 nodejs 浮点数精度的问题 这里给一个冗余误差 误差内的值仍然认为其在扇形内
        return cosTheta + COMPARE_TOLERANCE >= Math.cos(this.halfAngle);
    }

    /**
     * 获取XZ轴的最大扩展
     * @returns {number} 最大扩展
     */
    getMaxAxisExtentXZ() {
        return this.radius;
    }
}

module.exports = FanXZ;
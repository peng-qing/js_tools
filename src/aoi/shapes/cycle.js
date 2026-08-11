"use strict";

const Shape = require("./shape.js");
const { SHAPE_KIND } = require("../constants.js");
const validationUtils = require("../validation.js");
const { BoundsXZ } = require("../geometry/bounds.js");

/**
 * 圆形形状
 * 在XZ平面上，以中心点为圆心，半径为r的圆形
 */
class CycleXZ extends Shape {

    constructor(radius) {
        super(SHAPE_KIND.CYCLE_XZ);

        validationUtils.assertNonNegativeNumbers(radius, "radius");

        this.radius = radius;

        Object.freeze(this);
    }

    /**
     * 获取查询XZ包围盒
     * @param {Position} center 中心点
     * @returns {BoundsXZ} 查询XZ包围盒
     */
    getQueryBoundsXZ(center) {
        return new BoundsXZ(
            center.x - this.radius,
            center.x + this.radius,
            center.z - this.radius,
            center.z + this.radius
        );
    }

    /**
     * 判断目标是否在形状内  包含边界点
     * @param {import("../geometry/position.js")} observer 观察者位置
     * @param {import("../geometry/position.js")} target 目标位置
     * @returns {boolean} 是否在形状内 
     */
    contains(observer, target) {
        const diffX = observer.x - target.x;
        const diffZ = observer.z - target.z;
        // (x - x0)^2 + (z - z0)^2 <= r^2
        return diffX ** 2 + diffZ ** 2 <= this.radius ** 2;
    }

    /**
     * 获取最大轴向范围
     * @returns {number} 最大轴向范围
     */
    getMaxAxisExtentXZ() {
        return this.radius;
    }
}

module.exports = CycleXZ;

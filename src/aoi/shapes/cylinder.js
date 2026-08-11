"use strict";

const Shape = require("./shape.js");
const { SHAPE_KIND } = require("../constants.js");
const validationUtils = require("../validation.js");
const { BoundsXZ } = require("../geometry/bounds.js");

/**
 * 圆柱形状
 * 在XZ平面上，以中心点为圆柱，半径为r，高度为h的圆柱
 */
class Cylinder extends Shape {

    constructor(radius, halfHeight) {
        super(SHAPE_KIND.CYLINDER);

        validationUtils.assertNonNegativeNumbers(radius, "radius");
        validationUtils.assertNonNegativeNumbers(halfHeight, "halfHeight");

        this.radius = radius;
        this.halfHeight = halfHeight;

        Object.freeze(this);
    }

    /**
     * 获取查询XZ包围盒
     * @param {import("../geometry/position.js")} center 中心点
     * @returns {BoundsXZ} 查询XZ包围盒
     */
    getQueryBoundsXZ(center) {
        // 根据中心点和半径计算包围盒
        return new BoundsXZ(
            center.x - this.radius,
            center.x + this.radius,
            center.z - this.radius,
            center.z + this.radius
        );
    }

    /**
     * 判断目标是否在形状内
     * @param {import("../geometry/position.js")} observer 观察者位置
     * @param {import("../geometry/position.js")} target 目标位置
     * @returns {boolean} 是否在形状内
     */
    contains(observer, target) {
        const diffX = observer.x - target.x;
        const diffZ = observer.z - target.z;
        const diffY = observer.y - target.y;
        // diffX^2 + diffZ^2 <= r^2 && |diffY| <= halfHeight
        return (diffX ** 2 + diffZ ** 2 <= this.radius ** 2) && (Math.abs(diffY) <= this.halfHeight);
    }

    /**
     * 获取最大轴向范围
     * @returns {number} 最大轴向范围
     */
    getMaxAxisExtentXZ() {
        return this.radius;
    }
}

module.exports = Cylinder;
"use strict";

const Shape = require("./shape.js");
const { SHAPE_KIND } = require("../constants.js");
const { BoundsXZ } = require("../geometry/bounds.js");
const { HalfExtent3D } = require("../geometry/half_extent.js");

/**
 * 长方体形状
 * 在XYZ空间内，以中心点为长方体，半径为x，高度为y，深度为z的长方体
 */
class Cuboid extends Shape {

    constructor(halfExtent3D) {
        super(SHAPE_KIND.CUBOID);

        this.halfExtent3D = HalfExtent3D.fromObject(halfExtent3D);

        Object.freeze(this);
    }

    /**
     * 获取查询XZ包围盒
     * @param {import("../geometry/position.js")} center 中心点
     * @returns {BoundsXZ} 查询XZ包围盒
     */
    getQueryBoundsXZ() {
        // 根据中心点和半径计算包围盒
        return new BoundsXZ(
            center.x - this.halfExtent3D.x,
            center.x + this.halfExtent3D.x,
            center.z - this.halfExtent3D.z,
            center.z + this.halfExtent3D.z
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
        const diffY = observer.y - target.y;
        const diffZ = observer.z - target.z;
        // |diffX| <= halfExtent3D.x && |diffY| <= halfExtent3D.y && |diffZ| <= halfExtent3D.z
        return (
            (Math.abs(diffX) <= this.halfExtent3D.x) &&
            (Math.abs(diffY) <= this.halfExtent3D.y) &&
            (Math.abs(diffZ) <= this.halfExtent3D.z)
        );
    }

    /**
     * 获取最大轴向范围
     * @returns {number} 最大轴向范围
     */
    getMaxAxisExtentXZ() {
        return Math.max(this.halfExtent3D.x, this.halfExtent3D.z);
    }

}

module.exports = Cuboid;
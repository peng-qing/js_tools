"use strict";

const Shape = require("./shape.js");
const { SHAPE_KIND } = require("../constants.js");
const validationUtils = require("../validation.js");
const { BoundsXZ } = require("../geometry/bounds.js");
const { HalfExtentXZ } = require("../geometry/half_extent.js");

/**
 * 矩形形状
 * 在XZ平面上，以中心点为矩形，长宽为w和h的矩形
 */
class RectangleXZ extends Shape {

    constructor(halfExtentXZ) {
        super(SHAPE_KIND.RECTANGLE_XZ);
        /**
         * @type {HalfExtentXZ}
         */
        this.halfExtentXZ = HalfExtentXZ.fromObject(halfExtentXZ);

        Object.freeze(this);
    }

    /**
     * 获取查询XZ包围盒
     * @param {import("../geometry/position.js")} center 中心点
     * @returns {BoundsXZ} 查询XZ包围盒
     */
    getQueryBoundsXZ(center) {
        // 根据中心点和半尺存计算包围盒
        return new BoundsXZ(
            center.x - this.halfExtentXZ.x,
            center.x + this.halfExtentXZ.x,
            center.z - this.halfExtentXZ.z,
            center.z + this.halfExtentXZ.z
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
        // |x| <= halfExtentXZ.x && |z| <= halfExtentXZ.z
        return Math.abs(diffX) <= this.halfExtentXZ.x && Math.abs(diffZ) <= this.halfExtentXZ.z;
    }

    /**
     * 获取最大轴向范围
     * @returns {number} 最大轴向范围
     */
    getMaxAxisExtentXZ() {
        return Math.max(this.halfExtentXZ.x, this.halfExtentXZ.z);
    }

}

module.exports = RectangleXZ;       
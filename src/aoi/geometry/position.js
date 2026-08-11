"use strict";

const validationUtils = require("../validation.js");

/**
 * 位置类 用于表示实体的位置
 */
class Position {
    /**
     * 构造函数
     * @param {number} x - x 坐标
     * @param {number} y - y 坐标
     * @param {number} z - z 坐标
     */
    constructor(x, y, z) {
        validationUtils.assertFiniteNumbers(x, "x");
        validationUtils.assertFiniteNumbers(y, "y");
        validationUtils.assertFiniteNumbers(z, "z");

        this.x = x;
        this.y = y;
        this.z = z;

        // 冻结对象 暂时这么处理以避免除了 AoiManager 之外的类修改位置
        Object.freeze(this);
    }

    /**
     * 从对象创建 Position 实例
     * @param {Object} obj - 对象
     * @returns {Position}
     */
    static fromObject(obj) {
        if (obj instanceof Position) {
            return obj;
        }
        return new Position(obj?.x, obj?.y, obj?.z);
    }
}

module.exports = Position;
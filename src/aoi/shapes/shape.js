"use strict";

/**
 * 相对形状形状抽象基类
 */
class Shape {

    constructor(kind) {
        if (new.target === Shape) {
            throw new Error("Shape is an abstract class and cannot be instantiated directly.");
        }
        /**
         * @type {string}
         */
        this.kind = kind;
    }

    /**
     * 获取图形类型
     * @returns {string} 图形类型
     */
    getKind() {
        return this.kind;
    }

    /**
     * 获取查询包围盒
     * @param {...any} args 参数
     * @returns {import("../geometry/bounds").BoundsXZ} 查询XZ包围盒
     */
    getQueryBoundsXZ(...args) {
        void args;
        throw new Error("getQueryBoundsXZ is not implemented.");
    }

    /**
     * 判断目标是否在形状内
     * @param {Position} observer 观察者位置
     * @param {Position} target 目标位置
     * @returns {boolean} 是否在形状内
     */
    contains(observer, target) {
        void observer;
        void target;
        throw new Error("contains is not implemented.");
    }

    /**
     * 获取水平范围
     * @returns {number} 水平范围
     */
    getMaxAxisExtentXZ() {
        throw new Error("getMaxAxisExtentXZ is not implemented.");
    }

}

module.exports = Shape;
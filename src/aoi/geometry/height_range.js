"use strict";

const validationUtils = require("../validation.js");

/**
 * 相对高度范围
 * 限制目标相对于观察者的高度差
 */
class HeightRange {
    constructor(min, max, enabled = true) {
        if (!enabled) {
            this.enabled = false;
            this.min = 0;
            this.max = 0;

            return Object.freeze(this);
        }

        validationUtils.assertFiniteNumbers(min, "min");
        validationUtils.assertFiniteNumbers(max, "max");

        this.enabled = true;
        this.min = Math.min(min, max);
        this.max = Math.max(min, max);

        Object.freeze(this);
    }

    /**
     * 禁用高度范围
     * @returns {HeightRange} 禁用的高度范围
     */
    static disabled() {
        return DISABLED_HEIGHT_RANGE;
    }

    /**
     * 判断目标是否在高度范围内
     * @param {Position} observer 观察者位置
     * @param {Position} target 目标位置
     * @returns {boolean} 是否在高度范围内
     */
    contains(observer, target) {
        if (!this.enabled) {
            return true;
        }
        const difference = target.y - observer.y;
        return difference >= this.min && difference <= this.max;
    }
}

/** 禁用的高度范围 */
const DISABLED_HEIGHT_RANGE = new HeightRange(0, 0, false);

module.exports = HeightRange;
"use strict";

const { AoiValidationError } = require("./errors.js");

/**
 * 验证工具类
 */
class ValidationUtils {

    /**
     * 断言值为有限数
     * @param {number} val - 值
     * @param {string} name - 名称
     * @throws {AoiValidationError} - 如果值不是有限数
     */
    static assertFiniteNumbers(val, name) {
        if (!Number.isFinite(val)) {
            throw new AoiValidationError(`${name} must be a finite number`);
        }
    }

    /**
     * 断言值为非负数
     * @param {number} val - 值
     * @param {string} name - 名称
     * @throws {AoiValidationError} - 如果值不是非负数
     */
    static assertNonNegativeNumbers(val, name) {
        ValidationUtils.assertFiniteNumbers(val, name);

        if (val < 0) {
            throw new AoiValidationError(`${name} must be a non-negative number`);
        }
    }

}

module.exports = ValidationUtils;
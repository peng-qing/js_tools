"use strict";

const crypto = require("crypto");

/**
 * 类型工具类
 */
class TypeUtils {

    /**
     * 判断是否是一个数字
     * @param {any} val 
     * @returns {boolean}
     */
    static isNumber(val) {
        return typeof val === "number" && Number.isFinite(val);
    }

    /**
     * 判断是否是一个整数
     * @param {any} val 
     * @returns {boolean}
     */
    static isInteger(val) {
        return Number.isInteger(val);
    }

    static isSafeInteger(val) {
        return Number.isSafeInteger(val);
    }

    /**
     * 判断是否是一个字符串
     * @param {any} val 
     * @returns {boolean}
     */
    static isString(val) {
        return typeof val === "string" || val instanceof String;
    }

    /**
     * 判断是否是一个布尔值
     * @param {any} val 
     * @returns {boolean}
     */
    static isBoolean(val) {
        return typeof val === "boolean";
    }

    /**
     * 判断是否是一个函数
     * @param {any} val 
     * @returns {boolean}
     */
    static isFunction(val) {
        return typeof val === "function";
    }

    /**
     * 判断是否是一个异步函数
     * @param {any} val 
     * @returns {boolean}
     */
    static isAsyncFunction(val) {
        return Object.prototype.toString.call(val) === "[object AsyncFunction]";
    }

    /**
     * 判断是否是一个对象
     * @param {any} val 
     * @returns {boolean}
     */
    static isObject(val) {
        return val && typeof val === "object";
    }

    /**
     * 判断是否是一个数组
     * @param {any} val 
     * @returns {boolean}
     */
    static isArray(val) {
        return Array.isArray(val);
    }

    /**
     * 判断是否是一个 null
     * @param {any} val 
     * @returns {boolean}
     */
    static isNull(val) {
        return val === null;
    }

    /**
     * 判断是否是一个 undefined
     * @param {any} val 
     * @returns {boolean}
     */
    static isUndefined(val) {
        return typeof val === "undefined";
    }

    /**
     * 判断是否是一个 BigInt
     * @param {any} val 
     * @returns {boolean}
     */
    static isBigInt(val) {
        return typeof val === "bigint";
    }

    /**
     * 判断是否是一个 Date
     * @param {any} val 
     * @returns {boolean}
     */
    static isDate(val) {
        return val instanceof Date;
    }

    /**
     * 判断是否是一个 RegExp
     * @param {any} val 
     * @returns {boolean}
     */
    static isRegExp(val) {
        return val instanceof RegExp;
    }

    /**
     * 判断是否是一个 Error
     * @param {any} val 
     * @returns {boolean}
     */
    static isError(val) {
        return val instanceof Error;
    }

    /**
     * 判断是否是一个 Map
     * @param {any} val 
     * @returns {boolean}
     */
    static isMap(val) {
        return val instanceof Map;
    }

    /**
     * 判断是否是一个 Set
     * @param {any} val 
     * @returns {boolean}
     */
    static isSet(val) {
        return val instanceof Set;
    }

    /**
     * 判断是否是一个 NaN
     * @param {any} val 
     * @returns {boolean}
     */
    static isNaN(val) {
        return typeof val === "number" && Number.isNaN(val);
    }

    /**
     * 判断是否是一个 Promise 对象
     * @param {any} val 
     * @returns {boolean}
     */
    static isPromiseLike(val) {
        return val && typeof val === "object" && typeof val.then === "function" && typeof val.catch === "function";
    }

    /**
     * 判断是否是一个 class
     * @param {any} val 
     * @returns {boolean}
     */
    static isClass(val) {
        return val && typeof val === "function" && /^class\s/.test(Function.prototype.toString.call(val));
    }

    /**
     * 判断是否是一个 class 实例
     * @param {any} val 
     * @returns {boolean}
     */
    static isClassInstance(val) {
        return val && typeof val === "object" && val.constructor && typeof val.constructor === "function" && /^class[\s{]/.test(Function.prototype.toString.call(val.constructor));
    }

    /**
     * 转换为数字 任意输入 使用hash方式 
     * @param {any} val 
     * @returns {Number}
     */
    static toNumber(val) {
        if (this.isNumber(val)) {
            return val;
        }
        if (!this.isString(val)) {
            val = JSON.stringify(val);
        }
        const hashStr = crypto.createHash("sha256").update(val).digest();
        // 取前4字节 为一个 uint32
        const num = hashStr.readUint32BE(0);
        return Math.floor(num);
    }

    /**
     * 判断是否是原型链的末端
     * @param {any} val 
     * @returns {boolean}
     */
    static isPrototypeChainEnd(val) {
        return val === null ||
            val === Function.prototype ||
            val === Object.prototype;
    }
}

module.exports = TypeUtils;

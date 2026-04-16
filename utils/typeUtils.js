"use strict";

const crypto = require("crypto");

const typeUtils = {};

typeUtils.isNumber = function (val_) {
    return typeof val_ === "number" && isFinite(val_);
}

typeUtils.isInteger = function (val_) {
    return Number.isInteger(val_);
}

typeUtils.isString = function (val_) {
    return typeof val_ === "string" || val_ instanceof String;
}

typeUtils.isBoolean = function (val_) {
    return typeof val_ === "boolean";
}

typeUtils.isFunction = function (val_) {
    return typeof val_ === "function";
}

typeUtils.isAsyncFunction = function (val_) {
    return Object.prototype.toString.call(val_) === "[object AsyncFunction]";
}

typeUtils.isObject = function (val_) {
    return val_ && typeof val_ === "object";
}

typeUtils.isArray = function (val_) {
    return Array.isArray(val_);
}

typeUtils.isNull = function (val_) {
    return val_ === null;
}

typeUtils.isUndefined = function (val_) {
    return typeof val_ === "undefined";
}

typeUtils.isBigInt = function (val_) {
    return typeof val_ === "bigint";
}

typeUtils.isDate = function (val_) {
    return val_ instanceof Date;
}

typeUtils.isRegExp = function (val_) {
    return val_ instanceof RegExp;
}

typeUtils.isError = function (val_) {
    return val_ instanceof Error;
}

typeUtils.isMap = function (val_) {
    return val_ instanceof Map;
}

typeUtils.isSet = function (val_) {
    return val_ instanceof Set;
}

typeUtils.isNaN = function (val_) {
    return typeof val_ === "number" && Number.isNaN(val_);
}

typeUtils.isPromiseLike = function (val_) {
    return val_ &&
        typeof val_ === "object" &&
        typeof val_.then === "function" &&
        typeof val_.catch === "function"
}

// 只适用自定义类型
typeUtils.isClass = function (val_) {
    return val_ &&
        typeof val_ === "function" &&
        /^class\s/.test(Function.prototype.toString.call(val_));
}

// 只适用自定义类型
typeUtils.isClassInstance = function (val_) {
    return val_ &&
        typeof val_ === "object" &&
        val_.constructor &&
        typeof val_.constructor === "function" &&
        /^class[\s{]/.test(Function.prototype.toString.call(val_.constructor));
}

// 判断原型链是否到顶端 非标准
typeUtils.isTopPrototype = function (val_) {
    return !val_ || (
        typeof val_ === "object" &&
        typeof val_.hasOwnProperty === "function" &&
        val_.hasOwnProperty("isPrototypeOf") &&
        val_.hasOwnProperty("propertyIsEnumerable") &&
        val_.hasOwnProperty("isPrototypeOf") &&
        val_.hasOwnProperty("toLocaleString") &&
        val_.hasOwnProperty("toString") &&
        val_.hasOwnProperty("valueOf")
    )
}

// 是否在严格模式
typeUtils.isStrictMode = function () {
    return (function () { return this === undefined })();
}

/**
 * 转换为数字 任意输入 使用hash方式 
 * @param {any} val_ 
 * @returns {Number}
 */
typeUtils.toNumber = function (val_) {
    if (typeUtils.isNumber(val_)) {
        return val_;
    }
    if (!typeUtils.isString(val_)) {
        val_ = JSON.stringify(val_);
    }
    const hashStr = crypto.createHash("sha256").update(val_).digest();
    // 取前4字节 为一个 uint32
    const num = hashStr.readUint32BE(0);
    return Math.floor(num);
}

module.exports = typeUtils;
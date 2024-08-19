"use strict";

import lodash from "lodash";

export const type_utils = {};

type_utils.isNumber = function (val) {
    return typeof val === "number" && isFinite(val);
}

type_utils.isString = function (val) {
    return typeof val === "string" || val instanceof String;
}

type_utils.isBoolean = function (val) {
    return typeof val === "boolean";
}

type_utils.isFunction = function (val) {
    return typeof val === "function";
}

// 判断是否为对象 (不为null 且 不是数组)
type_utils.isObject = function (val) {
    return val && typeof val === "object" && !Array.isArray(val);
}

type_utils.isArray = function (val) {
    return Array.isArray(val);
}

type_utils.isNull = function (val) {
    return !val &&
        typeof val !== "undefined" &&
        val !== 0;
}

type_utils.isUndefined = function (val) {
    return typeof val === "undefined";
}

type_utils.isSymbol = function (val) {
    return typeof val === "symbol";
}

type_utils.isBigInt = function (val) {
    return typeof val === "bigint";
}

type_utils.isDate = function (val) {
    return val instanceof Date;
}

type_utils.isRegExp = function (val) {
    return val instanceof RegExp;
}

type_utils.isError = function (val) {
    return val instanceof Error;
}

type_utils.isMap = function (val) {
    return val instanceof Map;
}

type_utils.isNaN = function (val) {
    return Number.isNaN(val);
}

type_utils.isSet = function (val) {
    return val instanceof Set;
}

type_utils.isPromise = function (val) {
    return val &&
        typeof val === "object" &&
        typeof val.then === "function" &&
        typeof val.catch === "function"
}

/**
 * 深度克隆对象
 * @param {Object} obj
 * @returns {Object} 
 */
type_utils.deepCloneObj = function (obj) {
    lodash.cloneDeep(obj);
}
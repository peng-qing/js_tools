"use strict";

const timeUtils = {};

/**
 * 获取时间戳 秒
 * @returns {Number}
 */
timeUtils.now = () => {
    return Math.floor(Date.now() / 1000);
}

/**
 * 获取时间戳 毫秒
 * @returns {Number}
 */
timeUtils.nowMs = () => {
    return Date.now();
}

/**
 * 判断两个时间是否同一天 00:00:00
 * @param {Number} time1 时间戳 秒
 * @param {Number} time2 时间戳 秒
 * @returns {Boolean}
 */
timeUtils.isSameDayByZero = (time1, time2) => {
    const date1 = new Date(time1 * 1000);
    const date2 = new Date(time2 * 1000);
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate();
}

/**
 * 判断两个时间是否同一天 05:00:00
 * @param {Number} time1 时间戳 秒
 * @param {Number} time2 时间戳 秒
 * @returns {Boolean}
 */
timeUtils.isSameDayByFive = (time1, time2) => {
    return timeUtils.isSameDayByZero(time1 - 60 * 60 * 5, time2 - 60 * 60 * 5);
}

module.exports = timeUtils;
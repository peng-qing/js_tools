"use strict";

export const timeUtils = {};

/**
 * 获取时间戳 秒
 * @returns {Number}
 */
timeUtils.Now = () => {
    return Math.floor(Date.now() / 1000);
}

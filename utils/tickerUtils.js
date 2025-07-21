"use strict";

const tickerUtils = {};

/**
 * setTimeout 封装 支持长延迟
 * @param {Function} callback_ 
 * @param {Number} delay_
 * @typedef {Object} timerId
 * @property {Object} _timerId
 * @returns {timerId}
 */
tickerUtils.setTimeoutEx = (callback_, delay_) => {
    const timerId = { _timerId: null };

    const maxLoopMs = (Math.pow(2, 31) - 1) >>> 0;
    const timerLoop = (waitMs_) => {
        if (waitMs_ > maxLoopMs) {
            timerId._timerId = setTimeout(() => {
                clearTimeout(timerId._timerId);
                timerLoop(waitMs_ - maxLoopMs);
                waitMs_ -= maxLoopMs;
            }, maxLoopMs);
        }
        else {
            timerId._timerId = setTimeout(() => {
                clearTimeout(timerId._timerId);
                timerId._timerId = null;
                callback_();
            }, waitMs_);
        }
    }

    timerLoop(delay_);

    return timerId;
}

/**
 * 取消定时器
 * @param {timerId} timerId_ 
 */
tickerUtils.clearTimeoutEx = (timerId_) => {
    if (timerId_ && timerId_._timerId) {
        clearTimeout(timerId_._timerId);
        timerId_._timerId = null;
    }
}

/**
 * 睡眠等待
 * @param {Number}
 */
tickerUtils.sleepEx = async (waitMs_) => {
    const maxSleepMs = (Math.pow(2, 31) - 1) >>> 0;
    while (waitMs_ > maxSleepMs) {
        await new Promise((resolve) => {
            let timerId = setTimeout(() => {
                clearTimeout(timerId);
                resolve();
            }, maxSleepMs);
            waitMs_ -= maxSleepMs;
        });
    }
    if (waitMs_ > 0) {
        await new Promise((resolve) => {
            let timerId = setTimeout(() => {
                clearTimeout(timerId);
                resolve();
            }, waitMs_);
        });
    }
}

module.exports = tickerUtils;
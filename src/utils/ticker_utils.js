"use strict";

class TickerUtils {

    /**
     * setTimeout 封装 支持长延迟
     * @param {Function} callback 
     * @param {Number} delay 
     * @typedef {Object} timerId
     * @property {Object} _timerId
     * @returns {timerId}
     */
    static setTimeoutEx(callback, delay) {
        const timerId = { _timerId: null };

        const maxLoopMs = (Math.pow(2, 31) - 1) >>> 0;
        const timerLoop = (waitMs) => {
            if (waitMs > maxLoopMs) {
                timerId._timerId = setTimeout(() => {
                    clearTimeout(timerId._timerId);
                    timerLoop(waitMs - maxLoopMs);
                    waitMs -= maxLoopMs;
                }, maxLoopMs);
            }
            else {
                timerId._timerId = setTimeout(() => {
                    clearTimeout(timerId._timerId);
                    timerId._timerId = null;
                    callback();
                }, waitMs);
            }
        }

        timerLoop(delay);

        return timerId;
    }

    /**
     * 取消定时器
     * @param {timerId} timerId 
     */
    static clearTimeoutEx(timerId) {
        if (timerId && timerId._timerId) {
            clearTimeout(timerId._timerId);
            timerId._timerId = null;
        }
    }

    /**
     * 睡眠等待 支持长睡眠
     * @param {Number} waitMs 
     */
    static async sleepEx(waitMs) {
        const maxSleepMs = (Math.pow(2, 31) - 1) >>> 0;
        while (waitMs > maxSleepMs) {
            await new Promise((resolve) => {
                let timerId = setTimeout(() => {
                    clearTimeout(timerId);
                    resolve();
                }, maxSleepMs);
                waitMs -= maxSleepMs;
            });
        }
        if (waitMs > 0) {
            await new Promise((resolve) => {
                let timerId = setTimeout(() => {
                    clearTimeout(timerId);
                    resolve();
                }, waitMs);
            });
        }
    }
}

module.exports = tickerUtils;
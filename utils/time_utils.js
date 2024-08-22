'use strict';

import dayjs from "dayjs";

export const time_utils = {};

// 获取当前时间戳 秒
time_utils.Now = function () {
    return dayjs().unix();
}

// 获取当前时间戳 ms
time_utils.NowMs = function () {
    return dayjs().millisecond();
}
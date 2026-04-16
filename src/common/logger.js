"use strict";

/**
 * 基础日志类 只定一了当前项目日志输出的基础接口 不提供相关实现
 */
class BaseLogger {

    constructor() {
    }

    trace(...msgs) {
        console.trace(msgs.join(" "));
    }

    debug(...msgs) {
        console.debug(msgs.join(" "));
    }

    info(...msgs) {
        console.info(msgs.join(" "));
    }

    warn(...msgs) {
        console.warn(msgs.join(" "));
    }

    error(...msgs) {
        console.error(msgs.join(" "));
    }

    critical(...msgs) {
        console.critical(msgs.join(" "));
    }
}

module.exports = {
    BaseLogger,
}
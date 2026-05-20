"use strict";

/**
 * 基础日志类 只定一了当前项目日志输出的基础接口 不提供相关实现
 */
class BaseLogger {

    constructor() {
        if (new.target === BaseLogger) {
            throw new Error("BaseLogger is a base class and cannot be instantiated directly");
        }
    }

    trace(...msgs) {
        void msgs;
    }

    debug(...msgs) {
        void msgs;
    }

    info(...msgs) {
        void msgs;
    }

    warn(...msgs) {
        void msgs;
    }

    error(...msgs) {
        void msgs;
    }

    critical(...msgs) {
        void msgs;
    }
}

/**
 * 控制台日志器
 */
class ConsoleLogger extends BaseLogger {
    constructor() {
        super();
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
    ConsoleLogger,
}
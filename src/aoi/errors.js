"use strict";

/**
 * Aoi 错误基类
 */
class AoiError extends Error {
    constructor(message, code = "AOI_ERROR") {
        super(message);
        this.name = new.target.name;
        this.code = code;
    }
}

/**
 * Aoi 验证错误
 */
class AoiValidationError extends AoiError {
    constructor(message, code = "AOI_VALIDATION_ERROR") {
        super(message, code);
    }
}

/**
 * Aoi 状态错误
 * 表示AOI管理器处于不合法的状态
 * 比如：上一次 update 未完成前 或者 通知快照未冻结前 禁止重入 update
 */
class AoiStateError extends AoiError {
    constructor(message, code = "AOI_STATE_ERROR") {
        super(message, code);
    }
}

/**
 * Aoi 容量错误
 * 表示AOI管理器容量超出限制
 * 比如：网格数量超出限制
 */
class AoiCapacityError extends AoiError {
    constructor(message, code = "AOI_CAPACITY_ERROR") {
        super(message, code);
    }
}

module.exports = {
    AoiError,
    AoiValidationError,
    AoiStateError
};
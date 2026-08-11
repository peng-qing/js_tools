"use strict";

/**
 * 形状类型
 */
const SHAPE_KIND = Object.freeze({
    /** 圆形形状 */
    CYCLE_XZ: "cycle_xz",
    /** 矩形形状 */
    RECTANGLE_XZ: "rectangle_xz",
    /** 圆柱形状 */
    CYLINDER: "cylinder",
    /** 长方体形状 */
    CUBOID: "cuboid",
    /** 扇形形状 */
    FAN_XZ: "fan_xz",
});

/**
 * 兴趣状态 按位
 */
const INTEREST_STATE = Object.freeze({
    /** 兴趣状态: 无, 不感兴趣 */
    NONE: 0,
    /** 兴趣状态: 距离 */
    DISTANCE: 1 << 0,
    /** 兴趣状态: 强制 */
    FORCE: 1 << 1,
});

/**
 * 事件类型
 */
const EVENT = Object.freeze({
    /** 事件类型: 无 */
    NONE: "none",
    /** 事件类型: 进入 */
    ENTER: "enter",
    /** 事件类型: 离开 */
    LEAVE: "leave",
});

module.exports = {
    SHAPE_KIND,
    INTEREST_STATE,
    EVENT,
};
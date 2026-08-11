"use strict";

const { INTEREST_STATE, EVENT } = require("../constants.js");

/**
 * Aoi管理的对象的兴趣实体
 */
class InterestEntity {
    /**
     * 构造函数
     * @param {number} interestId 兴趣实体ID
     * @param {number} ownerEntityId 所属实体ID
     * @param {import("../policy/interest_policy.js")} policy 策略
     */
    constructor(interestId, ownerEntityId, policy) {
        /**
         * 兴趣实体唯一Id 由AoiManager分配
         * @type {number}
         */
        this.interestId = interestId;
        /**
         * 所属实体Id
         * @type {number}
         */
        this.ownerEntityId = ownerEntityId;
        /**
         * 策略
         * @type {import("../policy/interest_policy.js")}
         */
        this.policy = policy;
        /**
         * 当前正在关注哪些目标
         * @type {Map<number, import("./position_entity.js")>}
         */
        this.interests = new Map();
        /**
         * 兴趣范围是否仍然有效
         * @type {boolean}
         */
        this.active = true;
    }

    /**
     * 获取目标实体的兴趣状态
     * @param {number} targetEntityId 目标实体Id
     * @returns {number} 是否感兴趣
     */
    getInterestState(targetEntityId) {
        return this.interests.get(targetEntityId) || INTEREST_STATE.NONE;
    }

    /**
     * 判断目标实体是否具有某种兴趣状态
     * @param {number} targetEntityId 目标实体Id
     * @param {number} targetState 目标状态
     * @returns {boolean} 是否具有某种兴趣状态
     */
    hasInterestState(targetEntityId, targetState) {
        const interestState = this.getInterestState(targetEntityId);
        return (interestState & targetState) !== 0;
    }

    /**
     * 判断目标实体是否感兴趣
     * @param {number} targetEntityId 目标实体Id
     * @returns {boolean} 是否感兴趣
     */
    isInterested(targetEntityId) {
        return this.getInterestState(targetEntityId) !== INTEREST_STATE.NONE;
    }

    /**
     * 设置目标实体的兴趣状态
     * @param {number} targetEntityId 目标实体Id
     * @param {number} targetState 目标状态
     * @param {boolean} enabled 表示添加还是删除兴趣来源
     * @returns {{prevState: number, nextState: number, event: string}} 兴趣事件
     */
    setInterestState(targetEntityId, targetState, enabled) {
        const prevState = this.getInterestState(targetEntityId);
        const nextState = enabled ? prevState | targetState : prevState & ~targetState;
        const event = this.resolveInterestEvent(prevState, nextState);

        return { prevState, nextState, event };
    }

    /**
     * 解析兴趣事件
     * @param {number} prevState 之前的兴趣状态
     * @param {number} nextState 之后的兴趣状态
     * @returns {string} 兴趣事件
     */
    resolveInterestEvent(prevState, nextState) {
        const prevInterested = (prevState !== INTEREST_STATE.NONE);
        const nextInterested = (nextState !== INTEREST_STATE.NONE);

        if (prevInterested && !nextInterested) {
            return EVENT.LEAVE;
        }
        if (!prevInterested && nextInterested) {
            return EVENT.ENTER;
        }
        return EVENT.NONE;
    }

    /**
     * 移除目标实体
     * @param {number} targetEntityId 目标实体Id
     * @returns {{prevState: number, nextState: number, event: string}} 兴趣事件
     */
    removeTarget(targetEntityId) {
        const prevState = this.getInterestState(targetEntityId);
        this.interests.delete(targetEntityId);

        return { prevState, nextState: INTEREST_STATE.NONE, event: this.resolveInterestEvent(prevState, INTEREST_STATE.NONE) };
    }

    /**
     * 设置策略
     * @param {import("../policy/interest_policy.js")} policy 策略
     */
    setPolicy(policy) {
        this.policy = policy;
    }

    /**
     * 停用兴趣实体
     */
    deactivate() {
        this.active = false;
    }
}

module.exports = InterestEntity;
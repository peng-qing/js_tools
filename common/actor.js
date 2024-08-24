"use strict";

import EventEmitter from "events";
import { isMessage } from "./message.js";
import { time_utils } from "../utils/time_utils.js";

/**
 * Actor 基类
 * @event Actor#[overstock] 消息积压告警
 * @extends EventEmitter
 * @class Actor
 * @property {Number} id Actor 唯一ID 默认生成，不可修改
 * @property {Number} kind 类别
 * @property {Array} msgQueue 消息队列
 * @property {Number} maxLen 消息队列最大长度
 * @property {Number} warnLen 队列消息告警线
 * @property {Number} warnInterval 告警时间间隔 默认3秒
 * @property {Number} lastWarnTime 最后一次告警时间
 * @property {Boolean} waitProcessing 消息处理锁
 * @property {Number} lastPopMsgTime 最后一次消息出栈时间
 * @property {Number} lastPushMsgTime 最后一次消息压栈时间
 */
export class Actor extends EventEmitter {

    /**
     * Actor 计数器
     * @access private
     */
    static _counter = 0;

    /**
     * 构建 actorId
     * @access private
     * @returns {Number} actorId
     */
    static _genID() {
        return ++Actor._counter;
    }

    constructor(kind, warnLen, maxLen, warnInterval = 3) {
        super();
        thid.id = Actor._genID();
        this.kind = kind;
        this.msgQueue = [];
        this.maxLen = maxLen;
        this.warnLen = warnLen;
        this.lastWarnTime = 0;
        this.warnInterval = warnInterval;
        this.waitProcessing = false;
        this.lastPushMsgTime = 0;
        this.lastPopMsgTime = 0;
    }

    getId() {
        return this.id;
    }

    getKind() {
        return this.kind;
    }

    getMaxLen() {
        return this.maxLen;
    }

    getWarnLen() {
        return this.warnLen;
    }

    isWaitProcessing() {
        return this.waitProcessing;
    }

    getLastPushMsgTime() {
        return this.lastPushMsgTime;
    }

    getLastPopMsgTime() {
        return this.lastPopMsgTime;
    }

    getMsgQueueSize() {
        return this.msgQueue.length;
    }

    getLastWarnTime() {
        return this.lastWarnTime;
    }

    getwarnInterval() {
        return this.warnInterval;
    }

    /**
     * 添加消息
     * @param {Message} msg 
     * @returns {Boolean}
     */
    addMessage(msg) {
        if (!isMessage(msg)) {
            throw new Error(`actor ${this.id} add invalid message`);
        }
        if (this.maxLen <= this.getMsgQueueSize()) {
            // 队列满了
            return false;
        }

        const nowTime = time_utils.Now();
        this.msgQueue.push(msg);
        this.lastPushMsgTime = nowTime;

        let queueSize = this.getMsgQueueSize();
        if (queueSize >= this.warnLen && nowTime > this.getLastWarnTime() + this.getwarnInterval()) {
            // 告警 
            this.emit("overstock", queueSize);
        }

        return true;
    }

    /**
     * 压出消息
     * @returns {Message}
     */
    popMessage() {
        if (this.getMsgQueueSize() <= 0) {
            return null;
        }
        const msg = this.msgQueue[0];
        this.lastPopMsgTime = time_utils.Now();
        this.msgQueue.splice(0, 1);

        return msg;
    }
}
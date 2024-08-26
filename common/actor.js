"use strict";

import EventEmitter from "events";
import { isMessage, Message } from "./message.js";
import { time_utils } from "../utils/time_utils.js";

export const ActorState = {
    New: 0,
    Running: 1,
    Close: 2
};

/**
 * Actor 基类
 * @event Actor#[overstock] 对外事件 消息积压告警
 * @event Actor#[process] 内部事件 处理消息
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
 * @property {Number} waitProcessingExpired 锁过期时间
 * @property {Number} lastPopMsgTime 最后一次消息出栈时间
 * @property {Number} lastPushMsgTime 最后一次消息压栈时间
 * @property {Boolean} closed 是否关闭
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
        this.id = Actor._genID();
        this.kind = kind;
        this.msgQueue = [];
        this.maxLen = maxLen;
        this.warnLen = warnLen;
        this.lastWarnTime = 0;
        this.warnInterval = warnInterval;
        this.waitProcessing = false;
        this.waitProcessingExpired = 0;
        this.lastPushMsgTime = 0;
        this.lastPopMsgTime = 0;
        this.state = ActorState.New;
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

    isClosed() {
        return this.state === ActorState.Close;
    }

    isRunning() {
        return this.state === ActorState.Running;
    }

    /**
     * 直接清空队列
     * @access private
     */
    __clearMsgQueue() {
        this.msgQueue.splice(0, this.msgQueue.length);
    }

    /**
     * 请求加锁 默认6秒
     * @access private
     */
    __acquireWaitProcessing() {
        const nowTime = time_utils.Now();
        this.waitProcessing = true;
        this.waitProcessingExpired = nowTime + 6;
    }

    /**
     * 检查锁是否过期 
     * @access private
     */
    __checkWaitProcessingExpired() {
        if (!this.isRunning()) {
            return false;
        }
        const nowTime = time_utils.Now();
        return this.waitProcessingExpired < nowTime;
    }

    /**
     * 释放锁
     * @access private
     */
    __releaseWaitProcessing() {
        this.waitProcessing = false;
        this.waitProcessingExpired = 0;
    }

    // 开始监听
    startListen() {
        if (this.isClosed()) {
            throw new Error(`Actor is closed, actorId:${this.getId()}, actorKind:${this.getKind()}`);
        }
        if (this.isRunning()) {
            return;
        }
        this.state = ActorState.Running;
        this.on("process", () => {
            setImmediate(() => {
                this.__executeMessage();
            })
        });
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
        // 
        this.__tryProcessMessage();
        return true;
    }

    /**
     * 内部接口 压出消息
     * @access private
     * @returns {Message}
     */
    __popMessage() {
        if (this.getMsgQueueSize() <= 0) {
            return null;
        }
        const msg = this.msgQueue[0];
        this.lastPopMsgTime = time_utils.Now();
        this.msgQueue.splice(0, 1);

        return msg;
    }

    /**
     * 内部接口 尝试执行消息
     * @access private
     */
    __tryProcessMessage() {
        const queueSize = this.getMsgQueueSize();
        if (queueSize === 0) {
            return;
        }
        this.emit("process");
    }

    /**
     * 内部接口 消息处理
     * @access private 
     */
    __executeMessage() {
        // 是否正在执行
        if (!this.isRunning()) {
            throw new Error(`Actor not running, actorId:${this.getId()}, actorKind:${this.getKind()}`);
        }
        const nowTime = time_utils.Now();
        // 有消息正在处理
        if (this.isWaitProcessing()) {
            // 检查锁过期
            if (this.__checkWaitProcessingExpired()) {
                // TODO 暂时先这么处理
                // 释放锁 清空队列
                this.__clearMsgQueue();
                this.__releaseWaitProcessing();
            }
            return false;
        }
        const message = this.__popMessage();
        if (!message) {
            return false;
        }
        this.__acquireWaitProcessing();

        (async () => {
            try {
                const ctx = message.context;
                await message.process(ctx);
            }
            catch (err) {
                //TODO 暂不处理
                void err;
            }
            // 释放锁
            this.__releaseWaitProcessing();
            // 执行后续的消息
            this.__tryProcessMessage();
        })();

        return true;
    }
}
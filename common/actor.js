"use strict";

import EventEmitter from "events";
import { isMessage } from "./message.js";
import { time_utils } from "../utils/time_utils.js";

export class Actor extends EventEmitter {

    static _counter = 0;

    static genID() {
        return ++Actor._counter;
    }

    constructor(kind, warnLen, maxLen) {
        super();
        thid.id = Actor.genID();
        this.kind = kind;
        this.msgQueue = [];
        this.maxLen = maxLen;
        this.warnLen = warnLen;
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

        this.msgQueue.push(msg);
        this.lastPushMsgTime = time_utils.Now();

        let queueSize = this.getMsgQueueSize();
        if (queueSize >= this.warnLen) {
            // 外抛事件
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
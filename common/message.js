"use strict";

import { time_utils } from "../utils/time_utils.js";

export class Message {
    constructor(kind, callback, context = {}) {
        this.kind = kind;
        this.callback = callback;
        this.context = context;
        this.beginTime = time_utils.Now();
    }
}

export const isMessage = function (msg) {
    return msg instanceof Message;
}
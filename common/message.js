"use strict";

export class Message {
    constructor(ctx = {}) {
        this.context = ctx;
    }

    process(ctx) {
        void ctx;
        throw new Error("not implemets process...");
    }
}

export const isMessage = function (msg) {
    return msg &&
        typeof msg === "object" &&
        typeof msg.process === "function";
}
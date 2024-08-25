"use strict";

export class Message {
    constructor() {
    }

    process() {
        throw new Error("not implemets process...");
    }
}

export const isMessage = function (msg) {
    return msg &&
        typeof msg === "object" &&
        typeof msg.process === "function"
}
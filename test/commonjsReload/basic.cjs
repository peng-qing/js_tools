"use strict";

const suffix = "v2";

class BasicService {
    constructor(name) {
        this.name = name;
    }

    hello() {
        return "basic hello " + suffix + " " + this.name;
    }

    static version() {
        return "basic static " + suffix;
    }
}

module.exports = BasicService;

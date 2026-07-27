"use strict";

const suffix = "v2";

class ParentService {
    parentHello() {
        return "parent hello " + suffix + " " + this.name;
    }
}

class ChildService extends ParentService {
    constructor(name) {
        super();
        this.name = name;
    }

    hello() {
        return "child hello " + suffix + " " + this.name;
    }
}

module.exports = ChildService;

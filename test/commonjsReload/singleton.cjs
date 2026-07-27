"use strict";

const { InjectSingleton } = require("../../src/common/singleton.js");

const suffix = "v2";

class SingletonService {
    show() {
        return "singleton show " + suffix;
    }
}

module.exports = InjectSingleton(SingletonService);

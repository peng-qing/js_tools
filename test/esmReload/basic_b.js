let suffix = "v1"; // 修改版本号用于测试热更

export class BasicService {
    constructor() {
        this._mode = "release";
    }

    hello() {
        console.log("[BasicService_b] hello " + suffix);
        return "hello_b " + suffix;
    }

    greet() {
        console.log("[BasicService_b] greet " + suffix);
        return "greet_b " + suffix;
    }

    get mode() {
        return this._mode + "_v1";
    }

    set mode(value) {
        this._mode = value + "_b";
    }
}
// 1. 基础原型方法热更

let suffix = "v2"; // 修改版本号用于测试热更

export class BasicService {
    constructor() {
        this._mode = "release";
    }

    hello() {
        console.log("[BasicService] hello parent " + suffix);
        return "hello parent " + suffix;
    }

    greet() {
        console.log("[BasicService] greet parent" + suffix);
        return "greet parent " + suffix;
    }

    get mode() {
        return this._mode + " v1";
    }

    set mode(value) {
        this._mode = value + "";
    }
}

// 修改版本号 热更前后两次请求结果中版本号应该不一致
// 修改 getter / setter 热更前后两次请求结果中 getter / setter 结果应该不一致
// 修改数据属性 热更前后两次请求结果中数据属性应该一致

//  curl "http://localhost:3000/reload?filePath=./basic.js"

//  curl "http://localhost:3000/process?handlerName=callBasicService"

//  curl "http://localhost:3000/process?handlerName=callGetterSetterService"

export class ChildService extends BasicService {
    #privateSuffix = "";
    constructor() {
        super();
        this.privateSuffix = "v5";
    }

    hello() {
        console.log("[ChildService] hello child " + suffix);
        return "hello child " + suffix;
    }

    // addFunc() {
    //     return "addFunc child result " + suffix;
    // }

    #privateMethod() {
        return "privateMethod child result after hot reload " + this.privateSuffix;
    }

    showPrivateMethod() {
        return this.#privateMethod();
    }
}
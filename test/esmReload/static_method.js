// 2. 静态方法/静态属性 热更

let multiplier = 10; // 修改乘数用于测试热更

export class StaticMethodService {

    static _multiplier = 100;
    static add(a, b) {
        console.log("[StaticMethodService] add " + a + " + " + b + " " + multiplier);
        return a + b + multiplier;
    }

    static multiply(a, b) {
        console.log("[StaticMethodService] multiply " + a + " * " + b + " " + multiplier);
        return a * b * multiplier;
    };

    static getMultiplier() {
        return StaticMethodService._multiplier;
    }
}

// 修改乘数 热更前后两次请求结果中乘数应该不一致
// 修改静态成员变量 热更前后两次请求结果中静态成员变量应该一致

//  curl "http://localhost:3000/reload?filePath=./static_method.js"

//  curl "http://localhost:3000/process?handlerName=callStaticMethodService"
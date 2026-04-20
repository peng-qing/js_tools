"use strict";

const ROW_PROXY_CLASS_KEY = Symbol.for("raw_class");

/**
 * 通过代理实现单例
 * @param {Object} targetClass 
 * @returns {Object}
 * @example
 *      export Test as InjectSingleton(TrueTest)
 * @description
 *      使用 proxy 包装的对象 js 没有api可以获取到被代理的原始类
 *      所以对于当前框架的 ESMModuleHotReloader 这种原型链替换的形式是无法实现热更的!!!!!
 * 
 *      如果一定要热更，也有一些方法可以实现：
 *          1. 直接导出原始类 (但是会破坏单例的特性)
 *          2. 在返回的 proxy 上加一个原始对象的引用 开后门处理 同时对 ESMModuleHotReloader 修改识别目标标记
 *          3. ESMModuleHotReloader 想办法特殊处理 proxy 对象 使其可以被识别
 */
function InjectSingleton(targetClass) {
    let instance = null;

    let proxy = new Proxy(targetClass, {
        construct(targetClass, args) {
            if (!instance) {
                instance = new targetClass(...args);
            }
            return instance;
        }
    });
    // 设置原始类引用 支持热更
    proxy[ROW_PROXY_CLASS_KEY] = targetClass;
    return proxy;
}

/**
 * 通过静态成员变量实现单例
 * 子类需要继承该类
 */
class Singleton {
    static _instance = null;

    /**
     * 获取单例对象
     * @returns {Object}
     * @description
     *  为什么需要判断 Object.hasOwn(this, "_instance")
     *  因为 _instance 只声明在父类上 子类没有自己的 _instance 
     *  所以获取的时候会通过原型链读取父类的值 
     *  导致如果父类或者其他子类先被调用 父类的 _instance 会被复制为最先调用的类对象
     *  所以需要判断 Object.hasOwn(this, "_instance") 来确保 _instance 是子类自己的
     */
    static getInstance() {
        if (!Object.hasOwn(this, "_instance") || !this._instance) {
            this._instance = new this();
        }
        return this._instance;
    }

}

module.exports = {
    InjectSingleton,
    Singleton,
}
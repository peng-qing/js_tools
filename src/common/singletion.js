"use strict";

/**
 * 通过代理实现单例
 * @param {Object} targetClass 
 * @returns {Object}
 * @example
 *      export Test as singleton(TrueTest)
 */
function InjectSingleton(targetClass) {
    let instance = null;

    return new Proxy(targetClass, {
        construct(targetClass, args) {
            if (!instance) {
                instance = new targetClass(...args);
            }
            return instance;
        }
    });
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
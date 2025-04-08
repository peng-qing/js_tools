"use strict";

/**
 * 通过代理实现单例
 * @example
 *      export Test as singleton(TrueTest)
 * @param {Object} targetClass_ 
 * @returns 
 */
export function singleton(targetClass_) {
    let instance = null;

    return new Proxy(targetClass_, {
        construct(targetClass_, args) {
            if (!instance) {
                instance = new targetClass_(...args);
            }
            return instance;
        }
    });
}

/**
 * 通过静态成员变量实现单例
 * 子类需要继承该类
 */
export class Singleton {
    static _instance = null;
    
    /**
     * 获取单例对象
     * @description
     *      这里最终需要传参通过子类构造函数实现单例
     *      为什么不用 new this();
     *      通过 new this() 产生的结果会依赖于其和父类的引入顺序
     *      如果父类先引入，那么子类的 this 指向父类
     *      如果子类先引入，那么子类的 this 指向子类
     * @param {Object} T
     * @returns {T}
     */
    static getInstance(T){
        if(!this._instance){
            this._instance = new T();
        }
        return this._instance;
    }
}
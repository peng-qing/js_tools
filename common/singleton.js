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
     * @returns
     */
    static getInstance(){
        if(!this._instance){
            this._instance = new this();
        }
        return this._instance;
    }
}
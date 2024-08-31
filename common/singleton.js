"use strict";

/**
 * 通过代理实现单例
 * @example
 *      export Test as singleton(TrueTest)
 * @param {Object} targetClass 
 * @returns 
 */
export function singleton(targetClass) {
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
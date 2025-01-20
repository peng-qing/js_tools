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
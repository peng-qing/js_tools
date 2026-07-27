"use strict";

const stdFile = require('fs');
const stdPath = require('path');
const Module = require('module');

const typeUtils = require("../utils/type_utils.js");

/**
 * Common js 模块 热加载器
 * 使用 delete require.cache 模式进行热加载
 * 兼容老版本 node, 但是由于需要反复 require 新模块 会导致 require.cache 不够干净
 * 所以需要额外缓存所有模块的引用 并在每次热更时进行替换
 */
class CommonJSModuleHotReloader {

    /**
     * 代理对象原始类对象引用
     * 为了让通过代理的对象支持热更的特殊 symbol key 识别
     */
    static ROW_PROXY_CLASS_KEY = Symbol.for("raw_class");

    /** 跳过一些内置属性 */
    static _builtInProperties = [
        'constructor',
        'length',
        'name',
        'prototype'
    ];

    /** 
     * 模块缓存
     * @type {Map<String, Array<module>>}
     * @description 
     *  为什么要缓存所有的模块缓存?
     *  因为可能虽然 require.cache 被删除，但是该模块仍然被其他模块所引用
     *  所以缓存所有新的模块缓存，并在每次热更将所有缓存都进行热更替换 保证一致性
     */
    static _requiredCaches = new Map();
    /**
     * 无装饰导出函数缓存
     * @type {Map<String, Function>}
     * @description 
     *  为什么要缓存无装饰导出函数?
     *  因为无装饰导出函数在热更时需要被替换
     *  所以缓存所有无装饰导出函数，并在每次热更将所有无装饰导出函数都进行热更替换 保证一致性
     */
    static _plainFuncCaches = new Map();

    /**
     * 重加载目标文件
     * @param {string} fileUrl 
     * @description
     *  CommonJs需要通过加载文件名加载 统一转为绝对路径
     */
    static reloadURL(fileUrl) {
        const absPath = stdPath.resolve(fileUrl);
        if (!stdFile.existsSync(absPath)) {
            throw new Error(`reload file ${absPath} not exists`);
        }
        // 将老的模块添加到缓存记录
        CommonJSModuleHotReloader._addOldModuleToCacahes(absPath);
        // 删除旧的模块缓存
        const oldExports = CommonJSModuleHotReloader._clearRequiredCaches(absPath);
        // 重新加载新的模块
        const { success, newModule, isPlainFunction } = CommonJSModuleHotReloader._reloadModule(absPath);
        // 如果是直接导出类 需要会写到 module.exports 上，否则热更前后的新旧 require 引用会分裂导致状态不一致
        // oldClassObj instanceof newClass 为 false
        if (success && !isPlainFunction && oldExports) {
            const requirePath = require.resolve(absPath);
            if (require.cache[requirePath]) {
                require.cache[requirePath].exports = oldExports;
            }
        }
    }

    /**
     * 创建热更函数包装器
     * @param {string} absPath 绝对路径
     * @returns {Function}
     */
    static createHotReloadFunction(fileUrl) {
        const absPath = stdPath.resolve(fileUrl);
        if (!stdFile.existsSync(absPath)) {
            throw new Error(`create hot reload function but file ${absPath} not exists`);
        }

        // 缓存不存在
        if (!CommonJSModuleHotReloader._plainFuncCaches.has(absPath)) {
            const exported = require(absPath);
            if (!CommonJSModuleHotReloader._isPlainFunction(exported)) {
                throw new Error(`create hot reload function but file ${absPath} not export a plain function`);
            }
            // 缓存导出的普通函数
            CommonJSModuleHotReloader._plainFuncCaches.set(absPath, exported);
        }

        // 返回函数包装器
        return function (...args) {
            const latestFunc = CommonJSModuleHotReloader._plainFuncCaches.get(absPath);
            if (!latestFunc || !typeUtils.isFunction(latestFunc)) {
                throw new Error(`create hot reload function but file ${absPath} not export a plain function`);
            }
            return latestFunc.apply(this, args);
        }
    }

    /**
     * 重新加载模块
     * @param {string} absPath 绝对路径
     */
    static _reloadModule(absPath) {
        // 1. 加载新模块
        const newModule = require(absPath);

        // 如果是直接导出普通函数
        if (CommonJSModuleHotReloader._isPlainFunction(newModule)) {
            CommonJSModuleHotReloader._plainFuncCaches.set(absPath, newModule);
            return { success: true, newModule: newModule, isPlainFunction: true };
        }

        // 2. 获取所有模块引用
        const allRequiredCaches = CommonJSModuleHotReloader._requiredCaches.get(absPath);
        if (!allRequiredCaches || allRequiredCaches.length <= 0) {
            return { success: false, newModule: newModule, isPlainFunction: false };
        }

        // 3. 遍历所有模块引用 进行热更
        for (const requireCache of allRequiredCaches) {
            // module.export is plain function
            if (CommonJSModuleHotReloader._isPlainFunction(requireCache)) {
                // 直接导出的普通函数无法通过引用原地替换
                // 通过 createHotReloadFunction 创建的包装器会读取 _plainFuncCaches 缓存
                continue;
            }
            // module.export is a Proxy
            if (CommonJSModuleHotReloader._isProxyClass(requireCache) &&
                CommonJSModuleHotReloader._isProxyClass(newModule)) {
                // 代理对象热更
                let oldClassCtor = requireCache[CommonJSModuleHotReloader.ROW_PROXY_CLASS_KEY];
                let newClassCtor = newModule[CommonJSModuleHotReloader.ROW_PROXY_CLASS_KEY];
                CommonJSModuleHotReloader._reloadClass(oldClassCtor, newClassCtor);
                continue;
            }
            // module.export is Class
            if (typeUtils.isClass(requireCache) && typeUtils.isClass(newModule)) {
                // 类对象热更
                let oldClassCtor = requireCache;
                let newClassCtor = newModule;
                CommonJSModuleHotReloader._reloadClass(oldClassCtor, newClassCtor);
                continue;
            }
            // module.export is Class instance pre reload Class
            if (typeUtils.isClassInstance(requireCache) && typeUtils.isClassInstance(newModule)) {
                // 类实例对象热更
                let oldClassCtor = requireCache.constructor;
                let newClassCtor = newModule.constructor;
                CommonJSModuleHotReloader._reloadClass(oldClassCtor, newClassCtor);
                continue;
            }
            // module.export is others 正常替换属性
            CommonJSModuleHotReloader._reloadProperties(requireCache, newModule);
        }

        // 4. 返回是否热更成功
        return { success: true, newModule: newModule, isPlainFunction: false };
    }

    /**
     * 热更类对象
     * @param {Object} oldClassCtor 旧的类构造函数
     * @param {Object} newClassCtor 新的类构造函数
     */
    static _reloadClass(oldClassCtor, newClassCtor) {
        if (!oldClassCtor || !newClassCtor) {
            throw new Error(`reload class but oldClassCtor or newClassCtor invalid`);
        }
        // reload class properties
        CommonJSModuleHotReloader._reloadProperties(oldClassCtor, newClassCtor);
        // reload class prototype properties
        CommonJSModuleHotReloader._reloadProperties(oldClassCtor.prototype, newClassCtor.prototype);
    }

    /**
     * 热更对象属性
     * @param {Object} oldClassCtor 旧的对象
     * @param {Object} newClassCtor 新的对象
     */
    static _reloadProperties(oldClassCtor, newClassCtor) {
        // 1. 判断是否触顶
        const oldAtTop = typeUtils.isPrototypeChainEnd(oldClassCtor);
        const newAtTop = typeUtils.isPrototypeChainEnd(newClassCtor);
        if (oldAtTop && newAtTop) {
            // 同时触达原型链顶端 直接返回成功
            return true;
        }
        if (oldAtTop || newAtTop) {
            // 只有一个触达原型链顶端 继承关系被破坏了
            throw new Error(`can't reload difference class`);
        }

        // 2. 遍历所有属性 进行热更
        // 暂时不采用 Reflect.ownKeys 因为 Symbol 属性的热更需要更谨慎
        // 容易导致新的 Symbol 和 老的 Symbol 不是同一个，旧的还没删除新的又被添加到对象上造成状态分裂
        let allProperties = Object.getOwnPropertyNames(newClassCtor);
        for (const propertyName of allProperties) {
            // skip built-in properties
            if (CommonJSModuleHotReloader._builtInProperties.includes(propertyName)) {
                continue;
            }
            const descriptor = Object.getOwnPropertyDescriptor(newClassCtor, propertyName);
            // 对于 getter / setter 以及 方法
            if (typeUtils.isFunction(descriptor.value) || descriptor.get || descriptor.set) {
                try {
                    // 对于setter/getter 只能使用这种方式替换 否则会直接触发 getter/setter 调用
                    // 对于普通静态方法 如果使用 oldObj[propName] = newObj[propName] 方式
                    // 其属性描述符始终是 enumerable: true, configurable: true, writable: true 
                    // 所以使用 Object.defineProperty 方式替换 保证属性描述符不变
                    Object.defineProperty(oldClassCtor, propertyName, descriptor);
                }
                catch (err) {
                    void err;
                }
                continue;
            }
            // 对于数据项 需要使用老的替换新的 避免丢失运行时状态
            try {
                if (Object.hasOwn(oldClassCtor, propertyName)) {
                    // 默认使用老的替代新的
                    newClassCtor[propertyName] = oldClassCtor[propertyName];
                }
                else {
                    // 如果老的没有该属性 使用新的替代老的
                    oldClassCtor[propertyName] = newClassCtor[propertyName];
                }
            }
            catch (err) {
                void err;
            }
        }

        // 同步进行原型链的替换
        return CommonJSModuleHotReloader._reloadProperties(Object.getPrototypeOf(oldClassCtor), Object.getPrototypeOf(newClassCtor));
    }

    /**
     * 清除模块引用的缓存
     * @param {string} absPath 绝对路径
     * @returns {any | null} 返回被清除的模块的 exports
     */
    static _clearRequiredCaches(absPath) {
        // require.resolve 拿到真实 key 用于删除 require cache
        // 避免 absPath 遇到省略扩展名、目录入口、软链接等 导致删除失败
        const requirePath = require.resolve(absPath);
        const oldModule = require.cache[requirePath];
        if (!oldModule) {
            return null;
        }

        // 删除全局模块缓存
        CommonJSModuleHotReloader._delGlobalModuleCaches(requirePath);
        // 删除 require cache
        delete require.cache[requirePath];

        return oldModule.exports;
    }

    /**
     * 判断是否是普通函数
     * @param {any} val 
     * @description
     *  普通函数是指直接导出的函数 不是通过类构造函数创建的函数
     * @returns {boolean}
     */
    static _isPlainFunction(val) {
        return typeUtils.isFunction(val) &&
            !typeUtils.isClass(val) &&
            !CommonJSModuleHotReloader._isProxyClass(val);
    }

    /**
     * 判断是否是代理类 - 只识别热更相关的模块代理
     * @param {any} val 
     * @returns {boolean}
     */
    static _isProxyClass(val) {
        return val && val[CommonJSModuleHotReloader.ROW_PROXY_CLASS_KEY];
    }

    /**
     * 添加老的模块到缓存记录
     * @param {string} absPath 绝对路径
     */
    static _addOldModuleToCacahes(absPath) {
        const requireModule = require(absPath);
        if (CommonJSModuleHotReloader._isPlainFunction(requireModule)) {
            return;
        }
        let oldCaches = CommonJSModuleHotReloader._requiredCaches.get(absPath);
        if (!oldCaches) {
            oldCaches = [];
            CommonJSModuleHotReloader._requiredCaches.set(absPath, oldCaches);
        }

        if (!oldCaches.includes(requireModule)) {
            oldCaches.push(requireModule);
        }
    }

    /**
     * 删除全局模块缓存
     * @param {string} absPath 绝对路径
     */
    static _delGlobalModuleCaches(absPath) {
        // 这里不能使用 module.exports 因为会覆盖全局模块
        const nodeVersion = process.versions.node.split(".");
        const majorVersion = Number(nodeVersion[0]);
        const minorVersion = Number(nodeVersion[1]);

        const cacheModule = require.cache[absPath];
        if (majorVersion < 14 || (majorVersion === 14 && minorVersion < 6)) {
            // module.parent is deprecated since node v14.6.0
            if (cacheModule && cacheModule.parent && cacheModule.parent.children && Array.isArray(cacheModule.parent.children)) {
                let index = cacheModule.parent.children.indexOf(cacheModule);
                if (index !== -1) {
                    cacheModule.parent.children.splice(index, 1);
                }

            }
            return;
        }

        let gModule = module;
        if (gModule && gModule.children && Array.isArray(gModule.children)) {
            let index = gModule.children.indexOf(cacheModule);
            if (index !== -1) {
                gModule.children.splice(index, 1);
            }
        }
    }
}

/**
 * Common js 模块 热补丁加载器
 * 使用 module 进行新模块的重载，对老模块进行替换
 * 优点是加载新模块时不污染 require.cache
 */
class CommonJSModulePatchReloader {

}

exports.CommonJSModuleHotReloader = CommonJSModuleHotReloader;
exports.CommonJSModulePatchReloader = CommonJSModulePatchReloader;

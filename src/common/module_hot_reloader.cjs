"use strict";

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
     * 模块导出引用缓存
     * @type {Map<String, Array<any>>}
     * @description 
     *  为什么要缓存模块导出引用?
     *  因为可能虽然 require.cache 被删除，但是该模块仍然被其他模块所引用
     *  所以需要保存旧 module.exports 引用，并在每次热更时对这些旧引用进行 patch
     */
    static _requiredCaches = new Map();
    /**
     * 无装饰导出函数缓存
     * @type {Map<String, Function>}
     * @description 
     *  为什么要缓存无装饰导出函数?
     *  因为无装饰导出函数在热更时需要被替换
     *  所以这里只缓存每个模块当前最新函数，包装器每次调用时读取它
     */
    static _plainFuncCaches = new Map();

    /**
     * 重加载目标文件
     * @param {string} fileUrl 
     * @description
     *  CommonJS 使用 require.resolve 解析出 Node 实际加载的模块路径
     */
    static reloadURL(fileUrl) {
        const modulePath = CommonJSModuleHotReloader._resolveModulePath(fileUrl);
        // 将老的模块添加到缓存记录
        CommonJSModuleHotReloader._addOldModuleToCacahes(modulePath);
        // 删除旧的模块缓存
        const oldExports = CommonJSModuleHotReloader._clearRequiredCaches(modulePath);
        // 重新加载新的模块
        const { success, newModule, isPlainFunction } = CommonJSModuleHotReloader._reloadModule(modulePath);
        void newModule;
        // 非普通函数导出需要回写旧 exports，否则后续 require 会拿到新导出，导致新旧引用分裂。
        if (success && !isPlainFunction && oldExports) {
            if (require.cache[modulePath]) {
                require.cache[modulePath].exports = oldExports;
            }
        }
    }

    /**
     * 创建热更函数包装器
     * @param {string} fileUrl 文件路径
     * @returns {Function}
     */
    static createHotReloadFunction(fileUrl) {
        const modulePath = CommonJSModuleHotReloader._resolveModulePath(fileUrl);

        // 缓存不存在
        if (!CommonJSModuleHotReloader._plainFuncCaches.has(modulePath)) {
            const exported = require(modulePath);
            if (!CommonJSModuleHotReloader._isPlainFunction(exported)) {
                throw new Error(`create hot reload function but file ${modulePath} not export a plain function`);
            }
            // 缓存导出的普通函数
            CommonJSModuleHotReloader._plainFuncCaches.set(modulePath, exported);
        }

        // 返回函数包装器
        return function (...args) {
            const latestFunc = CommonJSModuleHotReloader._plainFuncCaches.get(modulePath);
            if (!latestFunc || !typeUtils.isFunction(latestFunc)) {
                throw new Error(`create hot reload function but file ${modulePath} not export a plain function`);
            }
            return latestFunc.apply(this, args);
        }
    }

    /**
     * 重新加载模块
     * @param {string} modulePath require.resolve 后的模块路径
     * @returns {{ success: boolean, newModule: any, isPlainFunction: boolean }} 返回是否热更成功，新模块，是否是普通函数
     */
    static _reloadModule(modulePath) {
        // 1. 加载新模块
        const newModule = require(modulePath);

        // 如果是直接导出普通函数
        if (CommonJSModuleHotReloader._isPlainFunction(newModule)) {
            CommonJSModuleHotReloader._plainFuncCaches.set(modulePath, newModule);
            return { success: true, newModule: newModule, isPlainFunction: true };
        }

        // 2. 获取所有模块引用
        const allRequiredCaches = CommonJSModuleHotReloader._requiredCaches.get(modulePath);
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
     * @param {string} modulePath require.resolve 后的模块路径
     * @returns {any | null} 返回被清除的模块的 exports
     */
    static _clearRequiredCaches(modulePath) {
        const oldModule = require.cache[modulePath];
        if (!oldModule) {
            return null;
        }

        // 删除全局模块缓存
        CommonJSModuleHotReloader._delGlobalModuleCaches(modulePath);
        // 删除 require cache
        delete require.cache[modulePath];

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
     * 解析 CommonJS 模块真实路径，同时作为内部缓存和 require.cache 的统一 key
     * @param {string} fileUrl 文件路径
     * @returns {string}
     */
    static _resolveModulePath(fileUrl) {
        return require.resolve(stdPath.resolve(fileUrl));
    }

    /**
     * 添加老的模块到缓存记录
     * @param {string} modulePath require.resolve 后的模块路径
     */
    static _addOldModuleToCacahes(modulePath) {
        const requireModule = require(modulePath);
        if (CommonJSModuleHotReloader._isPlainFunction(requireModule)) {
            return;
        }
        let oldCaches = CommonJSModuleHotReloader._requiredCaches.get(modulePath);
        if (!oldCaches) {
            oldCaches = [];
            CommonJSModuleHotReloader._requiredCaches.set(modulePath, oldCaches);
        }

        if (!oldCaches.includes(requireModule)) {
            oldCaches.push(requireModule);
        }
    }

    /**
     * 删除全局模块缓存
     * @param {string} modulePath require.resolve 后的模块路径
     */
    static _delGlobalModuleCaches(modulePath) {
        // 这里不能使用 module.exports 因为会覆盖全局模块
        const nodeVersion = process.versions.node.split(".");
        const majorVersion = Number(nodeVersion[0]);
        const minorVersion = Number(nodeVersion[1]);

        const cacheModule = require.cache[modulePath];
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
     * 直接导出的普通函数缓存
     * @type {Map<string, Function>}
     */
    static _plainFuncCaches = new Map();

    /**
     * 重加载目标文件
     * @param {string} fileUrl 文件路径
     */
    static reloadURL(fileUrl) {
        // 解析模块路径
        const modulePath = CommonJSModulePatchReloader._resolveModulePath(fileUrl);
        // 老的模块
        const oldModule = require(modulePath);
        // 加载新模块
        const newModule = CommonJSModulePatchReloader._loadFreshModule(modulePath);
        // patch 旧引用
        CommonJSModulePatchReloader._patchModule(modulePath, oldModule, newModule);
    }

    static createHotReloadFunction(fileUrl) {
    }

    /**
     * 解析 CommonJS 模块真实路径，同时作为内部缓存和 require.cache 的统一 key
     * @param {string} fileUrl 文件路径
     * @returns {string}
     */
    static _resolveModulePath(fileUrl) {
        return require.resolve(stdPath.resolve(fileUrl));
    }

    /**
     * 加载新模块
     * @param {string} modulePath 模块路径
     * @returns {any | null} 返回新模块的 exports
     */
    static _loadFreshModule(modulePath) {
        // 创建新的 Module, 通过创建新的临时 Module 的方式加载新文件
        // 拿到新 exports 后 patch 旧引用, 可以避免污染 require.cache
        const newModule = new Module(modulePath);
        newModule.filename = modulePath;
        // 私有api 不稳定
        newModule.paths = Module._nodeModulePaths(stdPath.dirname(modulePath));
        // 编译执行 不会进入 require.cache 所以不会污染全局
        newModule.load(modulePath);
        return newModule.exports;
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
            !CommonJSModulePatchReloader._isProxyClass(val);
    }

    /**
     * 判断是否是代理类 - 只识别热更相关的模块代理
     * @param {any} val 
     * @returns {boolean}
     */
    static _isProxyClass(val) {
        return val && val[CommonJSModulePatchReloader.ROW_PROXY_CLASS_KEY];
    }

    /**
     * patch 模块
     * @param {string} modulePath require.resolve 后的模块路径
     * @param {any} oldModule 旧模块
     * @param {any} newModule 新模块
     * @returns {boolean} 是否热补丁成功
     */
    static _patchModule(modulePath, oldModule, newModule) {
        // module.export is plain function
        if (CommonJSModulePatchReloader._isPlainFunction(newModule) &&
            CommonJSModulePatchReloader._isPlainFunction(oldModule)) {
            // 直接导出的普通函数无法通过引用原地替换
            // 通过 createHotReloadFunction 创建的包装器会读取 _plainFuncCaches 缓存
            CommonJSModulePatchReloader._plainFuncCaches.set(modulePath, newModule);
            return true;
        }

        // module.export is a Proxy
        if (CommonJSModulePatchReloader._isProxyClass(oldModule) &&
            CommonJSModulePatchReloader._isProxyClass(newModule)) {
            // 代理对象热更
            let oldClassCtor = oldModule[CommonJSModulePatchReloader.ROW_PROXY_CLASS_KEY];
            let newClassCtor = newModule[CommonJSModulePatchReloader.ROW_PROXY_CLASS_KEY];
            CommonJSModulePatchReloader._reloadClass(oldClassCtor, newClassCtor);
            return true;
        }

        // module.export is Class
        if (typeUtils.isClass(oldModule) && typeUtils.isClass(newModule)) {
            // 类对象热更
            let oldClassCtor = oldModule;
            let newClassCtor = newModule;
            CommonJSModulePatchReloader._reloadClass(oldClassCtor, newClassCtor);
            return true;
        }

        // module.export is Class instance pre reload Class
        if (typeUtils.isClassInstance(oldModule) && typeUtils.isClassInstance(newModule)) {
            // 类实例对象热更
            let oldClassCtor = oldModule.constructor;
            let newClassCtor = newModule.constructor;
            return CommonJSModulePatchReloader._reloadClass(oldClassCtor, newClassCtor);
        }

        // module.export is others 正常替换属性
        return CommonJSModulePatchReloader._reloadProperties(oldModule, newModule);
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
        CommonJSModulePatchReloader._reloadProperties(oldClassCtor, newClassCtor);
        // reload class prototype properties
        CommonJSModulePatchReloader._reloadProperties(oldClassCtor.prototype, newClassCtor.prototype);

        return true;
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
            if (CommonJSModulePatchReloader._builtInProperties.includes(propertyName)) {
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
        return CommonJSModulePatchReloader._reloadProperties(Object.getPrototypeOf(oldClassCtor), Object.getPrototypeOf(newClassCtor));
    }

}

exports.CommonJSModuleHotReloader = CommonJSModuleHotReloader;
exports.CommonJSModulePatchReloader = CommonJSModulePatchReloader;

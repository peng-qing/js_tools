"use strict";

const fs = require("fs");
const path = require("path");
const { typeUtils } = require("../utils/typeUtils.js");

class HotReloaderCommonJS {
    // 跳过一些内置属性
    static builtInProperties = [
        'constructor',
        'length',
        'name',
        'prototype'
    ];

    /**
     * 模块缓存
     * @type {Map<String, Array<any>>}
     */
    static _requiredCaches = new Map();

    /**
     * 重新加载模块
     * @param {String} fileUrl
     * @returns {Boolean} 是否重新加载成功
     */
    static reloadURL(fileUrl) {
        const absPath = path.resolve(fileUrl);
        if (!fs.existsSync(absPath)) {
            throw new Error(`reload file not exists`);
        }
        // 删除旧的模块缓存
        HotReloaderCommonJS._clearRequireCache(absPath);
        // 新的模块
        return HotReloaderCommonJS._reloadModule(absPath);
    }

    /**
     * 重新加载模块
     * @param {String} absPath
     * @param {Module} oldModule 
     * @returns {Boolean} 是否重新加载成功
     */
    static async _reloadModule(absPath) {
        const newRquire = require(absPath);

        const allRequiredCaches = HotReloaderCommonJS._requiredCaches.get(absPath);
        if (!allRequiredCaches || allRequiredCaches.length <= 0) {
            return false;
        }

        // replace all cache module
        for (const requireCache of allRequiredCaches) {
            // module.export = function
            if (typeUtils.isFunction(requireCache) && !typeUtils.isClass(requireCache)) {
                throw new Error(`function unable direct reload`);
            }
            // module.export is Class
            if (typeUtils.isClass(requireCache) && typeUtils.isClass(newRquire)) {
                HotReloaderCommonJS._reloadClass(requireCache, newRquire);
            }
            // module.export is Class instance pre reload Class
            if (typeUtils.isClassInstance(requireCache) && typeUtils.isClassInstance(newRquire)) {
                let cacheClass = requireCache.constructor;
                let newClass = newRquire.constructor;
                if (typeUtils.isClass(cacheClass) && typeUtils.isClass(newClass)) {
                    HotReloaderCommonJS._reloadClass(cacheClass, newClass);
                }
            }
            // object or others
            for (const propertyName in newRquire) {
                if (!typeUtils.isFunction(newRquire[propertyName])) {
                    // copy data from old if exists
                    if (requireCache[propertyName]) {
                        newRquire[propertyName] = requireCache[propertyName];
                    }
                    else {
                        // copy data from new
                        requireCache[propertyName] = newRquire[propertyName];
                    }
                }
                else if (typeUtils.isClass(newRquire[propertyName]) &&
                    typeUtils.isClass(requireCache[propertyName])) {
                    // if property is class in new module and cache module
                    HotReloaderCommonJS._reloadClass(requireCache[propertyName], newRquire[propertyName]);
                }
                else {
                    // others are copy from new to cache
                    requireCache[propertyName] = newRquire[propertyName];
                }
            }
        }

        return true;
    }

    /**
     * 重新加载类
     * @param {any} oldClass 
     * @param {any} newClass 
     */
    static _reloadClass(oldClass, newClass) {
        // reload class properties
        return HotReloaderCommonJS._reloadClassProperties(oldClass, newClass) &&
            HotReloaderCommonJS._reloadClassProperties(oldClass.prototype, newClass.prototype);
    }

    /**
     * 重新加载类成员属性
     * @param {any} oldClass
     * @param {any} newClass
     * @returns {Boolean} 是否重新加载成功
     */
    static _reloadClassProperties(oldClass, newClass) {
        if (!oldClass || !newClass) {
            throw new Error(`reload properties but oldClass or newClass invalid`);
        }
        // function or object
        if (typeUtils.isFunction(oldClass) || typeUtils.isObject(newClass)) {
            // reload static properties
            const allStaticProperties = Object.getOwnPropertyNames(newClass);
            for (const propertyName of allStaticProperties) {
                if (HotReloaderCommonJS.builtInProperties.indexOf(propertyName) !== -1) {
                    // skip some built-in properties
                    continue;
                }
                const descriptor = Object.getOwnPropertyDescriptor(newClass, propertyName);
                if (descriptor.get || descriptor.set) {
                    // if in strict mode has stricter restrictions for getter and setter
                    // skip getter or setter
                    continue;
                }
                // if property is function or not exist in old class then replace it
                if (typeUtils.isFunction(newClass[propertyName]) || !oldClass[propertyName]) {
                    oldClass[propertyName] = newClass[propertyName];
                    continue;
                }
                // data in the service should be retained
                newClass[propertyName] = oldClass[propertyName];
            }
        }

        // if not top prototype reload it's properties
        if (!typeUtils.isTopPrototype(newClass) && !typeUtils.isTopPrototype(oldClass)) {
            return HotReloaderCommonJS._reloadClassProperties(Object.getPrototypeOf(oldClass),
                Object.getPrototypeOf(newClass));
        }
        else if (typeUtils.isTopPrototype(newClass) && typeUtils.isTopPrototype(oldClass)) {
            return true;
        }
        else {
            throw new Error(`can't reload difference class`);
        }
    }

    /**
     * 删除模块缓存 node
     * @param {String} absPath 
     */
    static _clearRequireCache(absPath) {
        const cacheModule = require.cache[absPath];
        if (!cacheModule) {
            return;
        }
        // 1. add old module to cache if not function
        // because function always replace old module
        HotReloaderCommonJS._addOldModuleToCache(absPath);
        // 2. delete global module cache
        HotReloaderCommonJS._delGlobalModuleCache(absPath);

        // 3. delete require cache
        delete require.cache[absPath];
    }

    /**
     * 将老的 module 加入到缓存
     * @param {String} absPath 
     */
    static _addOldModuleToCache(absPath) {
        const requireCache = require(absPath);
        // 老的module加入到缓存
        let allRequiredCaches = HotReloaderCommonJS._requiredCaches.get(absPath);
        if (!allRequiredCaches) {
            allRequiredCaches = [];
            HotReloaderCommonJS._requiredCaches.set(absPath, allRequiredCaches);
        }
        allRequiredCaches.push(requireCache);
    }

    /**
     * 删除全局模块缓存
     * @param {String} absPath
     */
    static _delGlobalModuleCache(absPath) {
        // this module can't use module.exports it's will mask global module
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
        }
        else {
            let globalModule = module;
            if (globalModule && globalModule.children && Array.isArray(globalModule.children)) {
                let index = globalModule.children.indexOf(cacheModule);
                if (index !== -1) {
                    globalModule.children.splice(index, 1);
                }
            }
        }
    }
}

exports.HotReloaderCommonJS = HotReloaderCommonJS;

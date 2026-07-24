"use strict";

import path from "path";
import url from "url";

export const ROW_PROXY_CLASS_KEY = Symbol.for("raw_class");

/**
 * ESM 模块热重载器
 */
export class ESMModuleHotReloader {
    /**
     * 模块版本号映射
     * @type {Map<String, Number>}
     */
    static _reloadUrlMap = new Map();
    /**
     * 类缓存映射
     * @type {Map<string, CacheInfo>}
     * @typedef {Object} CacheInfo
     * @property {Function} classExpr 类引用
     * @property {String} fileUrl 类所在文件URL（不含 query string）
     * @property {Boolean} reloadFlag 是否正在进行热更新的标记
     * @property {Function|null} onLoad 加载/热更 回调函数
     */
    static _classCacheMap = new Map();
    /**
     * 文件类映射
     * @type {Map<string, Set<string>>}
     * @description 
     *  以文件URL为key，存储该文件中所有类的全局唯一标识
     *  通过文件URL快速定位到该文件中所有类的唯一标识
     *  避免每次都遍历 classCacheMap 查找 空间换时间
     */
    static _fileClassMap = new Map();

    /**
     * 模块缓存映射 缓存最新的模块版本
     * @type {Map<string, Module>}
     */
    static _moduleCacheMap = new Map();

    /**
     * 需要跳过热更的一些内置属性
     * @type {String[]}
     */
    static _builtInProperties = [
        "constructor",
        "length",
        "name",
        "prototype",
    ];

    /**
     * 生成类的全局唯一标识 使用 fileUrl 和 className 拼接组合
     * 保证不同文件中出现的相同类名不会冲突
     * @param {String} fileUrl 文件URL
     * @param {String} className 类名
     * @returns {String} 全局唯一标识
     */
    static _generateClassKey(fileUrl, className) {
        return `${fileUrl}#${className}`;
    }

    /**
     * 将输入路径或者url归一化为不带query string 的 file://url 格式
     * 支持以下输入:
     *   - 相对路径: './my_service.js'
     *   - 绝对路径: '/path/to/my_service.js'
     *   - file url: 'file:///path/to/my_service.js'
     *   - 带版本号: 'file:///path/to/my_service.js?v=1'
     * @param {String} fileUrlOrPath 输入路径或者url
     * @returns {String} 归一化后的文件URL
     */
    static _nomarlizeFileUrl(fileUrlOrPath) {
        // 如果已经是 file://url 格式
        if (fileUrlOrPath.startsWith("file://")) {
            const vIdx = fileUrlOrPath.indexOf('?');
            return vIdx !== -1 ? fileUrlOrPath.substring(0, vIdx) : fileUrlOrPath;
        }
        // 文件路径 --> 解析为绝对路径 --> 转换为 file://url 格式
        const absPath = path.resolve(fileUrlOrPath);
        return url.pathToFileURL(absPath).href;
    }

    /**
     * 用于从导出值中提取类引用
     * @param {any} exported 导出值
     * @returns {Function|null} 类引用 如果没有找到则返回 null
     */
    static _extractClass(exported) {
        // 如果是直接导出类
        if (typeof exported === "function" &&
            /^class[\s{]/.test(Function.prototype.toString.call(exported))) {
            return exported;
        }
        // 有可能是导出的类实例, 如果只导出类实例不导出类引用的话
        // 热更是无法捕获到并实现热更的 所以需要提取类引用
        if (exported &&
            typeof exported === "object" &&
            typeof exported.constructor === "function" &&
            /^class[\s{]/.test(Function.prototype.toString.call(exported.constructor))) {
            return exported.constructor;
        }
        // 有可能是 proxy 对象 需要检查是否存在原始类引用
        if (exported &&
            exported[ROW_PROXY_CLASS_KEY]) {
            return ESMModuleHotReloader._extractClass(exported[ROW_PROXY_CLASS_KEY]);
        }
        return null;
    }

    /**
     * 重新加载ESM模块
     * @param {String} moduleUrl 
     * @returns Promise<Object>
     * @description 
     *  通过版本号映射 实现模块热重载
     *  ESM 的模块缓存无法像 CommonJS 那样通过 delete require.cache 清除
     *  这里采用 Query String Cache Busting 策略：
     *      第一次: import('file:///path/to/module.js?v=1')
     *      第二次: import('file:///path/to/module.js?v=2')
     *  Node.js 会将不同的 URL 视为不同的模块，从而重新读取并执行文件
     * @warning 
     *  这会导致旧版本的模块无法被 GC 回收（内存泄漏）
     *  但是因为热更操作并不会经常且频繁性地触发 所以是可以接受的
     */
    static async reloadURL(fileUrl) {
        let v = ESMModuleHotReloader._reloadUrlMap.get(fileUrl) || 0;
        v += 1;
        ESMModuleHotReloader._reloadUrlMap.set(fileUrl, v);

        let newModule = await import(`${fileUrl}?v=${v}`);
        ESMModuleHotReloader._moduleCacheMap.set(fileUrl, newModule);
        return newModule;
    }

    /**
     * 根据类名触发单个类的热更新
     * 需要同时提供类名和文件路径 避免不同文件导出相同类名的情况
     * @param {String} fileUrlOrPath 文件路径或者url
     * @param {String} className 类名
     * @returns {Promise<Object>} 重新加载后的模块
     * @warning 
     *   单独更新某个类需要该类已经被热更捕获过 或者 手动注册过
     *   应该需要尽量避免单独更新某个类的情况 最好还是整体模块热更新
     *   因为 reloadURL 是文件级别的操作 正常是一个模块共享版本号
     */
    static async reloadClass(fileUrlOrPath, className) {
        // 1. 归一化参数 生成class唯一标识
        const fileUrl = ESMModuleHotReloader._nomarlizeFileUrl(fileUrlOrPath);           // 归一化参数
        const classKey = ESMModuleHotReloader._generateClassKey(fileUrl, className);     // 生成类唯一标识

        // 2. 从缓存映射中获取类信息
        let cacheInfo = ESMModuleHotReloader._classCacheMap.get(classKey);
        if (!cacheInfo) {
            return;
        }
        // 设置标记 检查是否正在热更新
        cacheInfo.reloadFlag = true;

        // 3. reload 新模块 迭代版本号
        let newModule;
        try {
            newModule = await ESMModuleHotReloader.reloadURL(fileUrl);
        }
        catch (err) {
            // 失败回滚
            cacheInfo.reloadFlag = false;
            throw err;
        }

        // 4. 将目标类单独进行原型链相关替换
        for (const exportKey of Object.keys(newModule)) {
            const exportValue = ESMModuleHotReloader._extractClass(newModule[exportKey]);
            if (!exportValue) {
                // not class or class instance
                continue;
            }
            if (exportValue.name === className) {
                ESMModuleHotReloader.classDef(fileUrl, exportValue);
            }
        }
    }

    /**
     * 重新加载整个模块
     * @param {String} fileUrlOrPath 文件路径或者url
     * @returns {Promise<Object>} 重新加载后的模块
     */
    static async reloadModule(fileUrlOrPath) {
        // 1. 参数归一化
        const fileUrl = ESMModuleHotReloader._nomarlizeFileUrl(fileUrlOrPath);
        let classKeySet = ESMModuleHotReloader._fileClassMap.get(fileUrl);

        // 2. 检查是否被注册 没有注册会自动在首次热更时进行注册
        if (!classKeySet || classKeySet.size <= 0) {
            const oldModule = await import(fileUrl);
            // 缓存最新模块版本
            if (!ESMModuleHotReloader._moduleCacheMap.has(fileUrl)) {
                ESMModuleHotReloader._moduleCacheMap.set(fileUrl, oldModule);
            }

            for (const exportKey of Object.keys(oldModule)) {
                const exportValue = ESMModuleHotReloader._extractClass(oldModule[exportKey]);
                if (!exportValue) {
                    continue;
                }
                const keyIndex = ESMModuleHotReloader._generateClassKey(fileUrl, exportValue.name);
                if (!ESMModuleHotReloader._classCacheMap.has(keyIndex)) {
                    // 先注册
                    ESMModuleHotReloader.classDef(fileUrl, exportValue);
                }
            }
            // 注册完成后更新类集合
            classKeySet = ESMModuleHotReloader._fileClassMap.get(fileUrl);
        }

        // 3. 设置热更标记 准备热更相关模块
        const reloadCacheList = [];
        if (classKeySet && classKeySet.size > 0) {
            for (const classKey of classKeySet) {
                const cacheInfo = ESMModuleHotReloader._classCacheMap.get(classKey);
                if (!cacheInfo) {
                    continue;
                }
                cacheInfo.reloadFlag = true;
                reloadCacheList.push(cacheInfo);
            }
        }

        // 4. 开始热更 加载新模块 触发patch操作
        let newModule;
        try {
            newModule = await ESMModuleHotReloader.reloadURL(fileUrl);
        }
        catch (err) {
            // 失败 回滚
            for (const cacheInfo of reloadCacheList) {
                cacheInfo.reloadFlag = false;
            }
            throw err;
        }

        // 4. 将目标类单独进行原型链相关替换
        for (const exportKey of Object.keys(newModule)) {
            const exportValue = ESMModuleHotReloader._extractClass(newModule[exportKey]);
            if (!exportValue) {
                // not class or class instance
                continue;
            }
            const keyIndex = ESMModuleHotReloader._generateClassKey(fileUrl, exportValue.name);
            if (ESMModuleHotReloader._classCacheMap.has(keyIndex)) {
                ESMModuleHotReloader.classDef(fileUrl, exportValue);
            }
        }
    }

    /**
     * 类定义 注册类到缓存映射中 并触发patch操作替换原型链内容
     * @param {String} fileUrlOrPath 文件路径或者url
     * @param {Function} classExpr 类引用
     * @param {Function|null} [onLoad=null] 加载/热更 回调函数
     * @returns {Function} 类引用
     * @description
     *   1. 首次注册  注册到缓存中
     *   2. 热更      将新类的方法和属性合并到旧类
     */
    static classDef(fileUrlOrPath, classExpr, onLoad = null) {
        // 1. 参数归一化 获取缓存判断是否是注册还是热更
        const fileUrl = ESMModuleHotReloader._nomarlizeFileUrl(fileUrlOrPath);
        const classKey = ESMModuleHotReloader._generateClassKey(fileUrl, classExpr.name);
        let cacheInfo = ESMModuleHotReloader._classCacheMap.get(classKey);

        // 2. 首次注册 
        if (!cacheInfo) {
            // 创建缓存信息
            ESMModuleHotReloader._classCacheMap.set(classKey, {
                classExpr: classExpr, // 类引用
                fileUrl: fileUrl, // 文件URL
                reloadFlag: false, // 是否正在进行热更新的标记
                onLoad: onLoad, // 加载/热更 回调函数
            });
            // 更新文件类映射
            let classNameSet = ESMModuleHotReloader._fileClassMap.get(fileUrl);
            if (!classNameSet) {
                classNameSet = new Set();
                ESMModuleHotReloader._fileClassMap.set(fileUrl, classNameSet);
            }
            classNameSet.add(classKey);
            if (onLoad) {
                // 触发首次加载回调
                onLoad(classExpr, false);
            }
            return classExpr;
        }

        // 3. 热更
        if (cacheInfo.fileUrl !== fileUrl) {
            throw new Error(`${classExpr.name} Redefined in ${cacheInfo.fileUrl} and in ${fileUrl}`);
        }
        // 没有热更标记 可能是被其他模块 import 导致 直接返回旧类
        if (!cacheInfo.reloadFlag) {
            return cacheInfo.classExpr;
        }
        cacheInfo.reloadFlag = false;

        let oldClass = cacheInfo.classExpr;
        // 静态成员合并
        let props = Object.getOwnPropertyNames(classExpr);
        for (const propName of props) {
            if (ESMModuleHotReloader._builtInProperties.includes(propName)) {
                continue;
            }
            const descriptor = Object.getOwnPropertyDescriptor(classExpr, propName);
            // 如果是 getter / setter 以及静态方法
            // 使用新的替代老的
            if (typeof descriptor.value === "function" || descriptor.get || descriptor.set) {
                try {
                    // 对于setter/getter 只能使用这种方式替换 否则会直接触发 getter/setter 调用
                    // 对于普通静态方法 如果使用 oldClass[propName] = classExpr[propName] 方式
                    // 其属性描述符始终是 enumerable: true, configurable: true, writable: true 
                    // 所以使用 Object.defineProperty 方式替换 保证属性描述符不变
                    Object.defineProperty(oldClass, propName, descriptor);
                }
                catch (err) {
                    void err;
                }
                continue;
            }
            // 如果是普通数据属性 需要使用老的替换新的 避免丢失运行时状态
            try {
                if (oldClass[propName]) {
                    // 如果旧类存在该属性 使用旧的替换新的
                    classExpr[propName] = oldClass[propName];
                }
                else {
                    // 如果旧类不存在该属性 使用新的替换旧的
                    oldClass[propName] = classExpr[propName];
                }
            } catch (err) {
                void err;
            }
        }

        // 原型链成员函数替换 数据不修改
        let oldPrototype = oldClass.prototype;
        let newPrototype = classExpr.prototype;
        props = Object.getOwnPropertyNames(newPrototype);
        for (const propName of props) {
            if (ESMModuleHotReloader._builtInProperties.includes(propName)) {
                continue;
            }
            const descriptor = Object.getOwnPropertyDescriptor(newPrototype, propName);
            if (typeof descriptor.value === "function" || descriptor.get || descriptor.set) {
                try {
                    Object.defineProperty(oldPrototype, propName, descriptor);
                }
                catch (err) {
                    void err;
                }
                continue;
            }
        }

        if (cacheInfo.onLoad) {
            cacheInfo.onLoad(classExpr, true);
        }
    }

    /**
     * 创建热更函数包装器
     * @param {String} filePathOrUrl 文件路径或者url
     * @param {String} functionName 函数名
     * @returns {Promise<Function>} 热更函数包装器
     */
    static async createHotReloadFunction(filePathOrUrl, functionName) {
        const fileUrl = ESMModuleHotReloader._nomarlizeFileUrl(filePathOrUrl);

        // 如果缓存未命中 直接预加载模块
        if (!ESMModuleHotReloader._moduleCacheMap.has(fileUrl)) {
            const module = await import(fileUrl);
            ESMModuleHotReloader._moduleCacheMap.set(fileUrl, module);
        }

        // 返回包装器
        return function (...args) {
            // 获取最新模块版本
            const mod = ESMModuleHotReloader._moduleCacheMap.get(fileUrl);
            if (!mod) {
                throw new Error(`Module ${fileUrl} not found`);
            }
            const targetFunc = mod[functionName];
            if (!targetFunc || typeof targetFunc !== "function") {
                throw new Error(`Function ${functionName} not found in module ${fileUrl}`);
            }
            return targetFunc.apply(this, args);
        }
    }
}
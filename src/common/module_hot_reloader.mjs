"use strict";

import path from "path";
import url from "url";

/**
 * 生成类的全局唯一标识 使用 fileUrl 和 className 拼接组合
 * 保证不同文件中出现的相同类名不会冲突
 * @param {String} fileUrl 文件URL
 * @param {String} className 类名
 * @returns {String} 全局唯一标识
 */
function _generateClassKey(fileUrl, className) {
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
function _nomarlizeFileUrl(fileUrlOrPath) {
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
function _extractClass(exported) {
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
    return null;
}

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
        return await import(`${fileUrl}?v=${v}`);
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
        const fileUrl = _nomarlizeFileUrl(fileUrlOrPath);           // 归一化参数
        const classKey = _generateClassKey(fileUrl, className);     // 生成类唯一标识

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
            const exportValue = newModule[exportKey];
            if (!_extractClass(exportValue)) {
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
        const fileUrl = _nomarlizeFileUrl(fileUrlOrPath);
        let classKeySet = ESMModuleHotReloader._fileClassMap.get(fileUrl);

        // 2. 检查是否被注册 没有注册会自动在首次热更时进行注册
        if (!classKeySet || classKeySet.size <= 0) {
            const oldModule = await import(fileUrl);
            for (const exportKey of Object.keys(oldModule)) {
                const exportValue = oldModule[exportKey];
                if (!_extractClass(exportValue)) {
                    continue;
                }
                const keyIndex = _generateClassKey(fileUrl, exportValue.name);
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
        for (const classKey of classKeySet) {
            const cacheInfo = ESMModuleHotReloader._classCacheMap.get(classKey);
            if (!cacheInfo) {
                continue;
            }
            cacheInfo.reloadFlag = true;
            reloadCacheList.push(cacheInfo);
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
            const exportValue = newModule[exportKey];
            if (!_extractClass(exportValue)) {
                // not class or class instance
                continue;
            }
            const keyIndex = _generateClassKey(fileUrl, exportValue.name);
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
     *   2. 热更      将新类的方法和属性河北到旧类
     */
    static classDef(fileUrlOrPath, classExpr, onLoad = null) {
        // 1. 参数归一化 获取缓存判断是否是注册还是热更
        const fileUrl = _nomarlizeFileUrl(fileUrlOrPath);
        const classKey = _generateClassKey(fileUrl, classExpr.name);
        let cacheInfo = ESMModuleHotReloader._classCacheMap.get(classKey);

        // 2. 首次注册 
        if (!cacheInfo) {
            // 创建缓存信息
            ESMModuleHotReloader._classCacheMap.set(classExpr.name, {
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
        
    }
}
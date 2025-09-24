"use strict";

const NacosInstanceFactory = require("./nacos_meta.js").NacosInstanceFactory;

/**
 * Nacos 监听基类 接口定义
 */
class NacosWatcher {
    constructor(name_) {
        this._name = name_;
    }
    /**
     * 监听入口路由
     */
    watchRouter() {
        throw new Error('NacosWatcher watchRouter not implemented');
    }
}

/**
 * Nacos 命名服务监听类
 */
class NacosNamingWatcher extends NacosWatcher {
    constructor(name_, fnCaller_, options_) {
        super(name_);
        /**
         * 回调函数调用器
         * @type {NacosCallbacker}
         */
        this._fnCaller = fnCaller_;
        /**
         * 监听选项
         * @type {Object}
         */
        this._options = options_;
        /**
         * 监听关闭
         * @type {boolean}
         */
        this._done = false;
        /**
         * 实例信息缓存
         * @type {Map<string, import("nacos").Host>}
         */
        this._instanceMap = new Map();
        /**
         * 实例相等判断函数
         * @type {function(import("nacos").Host, import("nacos").Host): boolean}
         */
        this._equalInstance = null;
    }

    /**
     * 关闭监听器
     */
    close() {
        this._done = true;
    }

    /**
     * 监听器配置
     * @returns {Object}
     */
    getOptions() {
        return this._options;
    }

    /**
     * 默认实例相等判断
     * @param {import("nacos").Host} instanceA 
     * @param {import("nacos").Host} instanceB 
     */
    _defaultEqualInstance(instanceA, instanceB) {
        return instanceA.ip !== instanceB.ip ||
            instanceA.port !== instanceB.port ||
            instanceA.enabled !== instanceB.enabled ||
            instanceA.weight !== instanceB.weight ||
            instanceA.healthy !== instanceB.healthy;
    }

    /**
     * Nacos 命名服务监听入口路由
     * @param {import("nacos").Hosts} hosts 
     */
    watchRouter(hosts) {
        if (!this._fnCaller) {
            throw new Error('NacosNamingWatcher watchRouter fnCaller not exist');
        }
        if (this._done || !hosts || !Array.isArray(hosts) || hosts.length <= 0) {
            return;
        }
        const newInstancesMap = new Map(); // 新的实例集合缓存
        const delInstances = [];           // 删除实例
        const addInstances = [];           // 添加实例
        const updateInstances = [];        // 更新实例
        for (const host of hosts) {
            if (!host || !host.enabled) {
                // 过滤掉禁用的实例
                continue;
            }
            const builder = NacosInstanceFactory.discoveryBuilder();
            const instance = builder.from(host).build();
            newInstancesMap.set(instance.instanceId, instance); // 设置新map
            if (!this._instanceMap.has(instance.instanceId)) {
                // 新增
                addInstances.push(instance);
            }
            else {
                const oldInstance = this._instanceMap.get(instance.instanceId);
                let isEqual = false;
                // 判断变化
                if (this._equalInstance) {
                    isEqual = this._equalInstance(oldInstance, instance);
                }
                else {
                    isEqual = this._defaultEqualInstance(oldInstance, instance);
                }
                if (!isEqual) {
                    updateInstances.push(instance);
                }
            }
        }
        // delete
        for (const [instanceId, cacheInstance] of this._instanceMap.values()) {
            if (!newInstancesMap.has(instanceId)) {
                delInstances.push(cacheInstance);
            }
        }
        // 更新缓存
        this._instanceMap = newInstancesMap;
        // 分发通知给回调
        if (addInstances.length > 0 && typeof this._fnCaller?.onRegister == "function") {
            this._fnCaller?.onRegister(addInstances);
        }
        if (delInstances.length > 0 && typeof this._fnCaller?.onDeregister == "function") {
            this._fnCaller?.onDeregister(delInstances);
        }
        if (updateInstances.length > 0 && typeof this._fnCaller?.onServiceChange == "function") {
            this._fnCaller?.onServiceChange(updateInstances);
        }
    }
}

/**
 * 配置监听器
 */
class NacosConfigWatcher extends NacosWatcher {
    constructor(name_, fnCaller_, options_, parser_) {
        super(name_);
        /**
         * 回调执行器
         * @type {NacosCallbacker}
         */
        this._fnCaller = fnCaller_;
        /**
         * 监听器选项
         * @type {Object}
         */
        this._options = options_;
        /**
         * 解析器选项
         * @type {NacosConfigParser}
         */
        this._parser = parser_;
    }

    /**
     * 获取监听参数选项
     * @returns 
     */
    getOptions() {
        return this._options;
    }

    /**
     * 监听回调
     * @override
     * @param {string} content 配置内容
     */
    watchRouter(content) {
        if (!this._parser) {
            throw new Error("NacosConfigWatcher parser is not set");
        }
        // 解析覆写配置数据
        const dataObj = this._parser.decode(content);
        // 调用外部监听回调
        if (this._fnCaller && typeof this._fnCaller?.onConfigChange === "function") {
            // 将更新后的配置数据对象传递给外部监听回调函数
            const dataId = this._options.dataId;
            this._fnCaller.onConfigChange(dataId, dataObj);
        }
    }
}

module.exports = {
    NacosWatcher,
    NacosNamingWatcher,
    NacosConfigWatcher,
}
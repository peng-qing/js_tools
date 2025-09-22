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
        if (addInstances.length > 0) {
            this._fnCaller.onRegister(addInstances);
        }
        if (delInstances.length > 0) {
            this._fnCaller.onDeregister(delInstances);
        }
        if (updateInstances.length > 0) {
            this._fnCaller.onServiceChange(updateInstances);
        }
    }
}

module.exports = {
    NacosWatcher,
    NacosNamingWatcher,
}
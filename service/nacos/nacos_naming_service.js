"use strict";

const NacosConst = require("./nacos_const.js");
const NacosNamingClient = require("nacos").NacosNamingClient;
const NacosNamingWatcher = require("./nacos_watcher.js").NacosNamingWatcher;
const NacosInstanceFactory = require("./nacos_meta.js").NacosInstanceFactory;
const NacosOptionsFactory = require("./nacos_options.js").NacosOptionsFactory;

class NacosNamingService {
    constructor(logger_) {
        /**
         * 日志器
         * @type {console}
         */
        this._logger = logger_ || console;
        /**
         * 配置选项
         * @type {Object}
         */
        this._options = {};
        /**
         * 服务实例监听者 Map
         * @type {Map<string, NacosNamingWatcher>}
         */
        this._watcherMap = new Map();
        /**
         * Nacos 命名服务客户端
         * @type {NacosNamingClient}
         */
        this._namingClient = null;
        /**
         * 服务是否已启动
         * @type {boolean}
         */
        this._startUp = false;
    }

    /**
     * 获取 Nacos 命名服务客户端
     * @returns {NacosNamingClient}
     */
    getNamingClient() {
        return this._namingClient;
    }

    /**
     * 检查服务是否已启动
     * @returns {boolean}
     */
    isStartUp() {
        return this._startUp;
    }

    /**
     * 根据配置初始化命名客户端服务
     * @param {import("nacos").NacosNamingClientConfig} options_ 
     */
    async initConfiguration(options_) {
        if (!options_) {
            this._logger.error("[NacosNamingService] initConfiguration invalid options");
            return false;
        }
        const builder = NacosOptionsFactory.namingBuilder();
        const options = builder.merge(options_).logger(this._logger).build();
        const namingClient = new NacosNamingClient(options);
        try {
            // 初始化命名客户端
            await namingClient.ready();
            // 检查Nacos服务正常
            const status = await namingClient.getServerStatus();
            if (status !== NacosConst.SERVER_STATUS.UP) {
                return false;
            }
            // 初始化成功
            this._options = options_;
            this._namingClient = namingClient;
            this._startUp = true;
        }
        catch (err) {
            this._logger.error("[NacosNamingService] initConfiguration error: ", err);
            return false;
        }
        return true;
    }

    /**
     * 获取 Nacos 服务端状态
     * @returns {NacosConst.SERVER_STATUS}
     */
    async getNacosServerStatus() {
        if (!this.isStartUp()) {
            this._logger.error("[NacosNamingService] getNacosServerStatus error: service is not start up");
            return NacosConst.SERVER_STATUS.DOWN;
        }
        return await this.getNamingClient().getServerStatus();
    }

    /**
     * 校验注册服务实例数据是否有效
     * @param {RegisteryInfo} registeryObj_ 服务实例注册数据
     * @returns {boolean}
     */
    _validateRegisteryInfo(registeryObj_) {
        return registeryObj_ &&
            registeryObj_.serviceName &&
            registeryObj_.ip &&
            registeryObj_.port;
    }

    /**
     * 注册服务实例
     * @param {import("nacos").Instance} registeryObj_ 服务实例注册数据
     * @param {string} groupName_ 组名称
     */
    async registerInstance(registeryObj_, groupName_ = NacosConst.DEFAULT_GROUP) {
        if (!this.isStartUp()) {
            this._logger.error(`[NacosNamingService] register service is not start up, registeryObj_: ${JSON.stringify(registeryObj_)}`);
            return false;
        }
        try {
            if (!this._validateRegisteryInfo(registeryObj_)) {
                this._logger.error(`[NacosNamingService] register registeryObj_ is invalid, registeryObj_: ${JSON.stringify(registeryObj_)}`);
                return false;
            }
            this._logger.info(`[NacosNamingService] register service, instance: ${JSON.stringify(instance)}, groupName_: ${groupName_}`);
            await this.getNamingClient().registerInstance(instance.serviceName, instance, groupName_);
        }
        catch (err) {
            this._logger.error(`[NacosNamingService] register failed, registeryObj_:${JSON.stringify(registeryObj_)}, err:${err}`);
            return false;
        }
        return true;
    }

    /**
     * 注销服务
     * @param {import("nacos").Instance} registeryObj_ 服务实例注册数据
     * @param {string} groupName_ 组名称
     */
    async deregisterInstance(registeryObj_, groupName_ = NacosConst.DEFAULT_GROUP) {
        if (!this.isStartUp()) {
            this._logger.error(`[NacosNamingService] register service is not start up, registeryObj_: ${JSON.stringify(registeryObj_)}`);
            return false;
        }
        try {
            if (!this._validateRegisteryInfo(registeryObj_)) {
                this._logger.error(`[NacosNamingService] register registeryObj_ is invalid, registeryObj_: ${JSON.stringify(registeryObj_)}`);
                return false;
            }
            this._logger.info(`[NacosNamingService] register service, instance: ${JSON.stringify(instance)}, groupName_: ${groupName_}`);
            // weight、metadata 等数据可以不需要
            await this.getNamingClient().registerInstance(instance.serviceName, instance, groupName_);
        }
        catch (err) {
            this._logger.error(`[NacosNamingService] register failed, registeryObj_:${JSON.stringify(registeryObj_)}, err:${err}`);
            return false;
        }
    }

    /**
     * 获取所有服务实例
     * @param {string} serviceName 服务名称
     * @param {string} groupName 组名称
     * @param {string} clusterName 集群名称
     * @param {boolean} subscribe 是否订阅
     * @returns {Promise<import("nacos").Hosts>}
     */
    async getAllServiceInstances(serviceName, groupName = NacosConst.DEFAULT_GROUP, clusterName = NacosConst.DEFAULT_CLUSTER_NAME, subscribe = true) {
        if (!serviceName) {
            this._logger.error(`[NacosNamingService] getAllServiceInstances serviceName is empty, serviceName:${serviceName}`);
            return [];
        }
        try {
            this._logger.info(`[NacosNamingService] getAllServiceInstances, serviceName:${serviceName}, groupName:${groupName}, clusterName:${clusterName}, subscribe:${subscribe}`);
            const hosts = await this._namingClient.getAllInstances(serviceName, groupName, clusterName, subscribe);
            if (!hosts || !Array.isArray(hosts) || hosts.length <= 0) {
                this._logger.info(`[NacosNamingService] getAllServiceInstances hosts is empty, serviceName:${serviceName}`);
                return [];
            }
            const results = [];
            for (const host of hosts) {
                const builder = NacosInstanceFactory.discoveryBuilder();
                const instance = builder.from(host).build();
                results.push(instance);
            }
            return results;
        }
        catch (err) {
            this._logger.error(`[NacosNamingService] getAllServiceInstances failed, ` +
                `serviceName: ${serviceName}, groupName: ${groupName}, clusterName: ${clusterName}, subscribe: ${subscribe}, error: ${err}`);
            return [];
        }
    }

    /**
     * 检查实例是否已经被注册
     * @param {import("nacos").Instance} registeryObj_ 
     * @param {string} groupName 
     */
    async checkRegistered(registeryObj_, groupName = NacosConst.DEFAULT_GROUP) {
        const results = this.getAllServiceInstances(registeryObj_.serviceName, groupName, registeryObj_.clusterName);
        if (!results || !Array.isArray(results) || results.length <= 0) {
            this._logger.info(`[NacosNamingService] checkRegistered instance list is empty, registeryObj_:${JSON.stringify(registeryObj_)}, groupName:${groupName}`);
            return false;
        }
        const target = results.find(instance =>
            registeryObj_.ip == instance.ip &&
            registeryObj_.port == instance.port);
        if (target) {
            return true;
        }
        return false;
    }

    /**
     * 获取服务实例 注意：结果实例 weight 必须大于0, 否则会被过滤
     * 如果设置了订阅 subscribe, SDK 会缓存订阅服务实例, 并相应更新实例列表, 否则会重新请求 nacos 获取实例列表
     * @param {string} serviceName 服务名称
     * @param {string} groupName 组名称
     * @param {string} clusterName 集群名称
     * @param {boolean} healthy 是否健康
     * @param {boolean} subscribe 是否订阅
     * @returns {Promise<import("nacos").Hosts>}
     */
    async selectServiceInstances(serviceName, groupName = NacosConst.DEFAULT_GROUP, clusterName = NacosConst.DEFAULT_CLUSTER_NAME, healthy = true, subscribe = true) {
        if (!serviceName) {
            this._logger?.error(`[NacosNamingService] selectServiceInstances serviceName is empty, serviceName: ${serviceName}`);
            return [];
        }
        const hosts = await this._namingClient.selectInstances(serviceName, groupName, clusterName, healthy, subscribe);
        if (!hosts || hosts.length <= 0) {
            this._logger?.error(`[NacosNamingService] selectServiceInstances instances list empty, serviceName: ${serviceName}, clusterName: ${clusterName}, groupName: ${groupName}`);
            return [];
        }
        const results = [];
        for (const host of hosts) {
            const builder = NacosInstanceFactory.discoveryBuilder();
            const instance = builder.from(host).build();
            results.push(instance);
        }
        this._logger?.info(`[NacosNamingService] selectServiceInstances success, ` +
            `serviceName: ${serviceName}, clusterName: ${clusterName}, groupName: ${groupName}, healthy: ${healthy}, subscribe: ${subscribe}, instances: ${results.length}`);
        return results;
    }

    /**
     * 获取订阅Key
     * @param {import("nacos").SubscribeInfo} options_ 
     */
    _getWatcherKey(options_) {
        return `${options_.serviceName}_${options_.clusterName || NacosConst.DEFAULT_CLUSTER_NAME}_${options_.groupName || NacosConst.DEFAULT_GROUP}`;
    }

    /**
     * 监听服务
     * @param {import("nacos").SubscribeInfo} options_ 
     * @param {NacosCallbacker} fnCaller_ 
     */
    subscribe(options_, fnCaller_) {
        const builder = NacosOptionsFactory.namingWatcherBuilder();
        const options = builder.merge(options_).build();
        const watchKey = this._getWatcherKey(options);
        if (this._watcherMap.has(watchKey)) {
            // 先取消监听 再重新监听
            this.unSubscribe(options);
        }
        const watcher = new NacosNamingWatcher(watchKey, fnCaller_, options);
        this._watcherMap.set(watchKey, watcher);
        this._namingClient.subscribe(options, (hosts) => {
            watcher.watchRouter(hosts);
        });
        this._logger.info(`[NacosNamingService] subscribe success, watchKey:${watchKey}, options:${JSON.stringify(options)}`);
    }

    /**
     * 取消服务订阅
     * @param {import("nacos").SubscribeInfo} options_ 
     */
    unSubscribe(options_) {
        const watchKey = this._getWatcherKey(options_);
        const watcher = this._watcherMap.get(watchKey);
        if (watcher) {
            watcher.close();
            this._watcherMap.delete(watchKey);
            this._namingClient.unSubscribe(options_);
            this._logger?.info(`[NacosNamingService] unSubscribe success, options_: ${JSON.stringify(options_)}`);
        }
    }

    /**
     * 销毁
     */
    async destroy() {
        if (this._watcherMap.size > 0) {
            for (const watcher of this._watcherMap.values()) {
                this.unSubscribe(watcher.getOptions());
            }
            this._watcherMap.clear();
        }
        this._logger?.info(`[NacosNamingService] destroy success...`);
    }
}

module.exports = NacosNamingService;
"use strict";

const NacosConst = require("./nacos_const.js");
const NacosCallbacker = require("./nacos_callbacker.js");
const { NacosInstanceFactory } = require("./nacos_meta.js");
const { NacosOptionsFactory } = require("./nacos_options.js");
const NacosNamingService = require("./nacos_naming_service.js");
const NacosConfigService = require("./nacos_config_service.js");

// Nacos 服务代理类
class NacosAgent {
    constructor(logger_) {
        this._logger = logger_;
        /**
         * 命名服务
         * @type {NacosNamingService}
         */
        this._namingService = null;
        /**
         * 配置服务
         * @type {NacosConfigService}
         */
        this._configService = null;
        /**
         * 回调执行器
         * @type {NacosCallbacker}
         */
        this._fnCaller = null;
        /**
         * 节点心跳定时器
         */
        this._heartbeatTimer = null;
        /**
         * 节点选项
         * @type {Object}
         */
        this._agentOptions = null;
    }

    /**
     * 启动 Nacos 服务代理
     * @param {Object} agentOptions_ 节点选项
     * @param {NacosCallbacker} fnCaller_ 回调执行器
     * @param {Object} metadata_ 服务元数据
     */
    async agentStart(agentOptions_, fnCaller_, metadata_ = {}) {
        if (!agentOptions_ || !fnCaller_) {
            this._logger.error("[NacosAgent] agentStart invalid options");
            return false;
        }
        const builder = NacosOptionsFactory.agentBuilder();
        const options = builder.merge(agentOptions_).build();
        this._agentOptions = options;
        this._fnCaller = fnCaller_;
        // 初始化命名服务
        this._namingService = new NacosNamingService(this._logger);
        // 初始化配置服务
        this._configService = new NacosConfigService(this._logger);
        try {
            // 初始化命名服务
            const namingBuilder = NacosOptionsFactory.namingBuilder();
            const namingOptions = namingBuilder.endpoint(options.endpoint).
                namespace(options.namespace).
                auth(options.username, options.password).build();
            this._namingService.init(namingOptions);
            // 初始化配置服务
            const configBuilder = NacosOptionsFactory.configBuilder();
            const configOptions = configBuilder.endpoint(options.endpoint).
                namespace(options.namespace).
                auth(options.username, options.password).build();
            this._configService.init(configOptions);
            // 节点服务注册
            this.agentRegister(metadata_);
            // 启动节点定时心跳 上报刷新元数据
            this.startAgentHeartbeat();
            // 启动服务订阅
            this.startWatchService();
            // 启动配置监听服务
            this.startConfigWatchService();
        } catch (err) {
            this._logger.error(`[NacosAgent] agentStart error: ${err}`);
            return false;
        }
        return true;
    }

    /**
     * 启动配置监听服务
     * @returns 
     */
    startConfigWatchService() {
        if (!this._agentOptions?.watchKeys || !Array.isArray(this._agentOptions?.watchKeys) || this._agentOptions?.watchKeys.length <= 0) {
            this._logger?.info(`[NacosAgent] startConfigWatchService not configure watchKeys`);
            return;
        }
        for (const dataId of this._agentOptions.watchKeys) {
            const builder = NacosOptionsFactory.configWatcherBuilder();
            const options = builder.dataId(dataId).groupName(this._agentOptions?.groupName).build();
            this._configService.subscribe(options, this._fnCaller);
        }
    }

    /**
     * 停止节点定时心跳
     */
    stopAgentHeartbeat() {
        if (this._heartbeatTimer) {
            clearInterval(this._heartbeatTimer);
            this._heartbeatTimer = null;
        }
    }

    /**
     * 启动节点定时心跳 上报刷新元数据
     */
    startAgentHeartbeat() {
        // 防重入
        this.stopAgentHeartbeat();
        // 节点心跳间隔 默认 6s
        const heartbeatInterval = this._agentOptions?.heartbeatInterval || 6000;
        let self = this;
        this._heartbeatTimer = setInterval(async () => {
            try {
                // 简单探测服务端状态，异常不抛出，避免中断循环
                const status = await self._namingService.getNacosServerStatus();
                if (status !== NacosConst.SERVER_STATUS.UP) {
                    self._logger?.warn(`[NacosNamingAgent] naming server status: ${status}`);
                    return;
                }
                if (self._fnCaller && typeof self._fnCaller.onHeartbeat === "function") {
                    await self._fnCaller.onHeartbeat();
                }
            }
            catch (err) {
                self._logger?.error(`[NacosNamingAgent] agentHeartbeat error: ${err}`);
            }
        }, heartbeatInterval);
    }

    /**
     * 构建注册对象
     * @returns {import("nacos").Host}
     */
    _buildRegisteryInfo(metadata_ = {}) {
        const builder = NacosInstanceFactory.registeryBuilder();
        const registeryInfo = builder.ip(this._agentOptions.serviceIp).port(this._agentOptions.servicePort)
            .weight(this._agentOptions.weight).serviceName(this._agentOptions.serviceName)
            .clusterName(this._agentOptions.clusterName).mergeMetaData(metadata_).build();
        return registeryInfo;
    }

    /**
     * 节点服务注册
     * @param {Object} metadata_ 元数据 必须要是 key-value 且都为字符串
     */
    async agentRegister(metadata_ = {}) {
        const registeryInfo = this._buildRegisteryInfo(metadata_);
        // 检查节点服务是否存在
        const exists = await this._namingService.checkRegistered(registeryInfo, this._agentOptions?.groupName);
        if (exists) {
            // 如果服务存在 重新注册以更新元数据信息
            this._logger.info(`[NacosAgent] agentRegister service ${registeryInfo.serviceName} exists, re-register to update metadata`);
        }
        // 注册节点服务
        await this._namingService.registerInstance(registeryInfo, this._agentOptions?.groupName);
        this._logger.info(`[NacosAgent] agentRegister service success, serviceName: ${registeryInfo.serviceName}, clusterName: ${registeryInfo.clusterName},` +
            ` addr: ${registeryInfo.ip}:${registeryInfo.port}, groupName: ${this._agentOptions?.groupName}`);
    }

    /**
     * 启动服务订阅
     */
    startWatchService() {
        if (!this._agentOptions?.subscribes || !Array.isArray(this._agentOptions.subscribes) || this._agentOptions.subscribes.length <= 0) {
            this._logger.warn("[NacosAgent] startWatchService invalid subscribes");
            return;
        }
        for (const info of this._agentOptions.subscribes) {
            this._namingService.subscribe(info, this._fnCaller);
        }
    }

    /**
     * 节点代理服务注销
     */
    async agentDeregister() {
        // 心跳停止
        this.stopAgentHeartbeat();
        // 注销命名服务
        const registeryInfo = this._buildRegisteryInfo();
        await this._namingService.deregisterInstance(registeryInfo, this._agentOptions?.groupName);
        await this._namingService.destroy();
        this._namingService = null;
        // 注销配置服务
        await this._configService.destroy();
        this._configService = null;
        this._logger.info(`[NacosAgent] agentDeregister success, serviceName: ${registeryInfo.serviceName}, clusterName: ${registeryInfo.clusterName},` +
            ` serviceAddr: ${registeryInfo.ip}:${registeryInfo.port}, groupName: ${this._agentOptions?.groupName}`);
    }
}

module.exports = NacosAgent;

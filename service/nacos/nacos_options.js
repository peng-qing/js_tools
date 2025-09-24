"use strict";

const NacosConst = require("./nacos_const.js");

/**
 * Nacos 服务选项构建器
 * 用于构建Nacos服务的连接配置和扩展配置
 */
class NacosOptionsBuilder {
    constructor() {
        this._options = {};
        this._validateFields = [];
    }

    /**
     * 构建最终配置选项
     * @returns {Object}
     */
    build() {
        this.defaults();
        this.validateRequiredFields(this._validateFields);
        return {
            ...this._options
        }
    }

    /**
     * 对必要参数填入默认值
     */
    defaults() {
    }

    /**
     * 合并选项
     * @param {Object} options_ 
     */
    merge(options_) {
        if (options_ && typeof options_ === "object") {
            Object.assign(this._options, options_);
        }
        return this;
    }

    /**
     * 验证必需字段
     * @param {Array<string>} fields 
     */
    validateRequiredFields(fields) {
        for (const field of fields) {
            if (this._data[field] === undefined) {
                throw new Error(`Required field '${field}' is missing`);
            }
        }
    }
}

/**
 * Nacos 命名服务选项构建器
 */
class NacosNamingOptionsBuilder extends NacosOptionsBuilder {
    constructor() {
        super();
        this._validateFields = ["namespace"];
    }

    logger(logger_) {
        this._options.logger = logger_;
        return this;
    }

    /**
     * Nacos 服务器列表 直连模式寻址 互斥于 endpoint
     * 如果是 string 支持使用 ',' 分割多个服务器地址
     * @param {string[]|string} serverList_ 
     */
    serverList(serverList_) {
        if (Array.isArray(serverList_)) {
            this._options.serverList = serverList_;
        }
        else if (typeof serverList_ === 'string') {
            this._options.serverList = serverList_.split(",").map(item => item.trim());
        }
        return this;
    }

    /**
     * Nacos 服务端地址 域名模式寻址 互斥于 serverList
     * @param {string} endpoint_ 
     * @returns 
     */
    endpoint(endpoint_) {
        this._options.endpoint = endpoint_;
        return this;
    }

    /**
     * Nacos 命名空间 默认为 default (public)
     * @param {string} namespace_ 
     * @returns 
     */
    namespace(namespace_) {
        this._options.namespace = namespace_;
        return this;
    }

    /**
     * Nacos 是否使用 SSL 连接
     * @param {boolean} enabled_ 
     * @returns 
     */
    ssl(enabled_ = true) {
        this._options.ssl = enabled_;
        return this;
    }

    /**
     * Nacos 认证信息
     * @param {string} username 
     * @param {string} password 
     * @returns 
     */
    auth(username_, password_) {
        this._options.username = username_;
        this._options.password = password_;
        return this;
    }

    /**
     * Nacos 阿里云ACM模式认证信息
     * @param {string} accessKey_ 
     * @param {string} secretKey_ 
     */
    acm(accessKey_, secretKey_) {
        this._options.accessKey = accessKey_;
        this._options.secretKey = secretKey_;
        // ak/sk 别名
        this._options.ak = accessKey_;
        this._options.sk = secretKey_;
        return this;
    }

    /**
     * Nacos 应用名称
     * @param {string} appName_ 
     * @returns 
     */
    appName(appName_) {
        this._options.appName = appName_;
        return this;
    }

    /**
     * Nacos 刷新实例列表间隔 单位毫秒
     * @param {number} vipSrvRefInterMillis_ 
     * @returns 
     */
    vipSrvRefInterMillis(vipSrvRefInterMillis_) {
        this._options.vipSrvRefInterMillis = vipSrvRefInterMillis_;
        return this;
    }
}

/**
 * Nacos 配置服务选项构建器
 */
class NacosConfigOptionsBuilder extends NacosOptionsBuilder {
    constructor() {
        super();
        this._validateFields = ["namespace"];
    }

    /**
     * Nacos 配置服务地址 直连模式 和 endpoint 互斥(带端口)
     * @param {string} address_ 
     * @returns 
     */
    serverAddr(address_) {
        this._options.serverAddr = address_;
        return this;
    }

    /**
     * Nacos 配置服务地址 寻址模式
     * @param {string} endpoint_ 
     * @returns 
     */
    endpoint(endpoint_) {
        this._options.endpoint = endpoint_;
        return this;
    }

    /**
     * Nacos 配置服务端口 寻址模式
     * @param {number} port_ 
     * @returns 
     */
    serverPort(port_) {
        this._options.serverPort = port_;
        return this;
    }

    /**
     * Nacos 配置服务命名空间 默认为 default (public)
     * @param {string} namespace_ 
     * @returns 
     */
    namespace(namespace_) {
        this._options.namespace = namespace_;
        return this;
    }

    /**
     * Nacos 配置服务集群名称 默认为 DEFAULT
     * @param {string} clusterName_ 
     * @returns 
     */
    clusterName(clusterName_) {
        this._options.clusterName = clusterName_;
        return this;
    }

    /**
     * Nacos 配置服务单元名称
     * @param {string} unit_ 
     * @returns 
     */
    unit(unit_) {
        this._options.unit = unit_;
        return this;
    }

    /**
     * Nacos 配置服务是否使用 SSL 连接
     * @param {boolean} enabled_ 
     * @returns 
     */
    ssl(enabled_ = true) {
        this._options.ssl = enabled_;
        return this;
    }

    /**
     * Nacos 配置服务认证信息
     * @param {string} username_ 
     * @param {string} password_ 
     * @returns 
     */
    auth(username_, password_) {
        this._options.username = username_;
        this._options.password = password_;
        return this;
    }

    /**
     * Nacos 配置服务阿里云ACM模式认证信息
     * @param {string} accessKey_ 
     * @param {string} secretKey_ 
     * @returns 
     */
    acm(accessKey_, secretKey_) {
        this._options.accessKey = accessKey_;
        this._options.secretKey = secretKey_;
        // ak/sk 别名
        this._options.ak = accessKey_;
        this._options.sk = secretKey_;
        return this;
    }

    /**
     * Nacos 配置服务刷新间隔 单位毫秒
     * @param {number} refreshInterval_ 
     * @returns 
     */
    refreshInterval(refreshInterval_) {
        this._options.refreshInterval = refreshInterval_;
        return this;
    }

    /**
     * Nacos 配置服务 endpoint 请求参数
     * @param {string} key 
     * @param {string} value 
     * @returns 
     */
    endpointQueryParams(key_, value_) {
        if (this._options.endpointQueryParams) {
            this._options.endpointQueryParams += `&`
        }
        this._options.endpointQueryParams += `${key_}=${value_}`
    }

    /**
     * Nacos 配置服务 endpoint 请求参数
     * @param {string} key_ 
     * @param {string} value_ 
     */
    identifyParams(key_, value_) {
        this._options.identityKey = key_;
        this._options.identityValue = value_;
        return this;
    }

    /**
     * Nacos 配置服务应用名称
     * @param {string} appName_ 
     * @returns 
     */
    appName(appName_) {
        this._options.appName = appName_;
        return this;
    }

    /**
     * Nacos 配置服务请求超时时间 单位毫秒 http_agent 使用
     * @param {number} timeout_ 
     * @returns 
     */
    requestTimeout(timeout_ = 5000) {
        this._options.requestTimeout = timeout_;
        return this;
    }

    /**
     * Nacos 配置服务默认编码
     * @param {string} encoding_ 
     * @returns 
     */
    defaultEncoding(encoding_ = 'utf-8') {
        this._options.encoding = encoding_;
        return this;
    }
}

/**
 * Nacos 命名服务监听选项构建器
 */
class NacosNamingWatcherOptionsBuilder extends NacosOptionsBuilder {
    constructor() {
        super();
        this._validateFields = ["serviceName"];
    }

    /**
     * Nacos 命名服务监听选项服务名称
     * @param {string} serviceName_ 
     * @returns 
     */
    serviceName(serviceName_) {
        this._options.serviceName = serviceName_;
        return this;
    }

    /**
     * Nacos 命名服务监听选项组名称
     * @param {string} groupName_ 
     * @returns 
     */
    groupName(groupName_) {
        this._options.groupName = groupName_;
        return this;
    }

    /**
     * Nacos 命名服务监听选项集群名称
     * @param {string} clusterName_ 
     * @returns 
     */
    clusterName(clusterName_) {
        this._options.clusterName = clusterName_;
        return this;
    }

    /**
     * 设置默认值
     * @override
     */
    defaults() {
        if (!this._options.groupName) this._options.groupName = NacosConst.DEFAULT_GROUP
        if (!this._options.clusterName) this._options.clusterName = NacosConst.DEFAULT_CLUSTER_NAME
    }
}

/**
 * Nacos 配置服务监听选项构建器
 */
class NacosConfigWatcherOptionsBuilder extends NacosOptionsBuilder {
    constructor() {
        this._options = {};
        this._validateFields = ["dataId"];
    }
    /**
     * 配置ID
     * @param {string} dataId_ 
     * @returns {NacosConfigWatcherOptionsBuilder}
     */
    dataId(dataId_) {
        this._options.dataId = dataId_;
        return this;
    }

    /**
     * 分组名
     * @param {string} groupName_ 
     * @returns {NacosConfigWatcherOptionsBuilder}
     */
    groupName(groupName_) {
        this._options.groupName = groupName_;
        return this;
    }

    /**
     * 单元
     * @param {string} unit_ 
     * @returns {NacosConfigWatcherOptionsBuilder}
     */
    unit(unit_) {
        this._options.unit = unit_;
        return this;
    }

    /**
     * 设置默认值
     * @override
     */
    defaults() {
        if (!this._options.groupName) this._options.groupName = NacosConst.DEFAULT_GROUP
    }
}

/**
 * Nacos配置选项构建工厂
 */
class NacosOptionsFactory {
    /**
     * @returns {NacosNamingOptionsBuilder}
     */
    static namingBuilder() {
        return new NacosNamingOptionsBuilder();
    }

    /**
     * @returns {NacosConfigOptionsBuilder}
     */
    static configBuilder() {
        return new NacosConfigOptionsBuilder();
    }

    /**
     * @returns {NacosNamingWatcherOptionsBuilder}
     */
    static namingWatcherBuilder() {
        return new NacosNamingWatcherOptionsBuilder();
    }

    /**
     * @returns {NacosConfigWatcherOptionsBuilder}
     */
    static configWatcherBuilder() {
        return new NacosConfigWatcherOptionsBuilder();
    }
}

module.exports = {
    NacosOptionsBuilder,
    NacosNamingOptionsBuilder,
    NacosConfigOptionsBuilder,
    NacosNamingWatcherOptionsBuilder,
    NacosConfigWatcherOptionsBuilder,
    NacosOptionsFactory,
}


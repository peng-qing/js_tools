"use strict";

const NacosConst = require("./nacos_const.js");

/**
 * Nacos服务注册信息构建器
 */
class NacosInstanceRegisteryBuilder {
    constructor() {
        this._data = {};
    }
    /**
    * 实例 ID
    * @param {string} instanceId_ 
    * @returns {NacosInstanceRegisteryBuilder}
    */
    instanceId(instanceId_) {
        this._data.instanceId = instanceId_;
        return this;
    }

    /**
     * 实例 IP
     * @param {string} ip_ 
     * @returns {NacosInstanceRegisteryBuilder}
     */
    ip(ip_) {
        this._data.ip = ip_;
        return this;
    }

    /**
     * 实例端口
     * @param {number} port_ 
     * @returns {NacosInstanceRegisteryBuilder}
     */
    port(port_) {
        this._data.port = port_;
        return this;
    }

    /**
     * 实例权重
     * @param {number} weight_ 
     * @returns {NacosInstanceRegisteryBuilder}
     */
    weight(weight_) {
        this._data.weight = weight_;
        return this;
    }

    /**
     * 实例健康状态
     * @param {boolean} healthy_ 
     * @returns {NacosInstanceRegisteryBuilder}
     */
    healthy(healthy_) {
        this._data.healthy = healthy_;
        return this;
    }

    /**
     * 实例是否启用
     * @param {boolean} enabled_ 
     * @returns {NacosInstanceRegisteryBuilder}
     */
    enabled(enabled_) {
        this._data.enabled = enabled_;
        return this;
    }

    /**
     * 实例是否临时实例
     * @param {boolean} ephemeral_ 
     * @returns {NacosInstanceRegisteryBuilder}
     */
    ephemeral(ephemeral_) {
        this._data.ephemeral = ephemeral_;
        return this;
    }

    /**
     * 服务名称
     * @param {string} serviceName_ 
     * @returns {NacosInstanceRegisteryBuilder}
     */
    serviceName(serviceName_) {
        this._data.serviceName = serviceName_;
        return this;
    }

    /**
     * 集群名称
     * @param {string} clusterName_ 
     * @returns {NacosInstanceRegisteryBuilder}
     */
    clusterName(clusterName_) {
        this._data.clusterName = clusterName_;
        return this;
    }

    /**
     * 实例元数据 覆盖
     * @param {Object} metadata_ 
     * @returns {NacosInstanceRegisteryBuilder}
     */
    overrideMetaData(metadata_) {
        this._data.metadata = {};
        this.mergeMetaData(metadata_);
        return this;
    }

    /**
     * 合并元数据
     * @param {Object} metaObj 
     * @returns {NacosInstanceRegisteryBuilder}
     */
    mergeMetaData(metaObj) {
        if (!metaObj) {
            return;
        }
        if (!this._data.metadata) {
            this._data.metadata = {};
        }
        if (typeof metaObj === 'object') {
            for (const [key, val] of Object.entries(metaObj)) {
                if (val && typeof val === "object") {
                    this._data.metadata[key] = JSON.stringify(val);
                } else {
                    this._data.metadata[key] = String(val);
                }
            }
        }
    }

    /**
     * 设置一些默认值
     * @returns {NacosInstanceRegisteryBuilder}
     */
    defaults() {
        if (this._data.weight === undefined) this._data.weight = 1.0;
        if (this._data.healthy === undefined) this._data.healthy = true;
        if (this._data.enabled === undefined) this._data.enabled = true;
        if (this._data.ephemeral === undefined) this._data.ephemeral = true;
        if (!this._data.metadata) this._data.metadata = {};
        if (!this._data.clusterName) this._data.clusterName = NacosConst.DEFAULT_CLUSTER_NAME;

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

    /**
     * 构建注册对象
     * @returns {import("nacos").Instance}
     */
    build() {
        // 设置默认选项
        this.defaults();
        // 必要的字段
        this.validateRequiredFields([
            "ip", "port", "serviceName"
        ]);
        if (!this._data.metadata) {
            this._data.metadata = {};
        }
        return {
            ...this._data
        }
    }

    /**
     * 从对象构建
     * @param {Object} source 
     * @returns {NacosInstanceRegisteryBuilder}
     */
    from(source) {
        if (source && typeof source === "object") {
            Object.assign(this._data, source);
        }
        return this;
    }
}

/**
 * Nacos 服务发现实例构建器
 */
class NacosInstanceDiscoveryBuilder extends NacosInstanceRegisteryBuilder {
    constructor() {
        super();
    }

    /**
     * 实例心跳间隔
     * @param {number} interval_ 
     * @returns {NacosInstanceBuilder}
     */
    instanceHeartBeatInterval(interval_) {
        this._data.instanceHeartBeatInterval = interval_;
    }

    /**
     * 实例心跳超时时间
     * @param {number} timeout_ 
     * @returns {NacosInstanceBuilder}
     */
    instanceHeartBeatTimeOut(timeout_) {
        this._data.instanceHeartBeatTimeOut = timeout_;
    }

    /**
     * 实例 IP 删除超时时间
     * @param {number} timeout_ 
     * @returns {NacosInstanceBuilder}
     */
    ipDeleteTimeout(timeout_) {
        this._data.ipDeleteTimeout = timeout_;
    }

    /**
     * 实例 ID 生成器
     * @param {string} generator_ 
     * @returns {NacosInstanceBuilder}
     */
    instanceIdGenerator(generator_) {
        this._data.instanceIdGenerator = generator_;
    }

    /**
     * 构建注册对象
     * @returns {import("nacos").Host}
     * @override
     */
    build() {
        // 必要的字段
        this.validateRequiredFields([
            "instanceId", "ip", "port", "healthy", "enabled", "weight",
            "ephemeral", "serviceName", "clusterName",
        ]);
        if (!this._data.metadata) {
            this._data.metadata = {};
        }
        return {
            ...this._data
        }
    }
}

/**
 * Nacos 
 */
class NacosInstanceFactory {
    static registeryBuilder() {
        return new NacosInstanceRegisteryBuilder();
    }

    static discoveryBuilder() {
        return new NacosInstanceDiscoveryBuilder();
    }
}

module.exports = {
    NacosInstanceRegisteryBuilder,
    NacosInstanceDiscoveryBuilder,
    NacosInstanceFactory,
}

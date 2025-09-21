"use strict";

/**
 * 注册中心服务实例信息
 */
class RegisteryInfo {
    constructor() {
        /**
         * 服务名称
         * @type {string}
         */
        this.serviceName = "";
        /**
         * 实例 IP
         * @type {string}
         */
        this.ip = "";
        /**
         * 实例端口
         * @type {number}
         */
        this.port = 0;
        /**
         * 实例权重
         * @type {number}
         * @default 1
         * @description 如果权重为 0 则不参与负载均衡
         */
        this.weight = 1;
        /**
         * 实例元数据
         * @type {Object<string, string>}
         */
        this.metadata = {};
    }

    /**
     * 合并元数据
     * @param {Object} metaObj 
     * @returns 
     */
    mergeMetaData(metaObj) {
        if (!metaObj) {
            return;
        }
        if (typeof metaObj === 'object') {
            for (const [key, val] of Object.entries(metaObj)) {
                if (val && typeof val === "object") {
                    this.metadata[key] = JSON.stringify(val);
                } else {
                    this.metadata[key] = String(val);
                }
            }
        }
    }

    setData(obj) {
        this.serviceName = obj.serviceName || "";
        this.ip = obj.ip || "";
        this.port = obj.port || 0;
        this.weight = obj.weight || 1;
        this.mergeMetaData(obj.metadata);
    }
}

/**
 * 注册中心服务实例信息
 */
class ServiceInstance {
    constructor() {
    }
}

module.exports = {
    RegisteryInfo,
    ServiceInstance
}

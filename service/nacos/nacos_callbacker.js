"use strict";

class NacosCallbacker {
    constructor() { }

    /**
     * 服务实例注册回调
     * @param {import("nacos").Host[]} instances 
     */
    async onRegister(instances) {
        void instances;
        console.log('NacosCallbacker onRegister');
    }

    /**
     * 服务实例注销回调
     * @param {import("nacos").Host[]} instances 
     */
    async onDeregister(instances) {
        void instances;
        console.log('NacosCallbacker onDeregister');
    }

    /**
     * 服务实例变更回调
     * @param {import("nacos").Host[]} instances 
     */
    async onServiceChange(instances) {
        void instances;
        console.log('NacosCallbacker onServiceChange');
    }

    async onHeartbeat() {
        console.log('NacosCallbacker onHeartbeat');
    }

    async onConfigChange(dataId_, dataObj_) {
        void dataId_;
        void dataObj_;
        console.log('NacosCallbacker onConfigChange');
    }
}
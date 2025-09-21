"use strict";

class NacosCallbacker {
    constructor() { }

    async onRegister() {
        console.log('NacosCallbacker onRegister');
    }

    async onDeregister() {
        console.log('NacosCallbacker onDeregister');
    }

    async onServiceChange() {
        console.log('NacosCallbacker onServiceChange');
    }

    async onHeartbeat() {
        console.log('NacosCallbacker onHeartbeat');
    }

    async onConfigChange() {
        console.log('NacosCallbacker onConfigChange');
    }
}
"use strict";

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
         * @type {Map<string, NacosNamingInstance>}
         */
        this._instanceMap = new Map();
        /**
         * 实例相等判断函数
         * @type {function(NacosNamingInstance, NacosNamingInstance): boolean}
         */
        this._equalInstance = null;
    }

    /**
     * 默认实例相等判断
     * @param {*} instanceA 
     * @param {*} instanceB 
     */
    _defaultEqualInstance(instanceA, instanceB) {
    }

    /**
     * Nacos 命名服务监听入口路由
     * @param {} hosts 
     */
    watchRouter(hosts) {
        if (!this._fnCaller) {
            throw new Error('NacosNamingWatcher watchRouter fnCaller not exist');
        }
    }
}
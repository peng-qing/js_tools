"use strict";

const NacosConst = require("./ nacos_const.js");
const NacosNamingClient = require("nacos").NacosNamingClient;

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
        // /**
        //  * 服务实例监听者 Map
        //  * @type {Map<string, NacosNamingClient.Watcher>}
        //  */
        this._watcherMap = new Map();
    }

}
"use strict";

const { NacosConfigClient } = require("nacos");
const NacosConst = require("./nacos_const.js");
const { NacosConfigWatcher } = require("./nacos_watcher.js");
const { NacosOptionsFactory } = require("./nacos_options.js");
const { NacosConfigParser, JsonConfigParser } = require("./nacos_config_parser.js");

class NacosConfigService {
    constructor(logger_) {
        /**
         * 日志器
         * @type {console}
         */
        this._logger = logger_ || console;
        /**
         * 配置客户端
         * @type {NacosConfigClient}
         */
        this._configClient = null;
        /**
         * 服务选项
         * @type {Object}
         */
        this._options = null;
        /**
         * 监听器Map
         * @type {Map<string, NacosConfigWatcher>}
         */
        this._watcherMap = new Map();
        /**
         * 默认配置解析器
         * @type {NacosConfigParser}
         */
        this._parser = new JsonConfigParser();
        /**
         * 是否初始化完成
         */
        this._isStartUp = false;
    }

    /**
     * 获取配置客户端
     * @returns {NacosConfigClient}
     */
    getConfigClient() {
        return this._configClient;
    }

    /**
     * 是否初始化完成
     * @returns {boolean}
     */
    isStartUp() {
        return this._isStartUp;
    }

    /**
     * 初始化配置服务
     * @param {import("nacos").ClientOptions} options_ 
     * @param {NacosConfigParser} defaultParser_ 
     */
    async init(options_, defaultParser_ = null) {
        const client = new NacosConfigClient(options_);
        if (defaultParser_) {
            this._parser = defaultParser_;
        }
        this._configClient = client;
        this._options = options_;
        this._isStartUp = true;
        this._logger.info(`[NacosConfigService] init success, options:${JSON.stringify(options_)}`);
    }

    /**
     * 获取配置
     * @param {string} dataId_ dataId
     * @param {string} groupName_ 分组
     * @param {Object} target_ 指定配置解析到目标对象
     * @param {Object} options_ 配置选项 unit/parser
     * @returns {Object}
     */
    async getConfig(dataId_, groupName_ = NacosConst.DEFAULT_GROUP, target_ = null, options_ = {}) {
        if (this.isStartUp()) {
            this._logger.info(`[NacosConfigService] getConfig service not init, dataId: ${dataId_}, groupName: ${groupName_}`);
            return null;
        }
        try {
            const content = await this._configClient.getConfig(dataId_, groupName_, options_);
            if (!content) {
                this._logger?.info(`[NacosConfigService] getConfig content is empty, dataId: ${dataId_}, groupName: ${groupName_}`);
                return null;
            }
            let parser = options_.parser ? options_._parser : this._parser;
            const dataObj = parser.decode(content, target_);
            this._logger?.info(`[NacosConfigService] getConfig success, dataId: ${dataId_}, groupName: ${groupName_}`);
            return dataObj;
        }
        catch (err) {
            this._logger?.error(`[NacosConfigService] getConfig failed, dataId: ${dataId_}, groupName: ${groupName_}, error: ${err}`);
            return null;
        }
    }

    /**
     * 获取一组配置
     * @param {string[]} dataIds_ 
     * @param {string} groupName_ 分组
     * @param {Object} options_ 配置选项 unit/parser
     * @returns {Array<Object>}
     */
    async getMultiConfig(dataIds_, groupName_ = NacosConst.DEFAULT_GROUP, options_ = {}) {
        if (this.isStartUp()) {
            this._logger.info(`[NacosConfigService] getMultiConfig service not init, dataIds_: ${dataIds_}, groupName: ${groupName_}`);
            return [];
        }
        try {
            if (!dataIds_ || !Array.isArray(dataIds_) || dataIds_.length <= 0) {
                this._logger?.warn(`[NacosConfigService] getMultiConfig dataIds is empty, dataIds_: ${dataIds_}, groupName: ${groupName_}`);
                return [];
            }
            const allConfs = [];
            const allContents = await this._configClient.batchGetConfig(dataIds_, groupName_, options_);
            if (!allContents || allContents.length <= 0) {
                this._logger?.info(`[NacosConfigService] getMultiConfig all contents is empty, dataIds_: ${dataIds_}, groupName: ${groupName_}`);
                return [];
            }
            let parser = options_.parser ? options_.parser : this._parser;
            for (const content of allContents) {
                const dataObj = parser.decode(content);
                allConfs.push(dataObj);
            }
            this._logger?.info(`[NacosConfigService] getMultiConfig success, dataIds: ${dataIds_}, groupName: ${groupName_}`);
            return allConfs;
        }
        catch (err) {
            this._logger?.error(`[NacosConfigService] getMultiConfig failed, dataIds: ${dataIds_}, groupName: ${groupName_}, error: ${err}`);
            return [];
        }
    }

    /**
     * 发布配置
     * @param {string} dataId_ 配置ID
     * @param {any} content_ 配置内容
     * @param {string} groupName_ 分组
     * @param {Object} options_ 配置选项 unit/parser
     * @returns {boolean} 是否发布成功
     */
    async publishConfig(dataId_, content_, groupName_ = NacosConst.DEFAULT_GROUP, options_ = {}) {
        try {
            if (!dataId_) {
                this._logger?.warn(`[NacosConfigService] publishConfig params invalid, dataId_: ${dataId_}, groupName_: ${groupName_}`);
                return false;
            }
            let parser = options_.parser ? options_.parser : this._parser;
            const encodeContent = parser.encode(content_);
            this._logger?.info(`[NacosConfigService] publishConfig encode finish, dataId_: ${dataId_}, groupName_: ${groupName_}, encodeContent: ${encodeContent}`);
            return await this._configClient.publishSingle(dataId_, groupName_, encodeContent, options_);
        }
        catch (err) {
            this._logger?.error(`[NacosConfigService] publishConfig failed, dataId_: ${dataId_}, groupName: ${groupName_}, error: ${err}`);
            return false;
        }
    }

    /**
     * 删除配置
     * @param {string} dataId_ 配置ID
     * @param {string} groupName_ 分组
     * @param {Object} options_ 配置选项 unit
     * @returns {boolean} 是否删除成功
     */
    async removeConfig(dataId_, groupName_ = NacosConst.DEFAULT_GROUP, options_ = {}) {
        try {
            if (!dataId_) {
                this._logger?.warn(`[NacosConfigService] removeConfig params invalid, dataId: ${dataId_}, groupName: ${groupName_}`);
                return false;
            }
            this._logger?.info(`[NacosConfigService] removeConfig begin, dataId: ${dataId_}, groupName: ${groupName_}`);
            return await this._configClient.remove(dataId_, groupName_, options_);
        }
        catch (err) {
            this._logger?.error(`[NacosConfigService] removeConfig failed, dataId: ${dataId_}, groupName: ${groupName_}, error: ${err}`);
            return false;
        }
    }

    /**
     * 获取监听Key
     * @param {Object} options_
     * @returns {string}
     */
    _getWatchKey(options_) {
        const prefix = "";
        if (options_.groupName_) {
            prefix += `${options_.groupName}_`;
        }
        if (options_.unit) {
            prefix += `${options_.unit}_`;
        }
        return `${prefix}${options_.dataId}`;
    }

    /**
     * 订阅参数
     * @param {Object} options_ 参考 NacosConfigWatcherOptionsBuilder
     * @param {NacosCallbacker} fnCaller_ 
     * @param {NacosConfigParser|null} parser 
     */
    async subscribe(options_, fnCaller_, parser = null) {
        if (!options_ || !fnCaller_) {
            this._logger?.warn(`[NacosConfigService] watchConfig params invalid`);
            return;
        }
        const builder = NacosOptionsFactory.configWatcherBuilder();
        const options = builder.merge(options_).build();
        // 先获取一下看是否存在 不存在则不监听 如果监听不存在的dataId 会得到 null
        const content = await this.getConfig(options.dataId, options.groupName, options);
        if (!content) {
            this._logger?.error(`[NacosConfigService] watchConfig content is not publish, options: ${JSON.stringify(options)}`);
            return;
        }
        const watchKey = this._getWatchKey(options);
        if (this._watcherMap.get(watchKey)) {
            // 先取消监听 再添加
            this.unSubscribe(options);
        }
        let parser = parser ? parser : this._parser;
        const watcher = new NacosConfigWatcher(watchKey, fnCaller_, options, parser);
        this._watcherMap.set(watchKey, watcher);
        this._configClient.subscribe(options, (content) => {
            watcher.watchRouter(content);
        })
        this._logger?.info(`[NacosConfigService] subscribe success, options: ${JSON.stringify(options)}`);
    }

    /**
     * 取消订阅
     * @param {object} options_ 
     * @returns 
     */
    unSubscribe(options_) {
        if (!options_) {
            this._logger.warn(`[NacosConfigService] unSubscribe params invalid`);
            return;
        }
        const builder = NacosOptionsFactory.configWatcherBuilder();
        const options = builder.merge(options_).build();
        const watchKey = this._getWatchKey(options);
        const watcher = this._watcherMap.get(watchKey);
        if (watcher) {
            // 取消监听
            this._configClient.unSubscribe(options);
            // 删监听器缓存
            this._watcherMap.delete(watchKey);
            this._logger?.info(`[NacosConfigService] unSubscribe success,  options: ${JSON.stringify(options)}`);
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
        await this._configClient.close();
        this._logger?.info(`[NacosConfigService] destroy success...`);
    }
}

module.exports = NacosConfigService;
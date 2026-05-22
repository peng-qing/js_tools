"use strict";

const { MysqlClient } = require("./mysql_client.js");

/**
 * 数据库客户端管理器
 */
class MysqlManager {
    /**
     * 数据库客户端管理器实例
     * @type {MysqlManager}
     */
    static _instance = null;

    constructor() {
        /**
         * 数据库客户端列表
         * @type {Map<String,MysqlClient>}
         */
        this._clients = new Map();
    }

    /**
     * 获取数据库客户端管理器实例
     * @returns {MysqlManager}
     */
    static getInstance() {
        if (!this._instance) {
            this._instance = new MysqlManager();
        }
        return this._instance;
    }

    /**
     * 创建数据库客户端
     * @param {MysqlOptions} options 
     * @returns {MysqlClient}
     */
    createMysqlClient(options) {
        const client = new MysqlClient(options);
        const dbName = client.getName();
        this._clients.set(dbName, client);
        return client;
    }

    /**
     * 获取数据库客户端
     * @param {String} name 
     * @returns {MysqlClient | null}
     */
    getMysqlClient(name) {
        return this._clients.get(name) || null;
    }

    /**
     * 初始化数据库客户端
     * @param {Array<MysqlOptions>} options 
     */
    initMysqlGroups(options) {
        for (const opt of options) {
            this.createMysqlClient(opt);
        }
    }
}


module.exports = {
    MysqlManager,
};
"use strict";

const MysqlClient = require("./mysql_client.js");

class MysqlGroupManager {
    static _instance = null;
    static _clients = new Map();

    static get singleton() {
        if (!this._instance) {
            this._instance = new MysqlGroup();
        }
        return this._instance;
    }

    /**
     * 创建数据库客户端
     * @param {MysqlOptions} options 
     */
    static createMysqlClient(options) {
        const dbClient = new MysqlClient(options);
        const name = dbClient.getName();
        MysqlGroup._clients.set(name, dbClient);
        return dbClient;
    }

    /**
     * 获取数据库客户端
     * @param {String} name 
     * @returns {MysqlClient}
     */
    static getMysqlClient(name) {
        return this._clients.get(name) || null;
    }

    /**
     * 初始化数据库客户端
     * @param {Array<MysqlOptions>} options 
     */
    static initMysqlGroups(options) {
        for (const opt of options) {
            this.createMysqlClient(opt);
        }
    }
}

module.exports = MysqlGroupManager;
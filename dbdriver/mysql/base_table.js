"use strict";

const MysqlClient = require("./mysql_client.js");
const typeUtils = require("../../utils/typeUtils.js");
const MysqlGroupManager = require("./mysql_group_manager.js");

class BaseTable {
    constructor(dbPrefix, tbPrefix, clientName = "default", dbSplit = undefined, tbSplit = undefined) {
        this.dbPrefix = dbPrefix;
        this.tbPrefix = tbPrefix;
        this.dbSplit = dbSplit;
        this.tbSplit = tbSplit;
        this.clientName = clientName;
    }

    /**
     * 获取数据库客户端
     * @returns {MysqlClient}
     */
    getClient() {
        return MysqlGroupManager.getMysqlClient(this.clientName);
    }

    /**
     * 获取数据库名称
     * @param {any} uid 
     * @returns {String}
     */
    getDBName(uid) {
        if (!this.dbSplit) {
            return this.dbPrefix;
        }
        const dbIndex = typeUtils.toNumber(uid) % this.dbSplit;
        return this.clientName + "_" + dbIndex;
    }

    /**
     * 获取表名称
     * @param {any} uid 
     * @returns {String}
     */
    getTableName(uid) {
        if (!this.tbSplit) {
            return this.tbPrefix;
        }
        const tbIndex = typeUtils.toNumber(uid) % this.dbSplit;
        return this.tbPrefix + "_" + tbIndex;
    }

    /**
     * 获取 库名.表名
     * @param {any} uid 
     * @returns 
     */
    getDBTableName(uid) {
        const dbName = this.getDBName(uid);
        const tbName = this.getTableName(uid);
        return `${dbName}.${tbName}`;
    }

    query() {
        this.getClient().query();
    }
}
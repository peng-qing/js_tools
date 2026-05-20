"use strict";

const { MysqlManager } = require("./mysql_manager.js");

/**
 * 数据库表基类
 */
class BaseTable {
    /**
     * 数据库表基类
     * @param {String} dbName 数据库名称
     * @param {String} tbPrefix 表前缀
     * @param {Number} tbSplit 表分片
     */
    constructor(dbName, tbPrefix, tbShardCount = 0) {
        if (!tbPrefix) {
            throw new Error(`invalid table prefix: ${tbPrefix}`);
        }
        const mysqlClient = MysqlManager.getInstance().getMysqlClient(dbName);
        if (!mysqlClient) {
            throw new Error(`not found mysql client: ${dbName}`);
        }

        this.mysqlClient = mysqlClient;
        this.dbPrefix = mysqlClient.getDBPrefix();
        this.dbShardCount = mysqlClient.getDBShardCount();
        this.tbPrefix = tbPrefix;
        this.tbShardCount = tbShardCount;
    }

    /**
     * 获取数据库名称
     * @param {Number} index 数据库分片索引
     * @returns {String}
     */
    getDBName(index) {
        if (this.dbShardCount <= 0) {
            return this.dbPrefix;
        }
        const dbIndex = index % this.dbShardCount;
        // 数据库名称 = 数据库前缀+数据库分片索引
        return `${this.dbPrefix}${dbIndex}`;
    }

    /**
     * 获取表名称
     * @returns {String}
     */
    getTableName(index) {
        if (this.tbShardCount <= 0) {
            return this.tbPrefix;
        }
        const tbIndex = index % this.tbShardCount;
        // 表名称 = 表前缀+表分片索引
        return `${this.tbPrefix}${tbIndex}`;
    }

    /**
     * 获取 库名.表名
     * @param {Number} index 数据库分片索引
     * @returns {String}
     */
    getDBTableName(index) {
        const dbName = this.getDBName(index);
        const tbName = this.getTableName(index);
        return `${dbName}.${tbName}`;
    }

    /**
     * 获取所有数据库表名称
     * @returns {Array<{dbIndex:Number,tbIndex:Number,dbTableName:String}>}
     */
    getAllDBTableNames() {
        const dbTableNames = [];
        const allDBNames = [];
        const allTBNames = [];
        if (this.dbShardCount <= 0) {
            allDBNames.push({ dbName: this.dbPrefix, dbIndex: 0 });
        }
        else {
            for (let i = 0; i < this.dbShardCount; i++) {
                allDBNames.push({ dbName: this.getDBName(i), dbIndex: i });
            }
        }
        if (this.tbShardCount <= 0) {
            allTBNames.push({ tbName: this.tbPrefix, tbIndex: 0 });
        }
        else {
            for (let i = 0; i < this.tbShardCount; i++) {
                allTBNames.push({ tbName: this.getTableName(i), tbIndex: i });
            }
        }
        for (const { dbName, dbIndex } of allDBNames) {
            for (const { tbName, tbIndex } of allTBNames) {
                dbTableNames.push({ dbIndex, tbIndex, dbTableName: `${dbName}.${tbName}` });
            }
        }
        return dbTableNames;
    }

    /**
     * 获取所有数据库表数据
     * @returns {Array<Object>}
     */
    async getAllDBTableData(dbFields = []) {
        let queryFields = "*";
        if (dbFields.length > 0) {
            queryFields = dbFields.join(",");
        }

        const dbTableData = [];
        const allDBTableNames = this.getAllDBTableNames();
        for (const { dbIndex, dbTableName } of allDBTableNames) {
            const sql = `SELECT ${queryFields} FROM ${dbTableName}`;
            const data = await this.mysqlClient.query(dbIndex, sql);
            dbTableData.push(...data);
        }
        return dbTableData;
    }
}

module.exports = {
    BaseTable,
};
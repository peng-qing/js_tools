"use strict";

const mysql = require("mysql2/promise");
const { MysqlOptions } = require("./mysql_options.js");

class MysqlClient {
    /**
     * 数据库配置
     * @type {MysqlOptions}
     */
    options;
    /**
     * 数据库连接池
     * @type {mysql.PoolCluster}
     */
    poolCluster;
    /**
     * 数据库分片索引
     * @type {Map<String,Array<{shardBegin:Number,shardEnd:Number}>>}
     */
    shardIndexs;
    /**
     * 数据库客户端
     * @param {MysqlOptions} options 
     */
    constructor(options) {
        if (!options) {
            throw new Error(`invalid database options`);
        }
        this.options = new MysqlOptions(options);
        this.shardIndexs = new Map();
        this.poolCluster = mysql.createPoolCluster({
            canRetry: this.options.canRetry,
            removeNodeErrorCount: this.options.removeNodeErrorCount,
            restoreNodeTimeout: this.options.restoreNodeTimeout,
            defaultSelector: this.options.defaultSelector,
        });

        let list = [];
        for (const dbConf of this.options.metrics) {
            if (this.options.enableShard) {
                const name = `${this.options.name}_${dbConf.shardBegin}_${dbConf.shardEnd}`
                this.poolCluster.add(name, dbConf);
                list.push({ shardBegin: dbConf.shardBegin, shardEnd: dbConf.shardEnd });
            }
            else {
                this.poolCluster.add(this.options.name, dbConf);
            }
        }
        this.shardIndexs.set(this.options.name, list);
    }

    getName() {
        return this.options.name;
    }

    /**
     * 获取数据库分片前缀
     * @returns {String}
     */
    getDbPrefix() {
        return this.options.dbPrefix;
    }

    /**
     * 获取数据库连接名称
     * @param {Number} index 数据库分片索引
     * @returns {String}
     */
    getConnectionName(index) {
        if (!this.options.enableShard) {
            return this.options.name;
        }
        if (!index) {
            return "";
        }
        let list = this.shardIndexs.get(this.options.name);
        if (!list || list.length <= 0) {
            return "";
        }
        for (let i = 0; i < list.length; i++) {
            const shard = list[i];
            if (index >= shard.shardBegin && index <= shard.shardEnd) {
                return `${this.options.name}_${shard.shardBegin}_${shard.shardEnd}`;
            }
        }
        throw "";
    }

    async getConnection(index) {
        const connectionName = this.getConnectionName(index);
        if (!connectionName) {
            return null;
        }
        return await this.poolCluster.getConnection(connectionName);
    }

    /**
     * 关闭数据库连接池
     */
    async stop() {
        await this.poolCluster.end();
    }

    /**
     * 开启数据库事务
     * @param {Number} index
     * @param {Function} fnTranscation 
     */
    async transction(index, fnTranscation) {
        let conn = null;
        try {
            conn = await this.getConnection(index);
            if (!conn) {
                throw new Error(`invalid database connection`);
            }
            await conn.beginTransaction();
            await fnTranscation(conn);
            await conn.commit();
        }
        catch (err) {
            if (conn) {
                await conn.rollback();
            }
            throw err;
        }
        finally {
            if (conn) {
                conn.release();
            }
        }
    }

    /**
     * 执行数据库语句
     * @param {Number} index 
     * @param {String} sql 
     * @param {Array} params 
     */
    async execute(index, sql, params = []) {
        let conn = null;
        try {
            conn = await this.getConnection(index);
            if (!conn) {
                throw new Error(`invalid database connection`);
            }
            // eslint-disable-next-line no-unused-vars
            const [rows, fields] = await conn.execute(sql, params);
            return rows;
        }
        catch (err) {
            throw err;
        }
        finally {
            if (conn) {
                conn.release();
            }
        }
    }

    /**
     * 执行数据库语句
     * @param {Number} index 
     * @param {String} sql 
     * @param {Array} params 
     */
    async query(index, sql, params = []) {
        let conn = null;
        try {
            conn = await this.getConnection(index);
            if (!conn) {
                throw new Error(`invalid database connection`);
            }
            // eslint-disable-next-line no-unused-vars
            const [rows, fields] = await conn.query(sql, params);
            return rows;
        }
        catch (err) {
            throw err;
        }
        finally {
            if (conn) {
                conn.release();
            }
        }
    }
}

module.exports = MysqlClient;
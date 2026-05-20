"use strict";

const mysql = require("mysql2/promise");
const { MysqlOptions } = require("./mysql_options.js");
const { ConsoleLogger } = require("../common/logger.js");

class MysqlClient {
    /**
     * 数据库客户端
     * @param {MysqlOptions} options 
     * @param {import("../common/logger.js").BaseLogger} logger 
     */
    constructor(options, logger) {
        if (!options) {
            throw new Error(`invalid database options`);
        }
        /**
         * 数据库配置 必须
         * @type {MysqlOptions}
         */
        this.options = new MysqlOptions().normalize(options);
        /**
         * 数据库连接池
         * @type {mysql.PoolCluster}
         */
        this.poolCluster = mysql.createPoolCluster(this.options.toClusterOptions());
        /**
         * 数据库分片索引
         * @type {Map<String,Array<{shardBegin:Number,shardEnd:Number}>>}
         */
        this.shardIndexs = new Map();
        /**
         * 日志器
         * @type {import("../common/logger.js").BaseLogger}
         */
        this.logger = logger || new ConsoleLogger();

        const list = [];
        for (const metricConf of this.options.metrics) {
            if (this.options.enableShard) {
                const shardKey = this._shardIndexKey(this.options.name, metricConf.shardBegin, metricConf.shardEnd);
                this.poolCluster.add(shardKey, metricConf);
                list.push({ shardBegin: metricConf.shardBegin, shardEnd: metricConf.shardEnd });
            }
            else {
                const shardKey = this._shardIndexKey(this.options.name);
                this.poolCluster.add(shardKey, metricConf);
            }
        }
        this.shardIndexs.set(this.options.name, list);

        this.logger.info(`[MysqlClient] initialize database client: ${this.options.name} success...`);
    }

    /**
     * 数据库分片索引键
     * @param {String} dbName 数据库名称
     * @param {Number} shardBegin 数据库分片开始
     * @param {Number} shardEnd 数据库分片结束
     * @returns {String}
     */
    _shardIndexKey(dbName, shardBegin, shardEnd) {
        if (shardBegin !== undefined && shardEnd !== undefined) {
            return `${dbName}_${shardBegin}_${shardEnd}`;
        }
        return dbName;
    }

    /**
     * 获取数据库名称
     * @returns {String}
     */
    getName() {
        return this.options.name;
    }

    /**
     * 获取数据库前缀
     * @returns {String}
     */
    getDBPrefix() {
        return this.options.dbPrefix;
    }

    /**
     * 获取数据库分片数量
     * @returns {Number}
     */
    getShardCount() {
        if (!this.options.enableShard) {
            return 0;
        }
        return this.options.shardCount;
    }

    /**
     * 获取数据库连接名称
     * @param {Number} index 数据库分片索引
     * @returns {String}
     */
    _getConnName(index) {
        if (!this.options.enableShard) {
            return this.options.name;
        }
        if (!index) {
            throw new Error(`invalid database shard index: ${index}`);
        }
        const list = this.shardIndexs.get(this.options.name);
        if (!list || list.length <= 0) {
            throw new Error(`not found valid shard list: ${this.options.name}`);
        }
        for (const shard of list) {
            if (index >= shard.shardBegin && index <= shard.shardEnd) {
                return this._shardIndexKey(this.options.name, shard.shardBegin, shard.shardEnd);
            }
        }
        throw new Error(`not found valid shard index: ${index}`);
    }

    /**
     * 获取数据库连接根据分片索引
     * @param {Number} index 数据库分片索引
     * @returns {Promise<mysql.PoolConnection>}
     */
    async getConnByIndex(index) {
        let finalIndex = index;
        if (typeof index === "bigint") {
            finalIndex = Number(index % BigInt(this.getShardCount() || 1));
        }
        if (!Number.isFinite(finalIndex)) {
            throw new Error(`invalid database shard index: ${index}, finalIndex: ${finalIndex}`);
        }
        const connName = this._getConnName(finalIndex);
        if (!connName) {
            throw new Error(`not found valid connection name: ${index}, finalIndex: ${finalIndex}`);
        }
        return await this.poolCluster.getConnection(connName);
    }

    /**
     * 关闭数据库连接池
     */
    async shutdown() {
        await this.poolCluster.end();
        this.logger.info(`[MysqlClient] shutdown database client: ${this.options.name} success...`);
    }

    /**
     * 转义字符串
     * @param {String} val 
     * @returns {String}
     */
    async escape(val) {
        if (typeof val !== "string") {
            val = JSON.stringify(val);
        }
        return mysql.escape(val);
    }

    /**
     * 执行数据库语句
     * @param {Number} index 数据库分片索引
     * @param {String} sql 数据库语句
     * @param {Array} params 数据库语句参数
     * @param {Boolean} logFields 是否记录字段
     * @returns {Promise<Array>}
     * @description 会执行预处理语句，并返回执行结果
     */
    async execute(index, sql, params = [], logFields = false) {
        let conn = null;
        try {
            conn = await this.getConnByIndex(index);
            if (!conn) {
                throw new Error(`invalid database connection`);
            }
            const results = await conn.execute(sql, params);
            if (logFields) {
                return results;
            }
            return results[0];
        }
        catch (err) {
            const rowSql = err.sql ? err.sql : mysql.format(sql, params);
            this.logger.error(`[MysqlClient] execute database sql: ${rowSql} failed, error: ${err?.message}, stack: ${err?.stack}`);
            throw err;
        }
        finally {
            if (conn && conn.release) {
                conn.release();
            }
        }
    }

    /**
     * 执行数据库查询
     * @param {Number} index 数据库分片索引
     * @param {String} sql 数据库查询语句
     * @param {Array} params 数据库查询参数
     * @returns {Promise<Array>}
     * @description 客户端处理查询语句，并返回查询结果
     */
    async query(index, sql, params = [], logFields = false) {
        let conn = null;
        try {
            conn = await this.getConnByIndex(index);
            if (!conn) {
                throw new Error(`invalid database connection`);
            }
            const results = await conn.query(sql, params);
            if (logFields) {
                return results;
            }
            return results[0];
        }
        catch (err) {
            const rowSql = err.sql ? err.sql : mysql.format(sql, params);
            this.logger.error(`[MysqlClient] query database sql: ${rowSql} failed, error: ${err?.message}, stack: ${err?.stack}`);
            throw err;
        }
        finally {
            if (conn && conn.release) {
                conn.release();
            }
        }
    }

    /**
     * 执行数据库事务
     * @param {Number} index 数据库分片索引
     * @param {Function} handler 数据库事务处理函数
     * @example
     *  await mysqlClient.transactionOperators(index, async (conn) => {
     *      // 1. 获取锁 锁行确保存在!!!
     *      await conn.query("SELECT 1 FROM table WHERE id = ? FOR UPDATE", [id]);
     *      // 2. 执行其他操作 不需要在回调里进行事务提交 会自动提交的
     *      await conn.query("INSERT INTO table (column) VALUES (?)", [value]);
     *  });
     */
    async transactionOperators(index, handler) {
        let conn = null;
        try {
            conn = await this.getConnByIndex(index);
            if (!conn) {
                throw new Error(`invalid database connection`);
            }
            await conn.beginTransaction();
            await handler(conn);
            await conn.commit();
        }
        catch (err) {
            if (conn && conn.rollback) {
                await conn.rollback();
            }
            this.logger.error(`[MysqlClient] transaction database shard index: ${index} failed, error: ${err?.message}, stack: ${err?.stack}`);
            throw err;
        }
        finally {
            if (conn && conn.release) {
                conn.release();
            }
        }
    }
}

module.exports = {
    MysqlClient,
};
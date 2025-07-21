"use strict";

class MysqlOptions {
    /**
     * 数据库配置名称
     * @type {String}
     */
    name;
    /**
     * 数据库描述
     * @type {String}
     */
    desc;
    /**
     * 是否分片
     * @type {Boolean}
     */
    enableShard;
    /**
     * 数据库分片前缀
     * @type {String}
     */
    dbPrefix;
    /**
     * 数据库连接配置
     * @type {Array<MysqlConfig>}
     */
    metrics;
    /**
     * 数据库连接重试 默认true
     * @type {Boolean}
     */
    canRetry;
    /**
     * 数据库连接重试次数 默认5
     * @type {Number}
     */
    removeNodeErrorCount;
    /**
     * 数据库连接重试超时 默认100ms
     * @type {Number}
     */
    restoreNodeTimeout;
    /**
     * 数据库连接重试选择器 默认RR
     * 默认 RR Round-Robin 轮询
     * 可选 RANDOM 随机
     * 可选 ORDER 顺序 选择第一个存活节点
     */
    defaultSelector;
    constructor(options) {
        if (!options) {
            throw new Error(`invalid database options`);
        }
        this.name = options.name || "default";
        this.desc = options.desc || "";
        this.enableShard = options.enableShard || false;
        this.canRetry = options.canRetry || true;
        this.removeNodeErrorCount = options.removeNodeErrorCount || 5;
        this.restoreNodeTimeout = options.restoreNodeTimeout || 100;
        if (options.defaultSelector) {
            this.defaultSelector = options.defaultSelector.toUpperCase();
        }
        this.defaultSelector = this.defaultSelector || "RR";
        if (this.enableShard) {
            this.dbPrefix = options.dbPrefix || "";
        }
        if (!options.metrics || !Array.isArray(options.metrics)) {
            throw new Error(`invalid database metrics`);
        }
        this.metrics = options.metrics.map(connection => new MysqlConfig(connection)) || [];
    }
}

class MysqlConfig {
    /** 主机 */
    host;
    /** 端口 */
    port;
    /** 用户名 */
    user;
    /** 密码 */
    password;
    /** 字符集 */
    charset;
    /** 连接池限制 */
    connectionLimit;
    /** 队列限制 */
    queueLimit;
    /** 等待连接 */
    waitForConnections;
    /** 最大闲置连接数 */
    maxIdle;
    /** 数据库分片开始 */
    shardBegin;
    /** 数据库分片结束 */
    shardEnd;
    constructor(dbConf) {
        if (!dbConf) {
            throw new Error(`invalid database config`);
        }
        this.host = dbConf.host || "localhost";
        this.port = dbConf.port || 3306;
        this.user = dbConf.user || "root";
        this.password = dbConf.password || "";
        this.charset = dbConf.charset || 'utf-8';
        this.connectionLimit = dbConf.connectionLimit || 1;
        this.queueLimit = dbConf.queueLimit || 0;
        this.waitForConnections = dbConf.waitForConnections || true;
        this.maxIdle = dbConf.maxIdle ? dbConf.maxIdle : this.connectionLimit;
        this.shardBegin = options.shardBegin || 0;
        this.shardEnd = options.shardEnd || 0;
    }
}

exports.MysqlConfig = MysqlConfig;
exports.MysqlOptions = MysqlOptions;
"use strict";

/**
 * 数据库配置
 * @class MysqlOptions
 */
class MysqlOptions {
    constructor() {
        /**
         * 数据库配置名称
         * @type {String}
         * @default default
         */
        this.name = "default";
        /**
         * 数据库描述
         * @type {String}
         * @default ""
         */
        this.desc = "";
        /**
         * 是否分片
         * @type {Boolean}
         * @default false
         */
        this.enableShard = false;
        /**
         * 数据库分片数量
         * @type {Number}
         * @default 0
         */
        this.shardCount = 0;
        /**
         * 数据库分片前缀
         * @type {String}
         * @default ""
         */
        this.dbPrefix = "";
        /**
         * 数据库连接配置
         * @type {Array<MysqlConfig>}
         * @default []
         */
        this.metrics = [];
        /**
         * 数据库连接重试 默认true
         * @type {Boolean}
         * @default true
         */
        this.canRetry = true;
        /**
         * 数据库连接重试次数 默认5
         * @type {Number}
         * @default 5
         */
        this.removeNodeErrorCount = 5;
        /**
         * 数据库连接重试超时 默认100ms 单位ms
         * @type {Number}
         * @default 100
         */
        this.restoreNodeTimeout = 100;
        /**
         * 数据库连接重试选择器 默认RR
         * @type {String}
         * @default "RR"
         * 默认 RR Round-Robin 轮询
         * 可选 RANDOM 随机
         * 可选 ORDER 顺序 选择第一个存活节点
         */
        this.defaultSelector = "RR";
    }

    normalize(options) {
        if (!options) {
            throw new Error("invalid database options");
        }
        if (!options.metrics || !Array.isArray(options.metrics)) {
            throw new Error("invalid database metrics");
        }
        options.name && (this.name = options.name);
        options.desc && (this.desc = options.desc);
        options.enableShard && (this.enableShard = !!options.enableShard);
        options.dbPrefix && (this.dbPrefix = options.dbPrefix);
        this.canRetry = !!options.canRetry;
        this.removeNodeErrorCount = options.removeNodeErrorCount;
        this.restoreNodeTimeout = options.restoreNodeTimeout;
        options.defaultSelector && (this.defaultSelector = options.defaultSelector.toUpperCase());
        for (const metricObj of options.metrics) {
            const metrics = new MysqlMetrics().normalize(metricObj);
            this.metrics.push(metrics);
            this.shardCount += metrics.shardEnd - metrics.shardBegin + 1;
        }

        return this;
    }

    /**
     * 转换为连接池集群配置
     * @returns {Object}
     */
    toClusterOptions() {
        return {
            canRetry: this.canRetry,
            removeNodeErrorCount: this.removeNodeErrorCount,
            restoreNodeTimeout: this.restoreNodeTimeout,
            defaultSelector: this.defaultSelector,
        };
    }
}

/**
 * 数据库连接配置
 * @class MysqlMetrics
 */
class MysqlMetrics {
    constructor() {
        /** 
         * 主机
         * @type {String}
         * @default "localhost"
         */
        this.host = "localhost";
        /** 
         * 端口
         * @type {Number}
         * @default 3306
         */
        this.port = 3306;
        /** 
         * 用户名
         * @type {String}
         * @default "root"
         */
        this.user = "root";
        /** 
         * 密码
         * @type {String}
         * @default ""
         */
        this.password = "";
        /** 
         * 字符集
         * @type {String}
         * @default "utf-8"
         */
        this.charset = "utf-8";
        /** 
         * 连接池限制
         * @type {Number}
         * @default 1
         */
        this.connectionLimit = 1;
        /** 
         * 队列限制
         * @type {Number}
         * @default 0
         */
        this.queueLimit = 0;
        /** 
         * 等待连接
         * @type {Boolean}
         * @default true
         */
        this.waitForConnections = true;
        /** 
         * 最大闲置连接数
         * @type {Number}
         * @default connectionLimit
         */
        this.maxIdle = this.connectionLimit;
        /** 
         * 数据库分片开始
         * @type {Number}
         * @default 0
         */
        this.shardBegin = 0;
        /** 
         * 数据库分片结束
         * @type {Number}
         * @default 0
         */
        this.shardEnd = 0;
        /** 
         * 连接超时时间 替换旧版 acquireTimeout 单位ms
         * @type {Number}
         * @default 10000 单位ms
         */
        this.connectionTimeout = 10000;
    }

    normalize(options) {
        if (!options) {
            throw new Error("invalid database metrics");
        }
        options.host && (this.host = options.host);
        options.port && (this.port = options.port);
        options.user && (this.user = options.user);
        options.password && (this.password = options.password);
        options.charset && (this.charset = options.charset);
        options.connectionLimit && (this.connectionLimit = options.connectionLimit);
        options.queueLimit && (this.queueLimit = options.queueLimit);
        this.waitForConnections = !!options.waitForConnections;
        this.maxIdle = options.maxIdle ? options.maxIdle : this.connectionLimit;
        options.shardBegin && (this.shardBegin = options.shardBegin);
        options.shardEnd && (this.shardEnd = options.shardEnd);
        if (this.shardBegin > this.shardEnd) {
            // 交换分片开始和结束
            [this.shardBegin, this.shardEnd] = [this.shardEnd, this.shardBegin];
        }
        options.connectionTimeout && (this.connectionTimeout = options.connectionTimeout);

        return this;
    }
}

module.exports = {
    MysqlOptions,
    MysqlMetrics,
};

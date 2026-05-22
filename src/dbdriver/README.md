# dbdriver

数据库驱动封装层，对 [mysql2](https://github.com/sidorares/node-mysql2) 做统一配置、连接管理与常用操作封装。模块采用 **CommonJS**（`require`），与项目 `package.json` 中 `"type": "commonjs"` 一致。

| 模块 | 路径 | 说明 |
|------|------|------|
| MySQL | `mysql/` | 连接池集群、分片路由、事务、表名解析 |

## 目录结构

```
dbdriver/
└── mysql/
    ├── mysql_options.js   # MysqlOptions / MysqlMetrics 配置
    ├── mysql_client.js    # MysqlClient 连接池与 SQL 执行
    ├── mysql_manager.js   # MysqlManager 多库单例管理
    └── base_table.js      # BaseTable 库表分片命名
```

---

## MySQL

基于 `mysql2/promise` 的 `PoolCluster`，支持多节点连接池、按分片索引路由、以及库表级分片命名辅助。

### 依赖与引入

```javascript
const { MysqlOptions } = require("./src/dbdriver/mysql/mysql_options.js");
const { MysqlClient } = require("./src/dbdriver/mysql/mysql_client.js");
const { MysqlManager } = require("./src/dbdriver/mysql/mysql_manager.js");
const { BaseTable } = require("./src/dbdriver/mysql/base_table.js");
```

### 配置（MysqlOptions）

`MysqlOptions` 描述一组逻辑库（`name`），其下可挂多个物理连接（`metrics`）。开启 `enableShard` 后，每个 `metrics` 项通过 `shardBegin` / `shardEnd` 声明负责的分片区间，由 `MysqlClient` 注册到 `PoolCluster` 的不同节点名上。

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `name` | string | `"default"` | 逻辑库名，管理器中的唯一键 |
| `desc` | string | `""` | 描述 |
| `enableShard` | boolean | `false` | 是否按分片索引选连接 |
| `dbPrefix` | string | `""` | 逻辑库名前缀（供 `BaseTable` 拼库名） |
| `metrics` | array | 必填 | 连接配置列表，见 `MysqlMetrics` |
| `canRetry` | boolean | `true` | 集群节点失败是否重试 |
| `removeNodeErrorCount` | number | `5` | 移除节点前的连续错误次数 |
| `restoreNodeTimeout` | number | `100` | 恢复节点间隔（ms） |
| `defaultSelector` | string | `"RR"` | 节点选择：`RR` / `RANDOM` / `ORDER` |

`MysqlMetrics` 单条连接字段（与 mysql2 池选项对齐）：

| 字段 | 默认 | 说明 |
|------|------|------|
| `host` | `"localhost"` | 主机 |
| `port` | `3306` | 端口 |
| `user` / `password` | `"root"` / `""` | 账号 |
| `charset` | `"utf-8"` | 字符集 |
| `connectionLimit` | `1` | 池大小 |
| `queueLimit` | `0` | 等待队列上限 |
| `waitForConnections` | `true` | 池满时是否排队 |
| `maxIdle` | 同 `connectionLimit` | 最大空闲连接 |
| `connectionTimeout` | `10000` | 连接超时（ms） |
| `shardBegin` / `shardEnd` | `0` | 分片区间（`enableShard` 时有效） |

**单库、不分片示例：**

```javascript
const options = {
    name: "main",
    enableShard: false,
    metrics: [
        {
            host: "127.0.0.1",
            port: 3306,
            user: "app",
            password: "secret",
            connectionLimit: 10,
        },
    ],
};
```

**分片示例（两个物理库各管一段 shard 索引）：**

```javascript
const options = {
    name: "user_db",
    enableShard: true,
    dbPrefix: "user_db_",
    metrics: [
        { host: "10.0.0.1", shardBegin: 0, shardEnd: 99, connectionLimit: 10 },
        { host: "10.0.0.2", shardBegin: 100, shardEnd: 199, connectionLimit: 10 },
    ],
};
```

### MysqlClient

构造时根据 `options` 创建 `PoolCluster`，并建立分片索引表。

| 方法 | 说明 |
|------|------|
| `getName()` | 逻辑库名 |
| `getDBPrefix()` | 库名前缀 |
| `getShardCount()` | 分片总数（未开启分片时为 `0`） |
| `getConnByIndex(index)` | 按分片索引取 `PoolConnection`（支持 `bigint`，会取模） |
| `execute(index, sql, params?, logFields?)` | 预处理执行，默认返回 `rows` |
| `query(index, sql, params?, logFields?)` | 普通查询，默认返回 `rows` |
| `transactionOperators(index, handler)` | 事务：`handler(conn)` 内自行 `query`，成功自动 `commit`，失败 `rollback` |
| `escape(val)` | 字符串转义 |
| `shutdown()` | 关闭连接池 |

**分片索引约定：** 未开启分片时，`index` 可传任意值，路由到唯一节点；开启分片时，`index` 须落在某条 `metrics` 的 `[shardBegin, shardEnd]` 内，否则抛错。

**事务示例：**

```javascript
await client.transactionOperators(shardIndex, async (conn) => {
    await conn.query("SELECT 1 FROM orders WHERE id = ? FOR UPDATE", [orderId]);
    await conn.query("UPDATE orders SET status = ? WHERE id = ?", ["paid", orderId]);
});
```

### MysqlManager

进程内单例，按 `name` 管理多个 `MysqlClient`。

```javascript
const manager = MysqlManager.getInstance();

// 注册一个或多个库
manager.initMysqlGroups([options1, options2]);

// 或单独创建
const client = manager.createMysqlClient(options);

// 按名称获取
const same = manager.getMysqlClient("user_db");
```

业务表类应通过管理器解析客户端，而不是自行 `new MysqlClient`（与 `BaseTable` 约定一致）。

### BaseTable

在已注册的 `MysqlClient` 之上，根据 `dbPrefix`、表前缀与分片数量生成 `库名.表名`，并支持扫全部分片组合查询。

```javascript
class UserTable extends BaseTable {
    constructor() {
        super("user_db", "t_user_", 16); // dbName, 表前缀, 表分片数（0 表示不分表）
    }

    async findByUid(uid) {
        const sql = `SELECT * FROM ${this.getDBTableName(uid)} WHERE uid = ?`;
        return this.mysqlClient.query(uid, sql, [uid]);
    }
}

// 使用前必须先 initMysqlGroups / createMysqlClient
MysqlManager.getInstance().initMysqlGroups([userDbOptions]);
const table = new UserTable();
```

| 方法 | 说明 |
|------|------|
| `getDBName(index)` | 逻辑库名（有库分片时为 `dbPrefix + (index % dbShardCount)`） |
| `getTableName(index)` | 表名（有表分片时为 `tbPrefix + (index % tbShardCount)`） |
| `getDBTableName(index)` | `` `${db}.${table}` `` |
| `getAllDBTableNames()` | 库表笛卡尔积列表 |
| `getAllDBTableData(dbFields?)` | 对所有分片执行 `SELECT` 并合并结果 |

命名规则：`index` 一般取用户 ID、订单 ID 等业务主键，与 `MysqlClient.getConnByIndex` 使用同一套分片语义。

---

## 设计说明

- **MySQL 分片两层含义：** `MysqlClient` 的 `metrics` 决定**连哪台库**；`BaseTable` 的 `dbPrefix` / `tbPrefix` 决定**库表字符串名**。业务侧应保证同一 `index` 在两层的取模规则一致。
- **日志：** `MysqlClient` 构造时可注入 `logger`（见 `src/common/logger.js`），默认 `ConsoleLogger`；SQL 失败会记录格式化后的语句。
- **与 REFACTOR.md：** 更大范围的命名统一、表基类 `query` 封装等规划见仓库根目录 [REFACTOR.md](../../REFACTOR.md) 第 5.3 节。

## 外部依赖

| 包 | 用途 |
|----|------|
| `mysql2` | MySQL 连接池与协议 |

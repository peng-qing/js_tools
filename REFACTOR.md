# js_tools 重构文档

> 文档生成日期：2026-04-16  
> 项目路径：`d:\MyGitProject\js_tools`

---

## 一、项目现状总览

当前项目包含 **26 个文件**，分布在 5 个功能目录中：

```
js_tools/
├── common/          module_reloader.cjs, singleton.js
├── dbdriver/mysql/  base_table.js, mysql_client.js, mysql_group_manager.js, mysql_options.js
├── graphic/         matrix.js, vector.js
├── service/nacos/   nacos_agent.js, nacos_callbacker.js, nacos_config_parser.js,
│                    nacos_config_service.js, nacos_const.js, nacos_meta.js,
│                    nacos_naming_service.js, nacos_options.js, nacos_watcher.js
└── utils/           envUtils.js, randomUtils.js, tickerUtils.js, timeUtils.js, typeUtils.js
```

---

## 二、现存 Bug 清单（优先级最高）

在重构前，必须修复以下代码逻辑错误：

### 2.1 Nacos 模块

| 文件 | 行号 | 问题描述 |
|---|---|---|
| `nacos_options.js` | 51 | `validateRequiredFields` 中用 `this._data[field]` 但数据存于 `this._options`，应改为 `this._options[field]` |
| `nacos_options.js` | 391/440 | `NacosConfigWatcherOptionsBuilder` 和 `NacosAgentOptionsBuilder` 的构造函数缺少 `super()` 调用 |
| `nacos_options.js` | 565 | `this._options.weight === 1.0` 使用了比较运算符 `===` 而非赋值 `=` |
| `nacos_options.js` | 525/540 | `subscribes()` 和 `watchKeys()` 的提前 `return` 语句缺少 `return this`，链式调用中断 |
| `nacos_naming_service.js` | 130/148 | `registerInstance` 和 `deregisterInstance` 中使用了未定义的 `instance` 变量，应为 `registeryObj_` |
| `nacos_naming_service.js` | 154 | `deregisterInstance` 内部错误调用了 `registerInstance` 方法，应调用 `deregisterInstance` |
| `nacos_naming_service.js` | 226 | `checkRegistered` 中 `this.getAllServiceInstances(...)` 漏写了 `await` |
| `nacos_watcher.js` | 127 | 删除实例循环写的是 `this._instanceMap.values()` 后做解构 `[instanceId, cacheInstance]`，应使用 `.entries()` |
| `nacos_agent.js` | 67 | 调用 `this._namingService.init(...)` 但实际方法名为 `initConfiguration` |
| `nacos_config_service.js` | 全局 | `_getWatchKey` 使用 `const prefix = ""` 后对其 `+=` 赋值，`const` 不可重新赋值，应改为 `let` |
| `nacos_config_service.js` | 219 | `subscribe` 方法中 `let parser = parser ? parser : ...` 存在变量遮蔽（参数名与局部变量同名） |

### 2.2 MySQL 模块

| 文件 | 行号 | 问题描述 |
|---|---|---|
| `mysql_options.js` | 111-112 | `MysqlConfig` 构造函数中使用 `options.shardBegin/shardEnd`，应为 `dbConf.shardBegin/shardEnd` |
| `mysql_group_manager.js` | 12/23 | `singleton` getter 和 `createMysqlClient` 中调用的是未定义的 `MysqlGroup`，应为 `MysqlGroupManager` |
| `base_table.js` | 47 | `getTableName` 中计算表索引时用了 `this.dbSplit`，应使用 `this.tbSplit` |

### 2.3 Graphic 模块

| 文件 | 行号 | 问题描述 |
|---|---|---|
| `vector.js` | 225 | `static normalize()` 静态方法签名缺少参数 `dimension_`，方法体内直接使用了未定义的变量 |
| `vector.js` | 139-145 | `static sub()` 将 `result` 初始化为全 0 后对每个向量做 `-= dim`，导致第一个向量被减两次，应从第一个向量拷贝初始化 |
| `matrix.js` | 163 | `Matrix.sum` 中 `matrix_.rows !== matrix_.rows` 是与自身比较（恒为 false），应为 `matrix_.rows !== otherMatrix_.rows` |

---

## 三、项目结构优化

### 3.1 当前结构问题

1. **`package.json` 中 `main: "index.js"` 但根目录没有该文件**，导致 `require("js_tools")` 会报错
2. **`module_reloader.cjs` 使用 `.cjs` 扩展名**，但 `package.json` 已声明 `"type": "commonjs"`，项目内所有 `.js` 文件默认即为 CJS，扩展名冗余且不一致
3. **缺少统一的模块出口**，各子模块没有各自的 `index.js` 桶文件，使用方需要深度路径引入
4. **`common/` 目录定位模糊**，`singleton.js` 是设计模式工具，`module_reloader.cjs` 是 Node.js 运行时工具，两者放在一起不够清晰
5. **缺少单元测试目录**

### 3.2 推荐目录结构

```
js_tools/
├── src/                             ← 将源码统一移至 src/
│   ├── common/
│   │   ├── singleton.js
│   │   ├── module_reloader.js       ← 去掉 .cjs 后缀，统一 .js
│   │   └── index.js                 ← 桶文件，统一导出
│   │
│   ├── dbdriver/
│   │   └── mysql/
│   │       ├── mysql_client.js
│   │       ├── mysql_group_manager.js
│   │       ├── mysql_options.js
│   │       ├── base_table.js
│   │       └── index.js
│   │
│   ├── graphic/
│   │   ├── vector.js
│   │   ├── matrix.js
│   │   └── index.js
│   │
│   ├── service/
│   │   └── nacos/
│   │       ├── nacos_agent.js
│   │       ├── nacos_callbacker.js
│   │       ├── nacos_config_parser.js
│   │       ├── nacos_config_service.js
│   │       ├── nacos_const.js
│   │       ├── nacos_meta.js
│   │       ├── nacos_naming_service.js
│   │       ├── nacos_options.js
│   │       ├── nacos_watcher.js
│   │       └── index.js
│   │
│   ├── utils/
│   │   ├── type_utils.js            ← 文件名风格统一（snake_case）
│   │   ├── time_utils.js
│   │   ├── random_utils.js
│   │   ├── ticker_utils.js
│   │   ├── env_utils.js
│   │   └── index.js
│   │
│   └── index.js                     ← 项目总入口
│
├── test/                            ← 单元测试目录（新增）
│   ├── utils/
│   ├── graphic/
│   ├── dbdriver/
│   └── service/
│
├── package.json
├── REFACTOR.md
└── README.md
```

### 3.3 桶文件示例

**`src/utils/index.js`**

```javascript
"use strict";
module.exports = {
    typeUtils:   require("./type_utils"),
    timeUtils:   require("./time_utils"),
    randomUtils: require("./random_utils"),
    tickerUtils: require("./ticker_utils"),
    envUtils:    require("./env_utils").envUtils,
    ENV:         require("./env_utils").ENV,
    OS:          require("./env_utils").OS,
};
```

**`src/index.js`**

```javascript
"use strict";
module.exports = {
    utils:    require("./utils"),
    graphic:  require("./graphic"),
    common:   require("./common"),
    dbdriver: require("./dbdriver/mysql"),
    nacos:    require("./service/nacos"),
};
```

---

## 四、代码风格统一化

### 4.1 文件命名

当前项目文件命名风格混用：

| 现状 | 问题 | 建议 |
|---|---|---|
| `typeUtils.js`、`timeUtils.js` | camelCase 风格 | 统一使用 **snake_case**，与 nacos 系列保持一致 |
| `module_reloader.cjs` | `.cjs` 扩展名冗余 | 改为 `.js` |
| `nacos_config_service.js` | snake_case 风格 | 维持此风格，全项目统一 |

**建议：全部文件名使用 `snake_case`：**

- `typeUtils.js` → `type_utils.js`
- `timeUtils.js` → `time_utils.js`
- `randomUtils.js` → `random_utils.js`
- `tickerUtils.js` → `ticker_utils.js`
- `envUtils.js` → `env_utils.js`

### 4.2 参数命名风格

当前代码中尾随下划线命名（`val_`、`options_`）使用不完全一致：

```javascript
// 现状混用
function getDBName(uid)                           // base_table.js 无下划线
async registerInstance(registeryObj_, groupName_) // nacos 有下划线
```

建议统一**去掉尾随下划线**（JavaScript 社区主流约定，对 IDE 类型推断更友好）：

```javascript
// 统一后
function getDBName(uid)
async registerInstance(registeryObj, groupName)
```

### 4.3 导出风格统一

当前项目存在三种导出写法，应统一：

```javascript
// 写法1：单个默认导出（大多数文件）
module.exports = SomeClass;

// 写法2：命名导出（对象字面量）
module.exports = { ClassA, ClassB };

// 写法3：旧式 exports 属性赋值（mysql_options.js）
exports.MysqlConfig = MysqlConfig;
exports.MysqlOptions = MysqlOptions;
```

**建议统一使用写法2**（`module.exports = { ... }` 命名导出），原因：
- 可扩展性更强，后续新增导出内容不需要修改调用方
- 通过解构引入 `const { MysqlClient } = require("./mysql_client")` 更清晰
- 便于 IDE 自动补全

### 4.4 错误处理策略

当前错误处理策略不一致：

- `vector.js` / `matrix.js`：抛出异常
- `nacos_naming_service.js`：返回 `false` + 打日志
- `mysql_client.js`：重新抛出异常
- `base_table.js`：既无返回也无抛出（`query()` 方法未完整实现）

建议明确按分层处理：

```
┌─────────────────────────────────────────────────────┐
│ utils / graphic（纯工具函数）                         │
│  → 参数无效：throw Error，快速失败，无副作用           │
├─────────────────────────────────────────────────────┤
│ dbdriver / service（有副作用的 IO 操作）               │
│  → 内部 try/catch，记录日志                           │
│  → 业务错误返回 false / null / []                     │
│  → 不可恢复错误（如初始化失败）向上抛出               │
└─────────────────────────────────────────────────────┘
```

### 4.5 注释规范

当前注释整体质量较好（JSDoc 风格），但存在以下问题：

- 部分方法注释描述与实现不符（如 `deregisterInstance` 的注释说的是注册行为）
- `graphic/` 模块内的注释有冗余叙述（"向量求和的几何意义是..."），可以保留精简版
- 建议参数统一使用 `@param {Type} name` 格式，去掉尾随下划线

---

## 五、各模块具体重构建议

### 5.1 `utils/typeUtils.js`

**问题：** `toNumber` 使用了 `crypto` 模块，职责超出"类型检测"范畴。

**建议：** 将 `toNumber` 拆分到独立的 `utils/hash_utils.js`：

```
utils/
├── type_utils.js   ← 纯类型判断（isNumber, isString, isClass...）
├── hash_utils.js   ← toNumber / hash 相关（依赖 crypto）
├── time_utils.js
├── random_utils.js
├── ticker_utils.js
└── env_utils.js
```

### 5.2 `common/singleton.js`

两种单例实现可以保留，但需补充清晰的使用示例：

```javascript
// singleton 函数：对已有类做 Proxy 装饰
const SingletonFoo = singleton(Foo);
new SingletonFoo() === new SingletonFoo(); // true

// Singleton 基类：适用于继承场景
class MyService extends Singleton { }
const inst = MyService.getInstance(MyService);
```

### 5.3 `dbdriver/mysql/`

**`mysql_group_manager.js` 重构要点：**

1. 修复类名引用错误（`MysqlGroup` → `MysqlGroupManager`）
2. `singleton` getter 不应再直接暴露，可改用静态初始化模式
3. 建议通过构造函数注入 logger，与 Nacos 模块风格对齐

**`base_table.js` 补全 `query` 方法：**

```javascript
async execute(uid, sql, params = []) {
    const client = this.getClient();
    const dbIndex = typeUtils.toNumber(uid) % (this.dbSplit || 1);
    return client.execute(dbIndex, sql, params);
}

async query(uid, sql, params = []) {
    const client = this.getClient();
    const dbIndex = typeUtils.toNumber(uid) % (this.dbSplit || 1);
    return client.query(dbIndex, sql, params);
}
```

**`mysql_client.js` 的无效 try-catch 清理：**

```javascript
// 现状（无意义的重抛）
async execute(index, sql, params = []) {
    try { ... }
    catch (err) { throw err; } // ← 与不写 try-catch 等价
    finally { ... }
}

// 建议：在 catch 中补充日志后重抛，或直接去掉 try-catch
async execute(index, sql, params = []) {
    const conn = await this.getConnection(index);
    if (!conn) throw new Error("invalid database connection");
    try {
        const [rows] = await conn.execute(sql, params);
        return rows;
    } finally {
        conn.release();
    }
}
```

### 5.4 `service/nacos/`

**初始化方法命名不一致：**

- `NacosNamingService` 初始化方法：`initConfiguration`
- `NacosConfigService` 初始化方法：`init`（推测）
- `NacosAgent` 调用的是：`init`

建议统一方法名为 **`init`**（简洁，语义足够清晰）。

**`NacosOptionsBuilder.validateRequiredFields` Bug 修复：**

```javascript
// 修复：this._data → this._options
validateRequiredFields(fields) {
    for (const field of fields) {
        if (this._options[field] === undefined) {
            throw new Error(`Required field '${field}' is missing`);
        }
    }
}
```

**`NacosConfigWatcherOptionsBuilder` / `NacosAgentOptionsBuilder` 补充 `super()`：**

```javascript
class NacosConfigWatcherOptionsBuilder extends NacosOptionsBuilder {
    constructor() {
        super(); // ← 必须添加，否则 this._options 未初始化
        this._validateFields = ["dataId"];
    }
}
```

**`NacosCallbacker` 基类完善：** 当前方法体全是 `console.log`，改为空实现（子类覆盖）：

```javascript
class NacosCallbacker {
    async onRegister(instances) { }
    async onDeregister(instances) { }
    async onServiceChange(instances) { }
    async onHeartbeat() { }
    async onConfigChange(dataId, dataObj) { }
}
```

**`NacosConfigService._getWatchKey` 修复：**

```javascript
// 现状（const 无法重赋值）
_getWatchKey(options_) {
    const prefix = "";
    if (options_.groupName_) { prefix += `${options_.groupName_}_`; } // ← 运行时报错
}

// 修复
_getWatchKey(options_) {
    let prefix = "";
    if (options_.groupName_) { prefix += `${options_.groupName_}_`; }
    if (options_.unit) { prefix += `${options_.unit}_`; }
    return `${prefix}${options_.dataId}`;
}
```

### 5.5 `graphic/`

**`Vector.static sub()` 逻辑修复：**

```javascript
// 现状（从全 0 开始，第一个向量的维度被减，而不是作为初始值）
static sub(...vectors) {
    const result = Array(dimension).fill(0);
    vectors.forEach(vec => { result[index] -= dim; });
}

// 修复（从第一个向量初始化，后续向量依次相减）
static sub(...vectors) {
    // ... 参数校验 ...
    const result = [...vectors[0].dimensions];
    for (let i = 1; i < vectors.length; i++) {
        vectors[i].dimensions.forEach((dim, index) => { result[index] -= dim; });
    }
    return new Vector(...result);
}
```

**`Vector.static normalize()` 签名修复：**

```javascript
// 现状（缺少参数声明）
static normalize() {
    return new Vector(...Array(dimension_).fill(1)); // dimension_ 未定义
}

// 修复
static normalize(dimension) {
    dimension = Number(dimension);
    if (!typeUtils.isInteger(dimension) || dimension <= 0) {
        throw new Error("dimension must be a positive integer");
    }
    const val = 1 / Math.sqrt(dimension);
    return new Vector(...Array(dimension).fill(val));
}
```

---

## 六、工程化改进

### 6.1 添加 ESLint

当前项目没有 ESLint 配置（`mysql_client.js` 中出现了手动 `// eslint-disable-next-line` 注释，说明曾经有 ESLint 但现在配置缺失）。

建议添加 `.eslintrc.json`：

```json
{
  "env": { "node": true, "es2022": true },
  "extends": ["eslint:recommended"],
  "parserOptions": { "ecmaVersion": 2022 },
  "rules": {
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-var": "error",
    "prefer-const": "error",
    "eqeqeq": ["error", "always"],
    "no-console": "warn"
  }
}
```

### 6.2 添加测试框架

当前 `package.json` 的 `test` 脚本是占位符，建议引入 `jest`：

```json
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/"
  },
  "devDependencies": {
    "jest": "^29.x"
  }
}
```

优先补充测试的模块（按收益排序）：

1. `utils/type_utils.js` — 纯函数，最易测试
2. `graphic/vector.js` — 含多个刚修复的 Bug，回归测试最重要
3. `graphic/matrix.js`
4. `common/singleton.js`
5. `dbdriver/mysql/` — 需要 mock mysql2

### 6.3 完善 `package.json`

```json
{
  "name": "js_tools",
  "version": "1.0.0",
  "description": "A collection of JS utility tools",
  "main": "src/index.js",
  "type": "commonjs",
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/"
  },
  "engines": {
    "node": ">=16.0.0"
  },
  "keywords": ["utils", "nacos", "mysql", "graphic"],
  "dependencies": {
    "mysql2": "^3.14.2",
    "nacos": "^2.6.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "eslint": "^8.0.0"
  }
}
```

### 6.4 统一 Logger 接口

Nacos 模块通过构造函数注入 `logger`，MySQL 模块没有 logger。建议在 `common/` 中定义最小 Logger 接口：

```javascript
// src/common/logger.js
class BaseLogger {
    info(msg) { console.info(msg); }
    warn(msg) { console.warn(msg); }
    error(msg) { console.error(msg); }
    debug(msg) { console.debug(msg); }
}

module.exports = { BaseLogger };
```

所有需要日志的模块（MySQL、Nacos）均通过构造函数注入，默认使用 `BaseLogger`，方便接入业务方的 `winston` / `log4js` 等第三方日志库。

---

## 七、重构优先级总结

| 优先级 | 工作项 | 理由 |
|---|---|---|
| **P0** | 修复 Bug 清单（第二节所有条目） | 存在运行时崩溃风险 |
| **P0** | 创建 `src/index.js` 根入口文件 | `package.json` 的 `main` 字段指向不存在的文件 |
| **P1** | 统一导出风格为 `module.exports = {}` | 影响所有使用方的引入方式 |
| **P1** | `module_reloader.cjs` 重命名为 `.js` | 保持模块系统一致性 |
| **P1** | 添加 ESLint 配置 | 防止未来引入新 Bug，自动化代码规范检查 |
| **P2** | 各子目录添加 `index.js` 桶文件 | 改善外部使用体验 |
| **P2** | 工具函数文件名统一为 `snake_case` | 代码风格一致性 |
| **P2** | 完善 `package.json` 中 engines / scripts 等字段 | 工程规范 |
| **P3** | 补充单元测试（jest） | 验证 Bug 修复，建立回归基线 |
| **P3** | `typeUtils` 拆分 `toNumber` 到 `hash_utils.js` | 单一职责原则 |
| **P3** | 统一 Logger 接口（`BaseLogger`） | 可观测性提升，降低业务方接入成本 |
| **P3** | 去除参数尾随下划线，统一命名风格 | 代码可读性和 IDE 友好性 |

# common

基础组件模块，提供运行时热更新和单例管理能力。

| 模块 | 文件 | 说明 |
|------|------|------|
| ESMModuleHotReloader | `module_hot_reloader.mjs` | ESM 模块热重载器 |
| CommonJSModuleHotReloader | `module_hot_reloader.cjs` | CommonJS 模块热重载器 |
| Singleton | `singleton.js` | 单例模式（继承式 + Proxy 式） |

选择建议：

- ESM 项目使用 `ESMModuleHotReloader`。
- CommonJS 项目使用 `CommonJSModuleHotReloader`。
- 直接导出函数时，两种热更器都需要通过 `createHotReloadFunction()` 创建稳定包装器，并在文件变更后调用对应 reload 方法刷新内部缓存。
- 热更适合修改方法逻辑，不适合修改对象身份、私有槽结构、复杂继承拓扑或内置对象行为。

---

## ESMModuleHotReloader

轻量级 ESM 模块热重载器，支持在不重启进程的情况下动态更新类定义和导出函数。适用于长期运行的 Node.js 服务进行运行时代码热更新。

### 原理

ESM 的模块缓存无法像 CommonJS 那样通过 `delete require.cache` 清除。本模块采用两个核心策略：

**1. Query String Cache Busting —— 强制重新加载模块**

```javascript
import('file:///path/to/module.js?v=1')  // 首次
import('file:///path/to/module.js?v=2')  // 热更（Node.js 视为全新模块）
```

每次热更递增版本号，绕过 ESM 缓存机制。代价是旧模块无法被 GC（但热更不频繁，可接受）。

**2. 原型链替换 —— 让已有实例获得新行为**

加载新模块后，将新类的方法/getter/setter 通过 `Object.defineProperty` 写入旧类的 prototype 和静态属性上。由于所有实例共享同一个 prototype，替换后立即生效，无需重新创建实例。

行为合并策略：
- 方法、getter/setter → 替换为新版本
- 静态数据属性 → 旧类已有 truthy 值时保留旧值，否则使用新值
- 实例数据属性 → 不主动迁移；旧实例继续保留自身已有字段
- 模块级闭包变量（如 `let suffix = "v2"`）→ 使用新模块中的值

### 使用方式

要求 ESM 环境（`package.json` 中 `"type": "module"`）。

```javascript
import { ESMModuleHotReloader } from "./src/common/module_hot_reloader.mjs";
```

**热更整个模块（推荐）**

```javascript
// 修改文件后触发热更，模块内所有导出的类自动完成原型链替换
await ESMModuleHotReloader.reloadModule("./my_service.js");
```

首次调用时会自动扫描并注册模块中所有导出的类，后续调用直接执行热更。

**热更单个类**

```javascript
await ESMModuleHotReloader.reloadClass("./my_service.js", "MyService");
```

**手动注册 + onLoad 回调**

```javascript
ESMModuleHotReloader.classDef("./my_service.js", MyService, (cls, isReload) => {
    if (isReload) {
        // 热更后的自定义逻辑
    }
});
```

**导出函数热更**

普通导出函数没有 prototype 中间层，需要通过包装器实现：

```javascript
const add = await ESMModuleHotReloader.createHotReloadFunction("./math.js", "add");
add(1, 2); // 每次调用自动使用最新版本
```

函数包装器本身不会监听文件变化，需要在文件变更后调用 `reloadModule()` 或 `reloadURL()`，使 `_moduleCacheMap` 指向最新模块。

### 支持场景

| 场景 | 支持 | 备注 |
|------|:---:|------|
| 实例方法 | ✅ | |
| 静态方法 | ✅ | |
| Getter / Setter | ✅ | |
| 继承关系 | ⚠️ | 只 patch 已导出/已注册类；未导出的父类不会被单独捕获 |
| 单例（继承式 / Proxy 式） | ✅ | 配合 `singleton.js` |
| 不同文件同名类 | ✅ | 通过 `fileUrl#className` 区分 |
| 新增方法 | ✅ | |
| 删除方法 | ⚠️ | 旧方法残留在原型链上 |
| 导出函数 | ✅ | 需 `createHotReloadFunction` |
| instanceof | ✅ | 对已注册的稳定旧类引用成立 |
| `#private` 私有字段/私有方法 | ❌ | 无法对旧实例完成私有槽迁移 |

### `#private` 私有成员限制

`#fields`（类私有字段）和私有方法属于语言级私有槽（brand），与类定义强绑定。热更时即使新模块已加载并完成原型链替换，旧实例仍持有旧类定义的私有槽，无法被新类定义接管或迁移。

这意味着：

- 涉及 `#private` 结构变更（新增/删除/重命名）时，旧实例不能无缝升级。
- 依赖私有槽语义的方法在跨版本调用时可能出现不兼容行为。

建议：

- 可迁移的运行时状态尽量放在可控容器（普通字段、`WeakMap`）中。
- 对私有结构发生变化的版本，采用“重建实例”或“重启进程”策略。
- 热更阶段尽量避免修改 `#private` 结构，仅修改不依赖私有槽布局的公有逻辑。

### ESM 限制

- 每次热更会用新的 query string import 新模块，旧模块记录无法主动从 Node ESM 缓存中删除。
- `reloadModule()` 只会扫描模块导出的类。父类如果没有导出，也没有手动注册，就不会被独立 patch。
- 当前属性扫描使用 `Object.getOwnPropertyNames()`，不会通用热更 Symbol 属性。
- 删除方法时旧原型上的方法可能残留。

### 示例

参考 [test/esmReload](../../test/esmReload/) 中的 HTTP 服务示例：

```bash
cd test/esmReload && node index.js
```

```bash
# 调用接口
curl "http://localhost:3000/process?handlerName=callBasicService"

# 修改 basic.js 后触发热更
curl "http://localhost:3000/reload?filePath=./basic.js"

# 再次调用（返回新版本结果，实例状态保留）
curl "http://localhost:3000/process?handlerName=callBasicService"
```

### 路径格式

支持以下输入，内部统一归一化为 `file://` URL：

- `./my_service.js` （相对路径）
- `/path/to/my_service.js` （绝对路径）
- `file:///path/to/my_service.js` （file URL）
- `file:///path/to/my_service.js?v=1` （自动去除 query string）

---

## CommonJSModuleHotReloader

CommonJS 模块热重载器，适用于 `require()` / `module.exports` 模块。它通过删除 `require.cache` 重新加载模块，再把新模块中的方法、getter、setter patch 回旧引用，从而让已有实例继续使用新逻辑。

### 原理

CommonJS 可以通过 `delete require.cache[require.resolve(file)]` 让下一次 `require(file)` 重新执行模块文件。但重新执行会生成新的导出对象：

```javascript
const User1 = require("./user.cjs");
delete require.cache[require.resolve("./user.cjs")];
const User2 = require("./user.cjs");

User1 === User2; // false
```

如果服务中已有旧引用和旧实例，直接使用新导出会导致引用分裂，典型问题是：

```javascript
const user = new User1();
user instanceof User2; // false
```

因此本模块采用三个步骤：

1. 热更前缓存旧的 `module.exports` 引用。
2. 删除 `require.cache` 并重新 `require()` 得到新导出。
3. 把新导出的行为 patch 到旧引用上，并将 `require.cache[requirePath].exports` 回写为旧引用。

这样后续 `require()` 仍拿到稳定旧引用，但旧引用已经拥有新版本方法。

### 使用方式

```javascript
const { CommonJSModuleHotReloader } = require("./src/common/module_hot_reloader.cjs");

CommonJSModuleHotReloader.reloadURL("./my_service.cjs");
```

当前实现会先用 `path.resolve(fileUrl)` 判断文件是否存在，因此应传入真实文件路径，例如 `./my_service.cjs` 或 `./my_service.js`。暂不支持只传 `./my_service` 再依赖 Node 自动补扩展名。

直接导出普通函数时，函数引用无法原地替换，需要使用包装器：

```javascript
// math.cjs
module.exports = function add(a, b) {
    return a + b;
};
```

```javascript
const add = CommonJSModuleHotReloader.createHotReloadFunction("./math.cjs");

add(1, 2); // 每次调用都会读取最新函数
CommonJSModuleHotReloader.reloadURL("./math.cjs");
add(1, 2); // 调用热更后的函数
```

函数包装器只保持一个稳定调用入口；真正的最新函数由 `reloadURL()` 更新到 `_plainFuncCaches`。

### 支持场景

| 场景 | 支持 | 备注 |
|------|:---:|------|
| `module.exports = class User {}` | ✅ | patch 旧类构造函数和 prototype，并回写 `require.cache.exports` |
| 类实例导出 | ✅ | patch 实例 constructor 对应的类原型 |
| 继承类 | ✅ | 递归 patch static 继承链和 prototype 继承链 |
| 普通对象导出 | ✅ | patch own properties，运行时数据按旧值优先保留 |
| 直接函数导出 | ✅ | 需 `createHotReloadFunction` |
| Proxy 单例导出 | ✅ | 需 `InjectSingleton` 写入 `Symbol.for("raw_class")` |
| Getter / Setter | ✅ | 使用 `Object.defineProperty` 替换描述符 |
| 新增方法 | ✅ | 新方法会写入旧引用 |
| 删除方法 | ⚠️ | 旧方法可能残留 |
| `instanceof` | ✅ | 依赖旧引用回写保持稳定 |
| Symbol 属性 | ⚠️ | 当前暂不热更，避免本地 Symbol 造成状态分裂 |
| 数组 / Date / Map / Set 等内置对象实例 | ⚠️ | 当前可能被 fallback 当作普通对象处理，不建议作为热更导出边界 |
| primitive 值导出 | ❌ | 例如 number/string/boolean/null/undefined，无法原地 patch |

### Proxy 单例

`InjectSingleton()` 返回的是一个 function proxy，它不是 `class`，但仍然可以通过 `new` 调用。因此热更器不能把它误判为普通函数导出。

本模块使用统一协议字段：

```javascript
Symbol.for("raw_class")
```

`singleton.js` 会把原始类挂到 Proxy 上：

```javascript
proxy[Symbol.for("raw_class")] = targetClass;
```

热更时会读取旧 Proxy 和新 Proxy 背后的原始类，并 patch 旧原始类的 prototype。由于最后 `require.cache.exports` 回写为旧 Proxy，旧单例闭包中的 `instance` 也会被保留。

预期效果：

```javascript
const Service = require("./singleton.cjs");
const first = new Service();

CommonJSModuleHotReloader.reloadURL("./singleton.cjs");

const LatestService = require("./singleton.cjs");

LatestService === Service;       // true
new LatestService() === first;   // true
first.show();                    // 新版本方法
```

### 注意事项

**1. 路径 key**

内部业务缓存使用 `path.resolve(fileUrl)` 作为 key，`require.cache` 操作使用 `require.resolve(absPath)` 拿 Node 真实缓存 key。

**2. `require.cache` 回写**

类、对象、实例、Proxy 单例导出完成 patch 后，会把 `require.cache[requirePath].exports` 指回旧导出，避免新旧引用分裂。直接函数导出不会回写旧函数，因为函数本身无法原地 patch。

**3. 数据保留策略**

- 方法、getter、setter：使用新版本。
- 旧对象上已有 own 数据属性：保留旧值。
- 旧对象上不存在该数据属性：使用新值。

当前实现使用 `Object.hasOwn()` 判断属性是否存在，因此 `0`、`false`、`""`、`null` 这类 falsy 值也会被当作已有运行时状态保留。

**4. Symbol 属性**

当前属性扫描使用 `Object.getOwnPropertyNames()`，不会热更 Symbol 属性。这样可以避免重新加载模块后本地 Symbol 不同导致同一对象上堆积新旧 Symbol 状态。`Symbol.for("raw_class")` 是 Proxy 热更协议字段，通过专门逻辑读取，不依赖通用属性扫描。

**5. 内置对象导出边界**

数组、Date、Map、Set 等内置对象实例不适合作为热更导出边界。它们的行为主要来自内置 prototype，不应该被热更器递归 patch。更稳妥的设计是只支持 class、class instance、plain object、Proxy class 和 direct function wrapper。

当前实现的 fallback 仍会把部分对象按属性处理，因此数组导出可能出现元素被覆盖的现象。这属于实现边界，不建议依赖；后续应在进入 fallback 前限制为 plain object。

**6. 静默失败**

属性替换内部会捕获 `Object.defineProperty` 或赋值错误并跳过。不可配置、只读或不兼容属性可能热更失败但不中断流程。排查热更不生效时，应优先检查属性描述符。

**7. `CommonJSModulePatchReloader`**

`module_hot_reloader.cjs` 当前导出了 `CommonJSModulePatchReloader`，但该类仍是占位实现；生产使用请使用 `CommonJSModuleHotReloader`。

### 示例

参考 [test/commonjsReload](../../test/commonjsReload/) 中的 HTTP 服务示例：

```bash
node test/commonjsReload/index.cjs
```

查看完整操作说明：

```bash
curl "http://localhost:3001/process?handlerName=getGuide"
```

常用流程：

```bash
# 调用旧版本
curl "http://localhost:3001/process?handlerName=callBasicService"

# 修改 test/commonjsReload/basic.cjs 后触发热更
curl "http://localhost:3001/reload?filePath=basic.cjs"

# 再次调用，观察 hello/staticVersion 和 identity 字段
curl "http://localhost:3001/process?handlerName=callBasicService"
```

Proxy 单例测试：

```bash
curl "http://localhost:3001/process?handlerName=callSingletonService"
curl "http://localhost:3001/reload?filePath=singleton.cjs"
curl "http://localhost:3001/process?handlerName=callSingletonService"
```

预期：

```json
{
  "proxyIdentityStable": true,
  "instanceIdentityStable": true,
  "rawClassExists": true,
  "show": "singleton show v2",
  "latestInstanceShow": "singleton show v2"
}
```

---

## Singleton

提供两种单例模式实现，兼容 ESM / CommonJS 热更新器。

### 继承式

```javascript
import { Singleton } from "./src/common/singleton.js";

class MyService extends Singleton {
    // ...
}

MyService.getInstance(); // 始终返回同一实例
```

CommonJS:

```javascript
const { Singleton } = require("./src/common/singleton.js");

class MyService extends Singleton {
    // ...
}

module.exports = MyService;
```

### Proxy 式

```javascript
import { InjectSingleton } from "./src/common/singleton.js";

class MyRawService { /* ... */ }
export const MyService = InjectSingleton(MyRawService);

new MyService(); // 始终返回同一实例
```

CommonJS:

```javascript
const { InjectSingleton } = require("./src/common/singleton.js");

class MyRawService {
    // ...
}

module.exports = InjectSingleton(MyRawService);
```

Proxy 式通过 `Symbol.for("raw_class")` 暴露原始类引用，使热更系统能定位并替换原型链上的方法。

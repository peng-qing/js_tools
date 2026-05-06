# common

基础组件模块，提供通用的底层能力。

| 模块 | 文件 | 说明 |
|------|------|------|
| ESMModuleHotReloader | `module_hot_reloader.mjs` | ESM 模块热重载器 |
| Singleton | `singleton.js` | 单例模式（继承式 + Proxy 式） |

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

状态保留策略：
- 方法、getter/setter → 替换为新版本
- 静态数据属性、实例数据属性 → 保留旧值（不丢失运行时状态）
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

### 支持场景

| 场景 | 支持 | 备注 |
|------|:---:|------|
| 实例方法 | ✅ | |
| 静态方法 | ✅ | |
| Getter / Setter | ✅ | |
| 继承关系 | ✅ | 父类热更后子类自动继承 |
| 单例（继承式 / Proxy 式） | ✅ | 配合 `singleton.js` |
| 不同文件同名类 | ✅ | 通过 `fileUrl#className` 区分 |
| 新增方法 | ✅ | |
| 删除方法 | ⚠️ | 旧方法残留在原型链上 |
| 导出函数 | ✅ | 需 `createHotReloadFunction` |
| instanceof | ✅ | 热更后判断结果不变 |
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

## Singleton

提供两种单例模式实现，均兼容 `ESMModuleHotReloader` 热更新。

### 继承式

```javascript
import { Singleton } from "./src/common/singleton.js";

class MyService extends Singleton {
    // ...
}

MyService.getInstance(); // 始终返回同一实例
```

### Proxy 式

```javascript
import { InjectSingleton } from "./src/common/singleton.js";

class MyRawService { /* ... */ }
export const MyService = InjectSingleton(MyRawService);

new MyService(); // 始终返回同一实例
```

Proxy 式通过 `Symbol.for("raw_class")` 暴露原始类引用，使热更系统能定位并替换原型链上的方法。

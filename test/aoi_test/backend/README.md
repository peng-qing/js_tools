# Backend 实现说明

## 请求流程

```text
POST /api/evaluate
    → readJson（1 MiB 限制）
    → normalizeScenario（类型、范围、GUID 唯一性）
    → evaluateScenario
        → 直接加载 src/aoi
        → 创建 Backend、Manager、实体、Shape、Policy、Interest
        → 执行 Manager.update
        → 分别取得 interest / policy / shape 三组结果
    → JSON response
```

每个请求创建独立 `AoiManager`，这是有意的无状态设计。它使同一场景始终
产生可重复结果，也避免浏览器取消请求后在服务器遗留一半更新的 Manager。
此页面测试的是单次 AOI 计算，不用于压力测试长生命周期对象。

服务端接受以下 Backend 标识：

| 请求值 | 实际实例 | 专用参数 |
|---|---|---|
| `grid` | `GridBackend` | `gridSize`、服务端查询网格上限 |
| `cross-linked-list` | `CrossLinkedListBackend` | 无 |
| `brute` | `BruteBackend` | 无 |

Backend 通过明确的 `switch` 创建，不对未知值进行默认回退。这样新增页面选项
但遗漏服务端接入时会立即暴露错误，而不会静默使用 `BruteBackend`。

## 安全和边界

- 服务只监听 `127.0.0.1`；
- JSON 请求体最大 1 MiB；
- 目标数量最多 500；
- GUID 需要满足有限字符集且同场景唯一；
- Flags 按 `src/aoi` 当前 Number 位运算边界限制为 uint32；
- `mapExtent` 定义以原点为中心的 X/Z 世界半尺寸，并用于创建 WorldBounds；
- 地图大小不限制 Shape 查询范围，Shape 可以延伸到地图之外，但地图外不会
  存在实体；
- 静态文件使用 `path.relative` 检查，禁止读取 `front` 之外的文件；
- 响应禁用缓存，避免调试期间使用旧脚本。

## 为什么返回三条验证路径

完整 interest 为空不一定表示 Shape 错误。可能的故障层次包括：

```text
Backend 候选错误
Shape.contains 错误
HeightRange / FlagFilter 错误
InterestEntity 状态未保存
AoiManager update 没有刷新正确对象
```

因此 evaluator 同时调用 Manager interest、Policy 和 Shape 查询。辅助结果
仍然全部来自 `src/aoi`，不是测试服务自行实现的几何判断。

需要注意，`scenario_evaluator.js` 会捕获被测实现运行时异常并放入
`diagnostics`。参数格式错误则直接返回 HTTP 400，因为这属于无效测试输入，
而不是被测 AOI 的运行结果。

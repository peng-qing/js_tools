# src/aoi 实时测试台

该目录提供一个零第三方依赖的本地网页测试工具，测试对象严格指向
`src/aoi`，不会加载仓库根目录旧的 `aoi` 实现。

## 目录结构

```text
test/aoi_test/
├── front/                     浏览器页面
│   ├── index.html             页面语义结构
│   ├── styles.css             响应式地图与控制面板样式
│   ├── app.js                 场景状态、拖拽、请求并发和渲染
│   └── README.md              前端实现说明
├── backend/                   Node.js 测试服务
│   ├── source_aoi.js          src/aoi 统一导入入口
│   ├── scenario_validation.js HTTP 场景校验和规范化
│   ├── scenario_evaluator.js  真实 AOI 场景构建与诊断
│   ├── http_utils.js          有大小限制的 JSON 请求处理
│   ├── static_files.js        防路径穿越的静态文件服务
│   ├── server.js              HTTP 路由和启动入口
│   └── README.md              后端实现说明
```

## 启动页面

在仓库根目录执行：

```bash
node test/aoi_test/backend/server.js
```

浏览器打开：

```text
http://127.0.0.1:4273
```

也可以指定端口：

```bash
node test/aoi_test/backend/server.js 5000
```

## 三组结果的意义

| 结果 | 调用路径 | 用途 |
|---|---|---|
| Manager interest | `addInterestWithPolicy → update → queryInterestGuids` | 验证完整 AOI 生命周期 |
| Policy 直接匹配 | `SpatialInterestPolicy.matchesDistance` | 隔离 Policy、HeightRange 和 FlagFilter |
| Shape 即时查询 | `AoiManager.query(shape, center)` | 隔离 Backend 粗筛与 Shape.contains |

前端不会自己计算目标是否可见。如果三组结果不一致，页面会显示诊断信息，
方便判断问题属于 Backend、Policy 还是 Manager interest 状态维护。

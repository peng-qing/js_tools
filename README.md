# js_tools

JavaScript 工具库

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/peng-qing/js_tools)

## 目录结构

```text
src/
├── aoi                 // AOI（兴趣区域）框架
│   ├── backend         // 空间索引后端
│   ├── geometry        // 几何和值对象
│   ├── policy          // 兴趣策略
│   └── shapes          // 视野形状
├── common              // 基础组件
│   ├── module_hot_reloader.mjs  // ESM 模块热重载器
│   ├── module_hot_reloader.cjs  // CommonJS 模块热重载器
│   └── singleton.js             // 单例模式实现
├── dbdriver            // 数据库驱动封装
│   └── mysql           // mysql2 连接池、分片、BaseTable
└── utils               // 工具函数
```

## 模块文档

| 模块 | 说明 |
|------|------|
| [aoi](./src/aoi/README.md) | AOI 实体管理、兴趣策略、几何查询与空间索引 |
| [common](./src/common/README.md) | 基础组件（热重载、单例等） |
| [dbdriver](./src/dbdriver/README.md) | MySQL 驱动（连接池、分片、BaseTable） |
| utils | 随机数、Ticker 与类型工具 |

## License

[MIT](./LICENSE)

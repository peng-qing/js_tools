# Nacos Service

Nacos 服务封装

## 关于Nacos

Nacos 是一个动态服务发现、配置管理和服务管理平台。它提供了一组简单易用的 RESTful API，用于发现、配置和管理微服务。
需要注意的是，在官方 `nacos-sdk-nodejs`的sdk中并未提供使用 `grpc` 的方法，如有需要，可以参考使用 `nacos-sdk-rust-binding-node`。

使用时需要对Nacos的服务组织结构有一定了解，例如Namespace、Service、Instance等概念。

- `NameSpace`，默认值为 `public`，可以在Nacos控制台中创建新的Namespace。
- `Group`，默认值为 `DEFAULT_GROUP`，可以在Nacos控制台中创建新的Group。
- `Service`，每个Service对应一个微服务，例如 `user-service`、`order-service`等。
- `Cluster`，默认值为 `DEFAULT`，可以在Nacos控制台中创建新的Cluster。
- `Instance`，每个Instance对应一个微服务的实例，例如 `user-service-1`、`user-service-2`等。

Nacos官方文档：https://nacos.io/zh-cn/docs/concepts.html
Nacos OpenAPI：https://nacos.io/zh-cn/docs/open-api.html


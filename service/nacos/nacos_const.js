"use strict";

const NacosConst = {};

// 默认集群名称
NacosConst.DEFAULT_CLUSTER_NAME = 'DEFAULT';
// 默认组名称
NacosConst.DEFAULT_GROUP = 'DEFAULT_GROUP';

// nacos 服务状态
NacosConst.SERVER_STATUS = {
    UP: 'UP', // 正常
    DOWN: 'DOWN', // 下线
}

// Nacos 监听结果变更类型
NacosConst.WATCH_NOTIFY_TYPE = {
    ADD: 'ADD',         // 新增
    UPDATE: 'UPDATE',   // 更新
    DELETE: 'DELETE',   // 删除
}

module.exports = NacosConst;

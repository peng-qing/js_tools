# Front 实现说明

## 状态模型

`app.js` 只维护一个可 JSON 序列化的场景对象：

```text
scenario
├── backend / gridSize
├── observer
├── targets[]
└── policy
```

几何类和 Policy 不在浏览器中实例化。每次变化都会把场景发送给服务端，
由服务端使用 `src/aoi` 创建真实对象。这样测试页面不会产生一套与被测代码
不同的判断逻辑。

## Backend 切换

页面支持在同一场景输入下切换三种真实 Backend：

- `GridBackend`：XZ 均匀网格索引，需要配置 `gridSize`；
- `CrossLinkedListBackend`：分别维护按 X、Z 排序的十字链表，不使用
  `gridSize`；
- `BruteBackend`：直接返回全部实体作为候选，用于小规模正确性对照。

选择 Backend 后，前端会把对应标识随完整场景发送给服务端并重新计算。
只有选择 `GridBackend` 时 Grid Size 输入框才可编辑，其他 Backend 下该参数
保留在场景对象中但不会参与实例化。

## 坐标转换与拖拽

主地图是跟随观察者的局部摄像机。摄像机使用当前 Shape 的 X/Z 最大半尺寸
作为基准，显示其三倍区域：

```text
cameraHalfExtent = clamp(shapeMaxHalfExtent * 3, 5, mapExtent)
```

实体标记和文字会按摄像机范围同步缩放，因此大地图不会让对象缩成难以点击
的小点。全局缩略图悬浮在主视图右上角，不额外占用页面纵向空间，始终显示
完整地图、全部实体以及橙色摄像机覆盖框；点击缩略图中的实体可以直接选中
它。窄屏下缩略图会自动缩小，并隐藏次要说明文字。

拖拽时通过 `getScreenCTM().inverse()` 把浏览器像素转换成 SVG 世界坐标，
然后将 X/Z 限制在当前“地图 X/Z 半尺寸”对应的范围内。修改地图半尺寸会
同步调整全局缩略图、坐标输入边界和服务端 WorldBounds；Y 只能通过右侧
输入框修改。

## 请求并发

连续拖动会产生大量输入事件。前端通过两层机制避免响应乱序：

1. 40ms debounce 合并高频变化；
2. 新请求使用 `AbortController` 取消旧请求，并用递增 sequence 丢弃仍然
   返回的过期响应。

## 颜色语义

- 蓝色：观察者；
- 绿色：真实 Manager interest；
- 黄色：Policy 直接匹配，但尚未出现在 Manager interest；
- 灰色：Policy 未匹配。

地图还使用两种范围线型：

- 半透明蓝色实线范围：当前 Shape 的可视化轮廓；
- 黄色虚线矩形：`Shape.getQueryBoundsXZ()` 返回给 Backend 的粗筛包围盒。
- 橙色矩形：全局缩略图中主摄像机当前覆盖的 X/Z 区域。

黄色状态对排查 interest 生命周期尤其重要。它说明几何与过滤规则认为目标
应该可见，但 Manager 当前维护的关系没有包含它。

## 前端能力边界

- 地图只展示 X/Z 平面，Y 通过数值字段修改；
- 点击“添加目标”时，目标的 X/Z 会在当前地图完整范围内独立随机，保留
  一位小数；Y 默认设为 0；
- 图形轮廓用于帮助观察，不作为最终判定依据；
- ENTER/LEAVE 文本是浏览器对相邻两次 Manager interest 的差分；
- 服务端返回的 `notifications` 是 `src/aoi` 自身产生的通知，保留在响应中供
  调试，但当前页面没有把它与前端差分混合显示；
- 页面不持久化场景，刷新或点击重置都会恢复默认数据。

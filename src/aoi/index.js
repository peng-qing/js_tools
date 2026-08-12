"use strict";

/**
 * AOI 框架公共导出入口。
 *
 * 业务代码应优先从本文件导入公共类型，避免依赖 src/aoi 内部目录结构。
 * 内部文件以后可以重构，只要本文件维持兼容，调用方就不需要调整导入路径。
 */

const AoiManager = require("./aoi_manager.js");

const AbstractBackend = require("./backend/abstract_backend.js");
const BruteBackend = require("./backend/brute_backend.js");
const GridBackend = require("./backend/grid_backend.js");

const PositionEntity = require("./entity/position_entity.js");
const InterestEntity = require("./entity/interest_entity.js");

const Position = require("./geometry/position.js");
const HeightRange = require("./geometry/height_range.js");
const { HalfExtentXZ, HalfExtent3D } = require("./geometry/half_extent.js");
const { BoundsXZ, Bounds3D, WorldBounds } = require("./geometry/bounds.js");

const InterestPolicy = require("./policy/interest_policy.js");
const SpatialInterestPolicy = require("./policy/spatial_interest_policy.js");
const FlagFilter = require("./policy/flag_filter.js");

const Shape = require("./shapes/shape.js");
const CycleXZ = require("./shapes/cycle.js");
const RectangleXZ = require("./shapes/rectangle.js");
const FanXZ = require("./shapes/fan.js");
const Cylinder = require("./shapes/cylinder.js");
const Cuboid = require("./shapes/cuboid.js");

const { SHAPE_KIND, INTEREST_STATE, EVENT } = require("./constants.js");
const {
    AoiError,
    AoiValidationError,
    AoiStateError,
    AoiCapacityError,
} = require("./errors.js");

/**
 * 使用扁平命名导出，调用方可以通过解构按需取得类型：
 *
 * const { AoiManager, GridBackend, Position } = require("./src/aoi");
 */
module.exports = Object.freeze({
    // 核心管理器
    AoiManager,

    // 空间索引后端
    AbstractBackend,
    BruteBackend,
    GridBackend,

    // AOI 内部实体模型；主要供扩展 Policy 和调试使用
    PositionEntity,
    InterestEntity,

    // 几何值对象
    Position,
    HeightRange,
    HalfExtentXZ,
    HalfExtent3D,
    BoundsXZ,
    Bounds3D,
    WorldBounds,

    // 兴趣策略
    InterestPolicy,
    SpatialInterestPolicy,
    FlagFilter,

    // 形状
    Shape,
    CycleXZ,
    RectangleXZ,
    FanXZ,
    Cylinder,
    Cuboid,

    // 常量
    SHAPE_KIND,
    INTEREST_STATE,
    EVENT,

    // 错误类型
    AoiError,
    AoiValidationError,
    AoiStateError,
    AoiCapacityError,
});


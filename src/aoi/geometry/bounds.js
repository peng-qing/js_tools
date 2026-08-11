"use strict";

const Position = require("./position.js");
const validationUtils = require("../validation.js");
const { AoiValidationError } = require("../errors.js");

/**
 * 平面包围盒
 * @description
 *  不提供 aabb 常见的如判断是否碰撞检测的能力 
 *  如果需要扩展应该单独实现 AABB2D 或者 AABB3D 类 而不是扩张 BoundsXZ 的职责
 */
class BoundsXZ {
    constructor(minX, maxX, minZ, maxZ) {
        validationUtils.assertFiniteNumbers(minX, "minX");
        validationUtils.assertFiniteNumbers(maxX, "maxX");
        validationUtils.assertFiniteNumbers(minZ, "minZ");
        validationUtils.assertFiniteNumbers(maxZ, "maxZ");

        this.minX = Math.min(minX, maxX);
        this.maxX = Math.max(minX, maxX);
        this.minZ = Math.min(minZ, maxZ);
        this.maxZ = Math.max(minZ, maxZ);

        Object.freeze(this);
    }
}

/**
 * 三维包围盒
 * @description
 * 不提供 aabb 常见的如判断是否碰撞检测的能力 
 * 如果需要扩展应该单独实现 AABB3D 类 而不是扩张 Bounds3D 的职责
 */
class Bounds3D {
    constructor(minX, maxX, minY, maxY, minZ, maxZ) {
        validationUtils.assertFiniteNumbers(minX, "minX");
        validationUtils.assertFiniteNumbers(maxX, "maxX");
        validationUtils.assertFiniteNumbers(minY, "minY");
        validationUtils.assertFiniteNumbers(maxY, "maxY");
        validationUtils.assertFiniteNumbers(minZ, "minZ");
        validationUtils.assertFiniteNumbers(maxZ, "maxZ");

        this.minX = Math.min(minX, maxX);
        this.maxX = Math.max(minX, maxX);
        this.minY = Math.min(minY, maxY);
        this.maxY = Math.max(minY, maxY);
        this.minZ = Math.min(minZ, maxZ);
        this.maxZ = Math.max(minZ, maxZ);

        Object.freeze(this);
    }
}

/**
 * 世界边界
 * @description 
 *  限制 AoiManager 可以接受的世界坐标
 *  需要注意，世界的边界时排他的，即不包含边界上的点
 *  不提供区域分块、循环世界、越界裁剪或自动夹紧等能力
 */
class WorldBounds {
    /**
     * 世界边界
     * @param {Position} minPos 世界边界的最小位置
     * @param {Position} maxPos 世界边界的最大位置
     */
    constructor(minPos, maxPos) {
        this.minPos = Position.fromObject(minPos);
        this.maxPos = Position.fromObject(maxPos);

        if (this.minPos.x > this.maxPos.x ||
            this.minPos.y > this.maxPos.y ||
            this.minPos.z > this.maxPos.z) {
            throw new AoiValidationError("minPos must be less than maxPos");
        }

        Object.freeze(this);
    }

    /**
     * 判断位置是否在边界内
     * @param {Position} pos 位置
     * @returns {boolean} 是否在边界内
     */
    contains(pos) {
        const val = Position.fromObject(pos);

        return (
            val.x > this.minPos.x && val.x < this.maxPos.x &&
            val.y > this.minPos.y && val.y < this.maxPos.y &&
            val.z > this.minPos.z && val.z < this.maxPos.z
        );
    }
}

module.exports = {
    BoundsXZ,
    Bounds3D,
    WorldBounds
}

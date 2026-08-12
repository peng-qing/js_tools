"use strict";

const Position = require("../geometry/position.js");
const validationUtils = require("../validation.js");
const AbstractBackend = require("./abstract_backend.js");

/**
 * 均匀网格后端实现
 * 按照目标 gridSize 均匀划分为固定尺寸的网格
 * 每个实体只保存在一个网格中，查询时遍历查询 queryBounds 覆盖的网格 返回网格中的所有实体Id
 * 返回结果只是候选集合 精确规则仍由上层Aoi判断
 * 
 * 网格越小 初筛通常越精细 一次查询的网格数量越多
 * 网格越大 初筛通常越粗糙 一次查询的网格数量越少
 */
class GridBackend extends AbstractBackend {
    /**
     * @param {number} gridSize 网格尺寸
     * @param {number} maxCellsPerQuery 一次查询的最大网格数量
     */
    constructor(gridSize, maxCellsPerQuery = 1000000) {
        super();

        validationUtils.assertNonNegativeNumbers(gridSize, "gridSize");
        validationUtils.assertNonNegativeNumbers(maxCellsPerQuery, "maxCellsPerQuery");
        /**
         * 网格尺寸
         * @type {number}
         */
        this.gridSize = gridSize;
        /**
         * 一次查询的最大网格数量
         * @type {number}
         */
        this.maxCellsPerQuery = maxCellsPerQuery;
        /**
         * 网格列表索引
         * 网格ID 为 grid 坐标的转换值
         * @type {Map<string, Set<number>>}
         */
        this.cellMap = new Map();
        /**
         * 实体Id到网格ID的映射
         * @type {Map<number, string>}
         */
        this.entryIdToCellMap = new Map();
    }

    /**
     * 位置转换为网格ID gridX_gridY
     * @param {import("../geometry/position.js")} pos 位置
     * @returns {string} 网格ID
     */
    _pos2Key(pos) {
        return `${Math.floor(pos.x / this.gridSize)}_${Math.floor(pos.z / this.gridSize)}`;
    }

    /**
     * 网格坐标转换为网格ID
     * @param {number} gridX 网格X坐标
     * @param {number} gridZ 网格Z坐标
     * @returns {string} 网格ID
     */
    _gridXZ2Key(gridX, gridZ) {
        return `${gridX}_${gridZ}`;
    }

    /**
     * 包围盒转换为网格范围
     * @param {import("../geometry/bounds.js").BoundsXZ} bounds 包围盒
     * @returns {Object} 网格范围
     * @returns {number} minX 最小X
     * @returns {number} maxX 最大X
     * @returns {number} minZ 最小Z
     * @returns {number} maxZ 最大Z
     * @returns {number} cellCnt 网格数量
     */
    _bounds2CellRange(bounds) {
        const minX = Math.floor(bounds.minX / this.gridSize);
        const maxX = Math.floor(bounds.maxX / this.gridSize);
        const minZ = Math.floor(bounds.minZ / this.gridSize);
        const maxZ = Math.floor(bounds.maxZ / this.gridSize);
        return {
            minX,
            maxX,
            minZ,
            maxZ,
            cellCnt: (maxX - minX + 1) * (maxZ - minZ + 1),
        };
    }

    /**
     * 获取或创建网格
     * @param {string} posKey 网格ID
     * @returns {Set<number>} 网格
     */
    _getOrCreateCell(posKey) {
        if (this.cellMap.has(posKey)) {
            return this.cellMap.get(posKey);
        }
        const cell = new Set();
        this.cellMap.set(posKey, cell);
        return cell;
    }

    /**
     * 从网格中移除实体 网格中没有实体会删除网格 不保留空网格
     * @param {number} entityId 实体Id
     * @param {string} posKey 网格ID
     */
    _removeEntityFromCell(entityId, posKey) {
        const cell = this.cellMap.get(posKey);
        if (cell) {
            cell.delete(entityId);
        }
        if (cell.size === 0) {
            this.cellMap.delete(posKey);
        }
    }

    /**
     * 添加实体 同一个实体不能重复加入到Aoi后端
     * 后端只保存实体Id和网格归属
     * @param {number} entityId 实体Id
     * @param {import("../geometry/position.js")} pos 实体位置
     */
    addEntity(entityId, pos) {
        if (this.entryIdToCellMap.has(entityId)) {
            return false;
        }
        const posKey = this._pos2Key(pos);
        const cell = this._getOrCreateCell(posKey);
        cell.add(entityId);
        this.entryIdToCellMap.set(entityId, posKey);
        return true;
    }

    /**
     * 移除实体 如果网格中没有实体 会移除网格 不保留空网格
     * @param {number} entityId 实体Id
     */
    removeEntity(entityId) {
        const posKey = this.entryIdToCellMap.get(entityId);
        if (!posKey) {
            return false;
        }
        this._removeEntityFromCell(entityId, posKey);
        this.entryIdToCellMap.delete(entityId);
        return true;
    }

    /**
     * 移动实体 会更新实体的网格归属
     * 计算时使用的是后端认可的当前位置
     * @param {number} entityId 实体Id
     * @param {import("../geometry/position.js")} prevPos 之前的实体位置
     * @param {import("../geometry/position.js")} nextPos 新的实体位置
     */
    moveEntity(entityId, prevPos, nextPos) {
        void prevPos;
        const prevPosKey = this.entryIdToCellMap.get(entityId);
        if (!prevPosKey) {
            return false;
        }
        const nextPosKey = this._pos2Key(nextPos);
        if (prevPosKey === nextPosKey) {
            // 移动在同一个网格
            return true;
        }
        // 移动到新的网格
        this._removeEntityFromCell(entityId, prevPosKey);
        const nextCell = this._getOrCreateCell(nextPosKey);
        nextCell.add(entityId);
        this.entryIdToCellMap.set(entityId, nextPosKey);
        return true;
    }

    /**
     * 查询候选实体Id
     * @param {import("../geometry/bounds.js").BoundsXZ} queryBounds 查询范围
     * @returns {Array<number>} 候选实体Id集合
     */
    queryCandidateEntityIds(queryBounds) {
        // 1. 计算包围盒覆盖的所有网格实体信息
        const cellRange = this._bounds2CellRange(queryBounds);
        if (!Number.isSafeInteger(cellRange.cellCnt) || cellRange.cellCnt > this.maxCellsPerQuery) {
            throw new AoiCapacityError(`cellCnt ${cellRange.cellCnt} is out of range`);
        }
        // 2. 遍历所有网格 获取候选实体Id
        const candidateEntityIds = [];
        for (let x = cellRange.minX; x <= cellRange.maxX; x++) {
            for (let z = cellRange.minZ; z <= cellRange.maxZ; z++) {
                const posKey = this._gridXZ2Key(x, z);
                const cell = this.cellMap.get(posKey);
                if (!cell) {
                    continue;
                }
                for (const entityId of cell) {
                    candidateEntityIds.push(entityId);
                }
            }
        }

        return candidateEntityIds;
    }

    /**
     * 清空所有实体
     */
    clear() {
        this.cellMap.clear();
        this.entryIdToCellMap.clear();
    }
}

module.exports = GridBackend;
"use strict";

const Position = require('../geometry/position.js');

/**
 * Aoi管理的对象的位置实体
 */
class PositionEntity {
    /**
     * 构造函数
     * @param {number} entityId 实体ID
     * @param {string} guid 全局唯一ID
     * @param {Position} pos 位置
     * @param {number} flags 标志
     */
    constructor(entityId, guid, pos, flags) {
        /**
         * 实体ID 由AoiManager分配
         * @type {number}
         */
        this.entityId = entityId;
        /**
         * 全局唯一ID 外部系统分配
         * @type {string|number}
         */
        this.guid = guid;
        /**
         * 位置信息
         * @type {Position}
         */
        this.pos = Position.fromObject(pos);
        /**
         * 实体标志
         * @type {number}
         */
        this.flags = flags;
        /**
         * 实体拥有的兴趣
         * @type {Set<number>}
         */
        this.interestIds = new Set();
        /**
         * 当前正在关注该实体的兴趣实体Id
         * @type {Set<number>}
         */
        this.interestedMeInterestIds = new Set();
        /**
         * 实体是否活跃 (仍在Aoi中)
         * @type {boolean}
         */
        this.active = true;
    }

    /**
     * 设置位置
     * @param {Position} pos 位置
     */
    setPosition(pos) {
        this.pos = Position.fromObject(pos);
    }

    /**
     * 设置不活跃
     */
    deactivate() {
        this.active = false;
    }

    /**
     * 设置标志
     * @param {number} flags 标志
     */
    setFlags(flags) {
        this.flags = flags;
    }
}

module.exports = PositionEntity;
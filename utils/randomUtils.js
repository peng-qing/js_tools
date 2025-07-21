"use strict";

const typeUtils = require("./typeUtils.js");

const randomUtils = {};

/**
 * 获取随机数 左闭右闭 [min_, max_]
 * @param {Number} min_ 
 * @param {Number} max_ 
 * @returns {Number}
 */
randomUtils.getRandom = (min_, max_) => {
    if (min_ > max_) {
        [min_, max_] = [max_, min_];
    }

    return Math.floor(Math.random() * (max_ - min_ + 1) + min_);
}

/**
 * 打乱数组 原数组打乱
 * @param {Array} arr_
 */
randomUtils.shuffleArrayInPlace = (arr_) => {
    if (!Array.isArray(arr_)) {
        throw new Error(`[randomUtils] shuffleArrayInPlace params invalid`);
    }

    arr_.sort(() => {
        return 0.5 - Math.random();
    });
}

/**
 * 打乱数组 返回打乱后的新数组
 * @param {Array} arr_
 * @returns {Array} 
 */
randomUtils.shuffleArray = (arr_) => {
    if (!Array.isArray(arr_)) {
        throw new Error(`[randomUtils] shuffleArrayInPlace params invalid`);
    }

    const backupArr = arr_.concat();
    backupArr.sort(() => {
        return 0.5 - Math.random();
    });

    return backupArr;
}

/**
 * 计算总权重的加权随机 采用权重不均等情况的轮盘选择法
 * @param {Map} weightMap_ 
 * @returns {any | null}
 */
randomUtils.simpleTotalWeightRandom = function (weightMap_) {
    if (!typeUtils.isMap(weightMap_)) {
        throw Error("[randomUtils] simpleTotalWeightRandom invalid parameter input");
    }
    if (weightMap_.size <= 0) {
        return null;
    }
    // 求和
    const totalWeight = Array.from(weightMap_.values()).
        reduce((curVal, totalVal) => {
            return curVal + totalVal;
        }, 0);

    if (totalWeight <= 0) {
        return null;
    }
    // 随机值
    let targetScore = randomUtils.getRandom(0, totalWeight);
    // js map 保持key的插入顺序 避免影响 打乱key的遍历顺序
    const allKeys = Array.from(weightMap_.keys());
    randomUtils.shuffleArrayInPlace(allKeys);
    let result = null;

    for (const randomKey of allKeys) {
        const keyWeight = weightMap_.get(randomKey) || 0;
        targetScore -= keyWeight;
        if (targetScore <= 0) {
            // 表示随机到了
            result = randomKey;
            break;
        }
    }

    return result;
}

/**
 * 不计算总权重的简单加权随机
 * 根据Efraimidis和Spirakis在2006年发表的Paper：Weighted random sampling with a reservoir
 * 参考链接 https://lotabout.me/2018/Weighted-Random-Sampling/
 * @param {Map} weightMap_ 
 * @returns {any | null} 随机失败会返回 null
 */
randomUtils.simpleWeightRandom = function (weightMap_) {
    if (!typeUtils.isMap(weightMap_)) {
        throw Error("[randomUtils] simpleWeightRandom invalid parameter input");
    }

    let maxKey = null, maxScore = Number.MIN_VALUE;
    for (const [key, weight] of weightMap_) {
        // 0 权重不参与随机
        if (weight === 0) {
            continue;
        }
        // 计算每个key 对应的分数
        // score = rand ^ (1.0/weight) rand为[0.0, 1.0]的随机
        // TODO: weight 为一般权重且比较大时 score 可能会比较小从而导致丢失精度
        // 可以考虑对 取对数 log，这样 score 的计算就变成了 log(rand)/weight
        // 因为后续是比较相对大小而非绝对值 所以结果上没有太大影响
        const score = Math.pow(Math.random(), 1.0 / weight);
        if (score > maxScore) {
            maxScore = score;
            maxKey = key;
        }
    }

    return maxKey;
}

/**
 * 加权随机不重复随机
 * @param {Map} weightMap_ key: 随机元素 value: 随机元素出现的权重值
 * @param {Number} count_ 随机次数
 * @returns {Array} 随机结果
 */
randomUtils.getWeightNonRepeatRandom = function (weightMap_, count_) {
    if (!typeUtils.isMap(weightMap_) || !typeUtils.isNumber(count_)) {
        throw Error("[randomUtils] getWeightRandom invalid parameter input");
    }
    // 空参
    if (count_ <= 0 || weightMap_.size <= 0) {
        return [];
    }
    // 随机数量大于随机元素
    if (weightMap_.size <= count_) {
        return Array.from(weightMap_.keys());
    }
    // 这里应该对 weightMap 进行深拷贝
    const cpyWeight = new Map(weightMap_);
    const result = [];
    for (let i = count_; i > 0; i--) {
        const key = randomUtils.simpleWeightRandom(cpyWeight);
        if (typeUtils.isNull(key)) {
            // null 说明随机失败 检查传入参数
            throw Error(`[randomUtils] getWeightRandom random reciprocal ${i} failed`);
        }
        if (!weightMap_.has(key)) {
            // 随机出不存在的key...
            throw Error(`[randomUtils] getWeightRandom random not exist key:${key} failed`);
        }
        // 不重复随机
        cpyWeight.delete(key);
        result.push(key);
    }

    return result;
}

module.exports = randomUtils;
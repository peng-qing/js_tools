"use strict";

import { type_utils } from "./type_utils.js";

export const random_utils = {};

/**
 * 获取随机数 左闭右闭 [min, max]
 * @param {Number} min 
 * @param {Number} max 
 * @returns {Array}
 */
random_utils.getRandom = function (min, max) {
    if (min >= max) {
        [min, max] = [max, min];
    }

    return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * 打乱数组
 * @param {Array} arr 
 */
random_utils.shuffleArray = function (arr) {
    if (!type_utils.isArray(arr)) {
        throw Error("[random_utils] shuffleArray args arr is not array");
    }

    arr.sort(() => {
        return 0.5 - Math.random();
    })
}

/**
 * 计算总权重的加权随机 采用权重不均等情况的轮盘选择法
 * @param {Map} weightMap 
 * @returns {any | null}
 */
random_utils.simpleTotalWeightRandom = function (weightMap) {
    if (!type_utils.isMap(weightMap)) {
        throw Error("[random_utils] simpleTotalWeightRandom invalid parameter input");
    }
    // 求和
    // const totalWeight = Array.from(weightMap.values()).
    //     reduce((curVal, totalVal) => {
    //         return curVal + totalVal;
    //     }, 0);
    // // 随机值
    // for (const [key, weight] of weightMap) {
    // }
}

/**
 * 不计算总权重的简单加权随机
 * 根据Efraimidis和Spirakis在2006年发表的Paper：Weighted random sampling with a reservoir
 * 参考链接 https://lotabout.me/2018/Weighted-Random-Sampling/
 * @param {Map} weightMap 
 * @returns {any | null} 随机失败会返回 null
 */
random_utils.simpleWeightRandom = function (weightMap) {
    if (!type_utils.isMap(weightMap)) {
        throw Error("[random_utils] simpleWeightRandom invalid parameter input");
    }

    let maxKey = null, maxScore = Number.MIN_VALUE;
    for (const [key, weight] of weightMap) {
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
 * @param {Map} weightMap key: 随机元素 value: 随机元素出现的权重值
 * @param {Number} count 随机次数
 * @returns {Array} 随机结果
 */
random_utils.getWeightNonRepeatRandom = function (weightMap, count) {
    if (!type_utils.isMap(weightMap) || !type_utils.isNumber(count)) {
        throw Error("[random_utils] getWeightRandom invalid parameter input");
    }
    // 空参
    if (count <= 0 || weightMap.size <= 0) {
        return [];
    }
    // 随机数量大于随机元素
    if (weightMap.size <= count) {
        return Array.from(weightMap.keys());
    }
    // 这里应该对 weightMap 进行深拷贝
    const cpyWeight = new Map(weightMap);
    const result = [];
    for (let i = count; i > 0; i--) {
        const key = random_utils.simpleWeightRandom(cpyWeight);
        if (type_utils.isNull(key)) {
            // null 说明随机失败 检查传入参数
            throw Error(`[random_utils] getWeightRandom random reciprocal ${i} failed`);
        }
        if (!weightMap.has(key)) {
            // 随机出不存在的key...
            throw Error(`[random_utils] getWeightRandom random not exist key:${key} failed`);
        }
        // 不重复随机
        cpyWeight.delete(key);
        result.push(key);
    }

    return result;
}


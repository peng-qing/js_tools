"use strict";

const typeUtils = require("./type_utils.js");

class RandomUtils {

    /**
     * 获取随机数 左闭右闭 [min, max]
     * @param {Number} min 
     * @param {Number} max 
     * @returns {Number}
     */
    static getRandom(min, max) {
        if (min > max) {
            [min, max] = [max, min];
        }

        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    /**
     * 打乱数组 原数组打乱
     * @param {Array} arr 
     * @returns {Array}
     */
    static shuffleArrayInPlace(arr) {
        if (!Array.isArray(arr)) {
            throw new Error(`[RandomUtils] shuffleArrayInPlace params invalid`);
        }
        arr.sort(() => {
            return 0.5 - Math.random();
        });
    }

    /**
     * 打乱数组 返回打乱后的新数组
     * @param {Array} arr 
     * @returns {Array}
     * @throws {Error}
     */
    static shuffleArray(arr) {
        if (!Array.isArray(arr)) {
            throw new Error(`[RandomUtils] shuffleArray params invalid`);
        }
        const backupArr = [...arr];
        backupArr.sort(() => {
            return 0.5 - Math.random();
        });
        return backupArr;
    }

    /**
     * 计算总权重的加权随机 采用权重不均等情况的轮盘选择法
     * @param {Map} weightMap 
     * @returns {any}
     * @throws {Error}
     */
    static simpleTotalWeightRandom(weightMap) {
        if (!typeUtils.isMap(weightMap)) {
            throw new Error(`[RandomUtils] simpleTotalWeightRandom params invalid`);
        }
        if (weightMap.size <= 0) {
            throw new Error(`[RandomUtils] simpleTotalWeightRandom weightMap is empty`);
        }

        // 求和 ∑
        const totalWeight = Array.from(weightMap.values()).
            reduce((curVal, totalVal) => {
                return curVal + totalVal;
            }, 0);

        if (totalWeight <= 0) {
            throw new Error(`[RandomUtils] simpleTotalWeightRandom totalWeight is less than 0`);
        }

        // 随机值
        let targetScore = this.getRandom(0, totalWeight);
        // js map 保持key的插入顺序 避免影响 打乱key的遍历顺序
        const allKeys = Array.from(weightMap.keys());
        this.shuffleArrayInPlace(allKeys);

        // 遍历所有key 根据权重计算随机值
        for (const randomKey of allKeys) {
            const keyWeight = weightMap.get(randomKey) || 0;
            targetScore -= keyWeight;
            if (targetScore <= 0) {
                // 表示随机到了
                return randomKey;
            }
        }

        // 如果遍历完所有key 都没有随机到 则抛出异常
        throw new Error(`[RandomUtils] simpleTotalWeightRandom random failed`);
    }

    /**
     * 计算总权重的加权随机 
     * 根据Efraimidis和Spirakis在2006年发表的Paper：Weighted random sampling with a reservoir
     * 参考链接 https://lotabout.me/2018/Weighted-Random-Sampling/
     * @param {Map} weightMap 
     * @returns {any}
     * @throws {Error}
     */
    static simpleWeightRandom(weightMap) {
        if (!typeUtils.isMap(weightMap)) {
            throw new Error(`[RandomUtils] simpleWeightRandom params invalid`);
        }
        if (weightMap.size <= 0) {
            throw new Error(`[RandomUtils] simpleWeightRandom weightMap is empty`);
        }
        let maxScore = Number.MIN_VALUE;
        let maxKey;
        for (const [key, weight] of weightMap) {
            // 0 权重不参与随机
            if (weight <= 0) {
                continue;
            }
            // 计算每个key 对应的分数
            // score = rand ^ (1.0/weight) rand为[0.0, 1.0]的随机
            const score = Math.pow(Math.random(), 1.0 / weight);
            // TODO: weight 为一般权重且比较大时 score 可能会比较小从而导致丢失精度
            // 可以考虑对 取对数 log，这样 score 的计算就变成了 log(rand)/weight
            // 因为后续是比较相对大小而非绝对值 所以结果上没有太大影响
            if (score > maxScore) {
                maxScore = score;
                maxKey = key;
            }
        }

        if (typeUtils.isUndefined(maxKey)) {
            throw new Error(`[RandomUtils] simpleWeightRandom random failed`);
        }

        return maxKey;
    }

    /**
     * 加权随机不重复随机
     * @param {Map} weightMap 
     * @param {Number} count 
     * @returns {Array}
     * @throws {Error}
     */
    static getWeightNonRepeatRandom(weightMap, count) {
        if (!typeUtils.isMap(weightMap) || !typeUtils.isNumber(count)) {
            throw new Error(`[RandomUtils] getWeightNonRepeatRandom params invalid`);
        }
        // 空参
        if (count <= 0 || weightMap.size <= 0) {
            return [];
        }
        // 随机数量大于随机元素
        if (weightMap.size <= count) {
            return Array.from(weightMap.keys());
        }
        // 拷贝 避免影响原始数据
        const results = [];
        const cpyWeightMap = new Map(weightMap);
        for (let i = count; i > 0; i--) {
            const key = this.simpleWeightRandom(cpyWeightMap);
            if (typeUtils.isUndefined(key)) {
                throw new Error(`[RandomUtils] getWeightNonRepeatRandom random failed ${count - i} times`);
            }
            if (!cpyWeightMap.has(key)) {
                // 随机出不存在的key...
                throw new Error(`[RandomUtils] getWeightNonRepeatRandom random not exist key:${key} failed`);
            }
            cpyWeightMap.delete(key);
            results.push(key);
        }

        return results;
    }

}

module.exports = RandomUtils;
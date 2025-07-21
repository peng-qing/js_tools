"use strict";

const typeUtils = require("../utils/typeUtils.js");

/**
 * 向量类
 * @class Vector
 * @description 向量是一个有方向和大小的量
 */
class Vector {
    /**
     * 构造函数，接受任意数量的维度参数
     * @param  {...Number|String} dimensions_ 
     * @throws {Error} 如果维度值不是数字
     */
    constructor(...dimensions_) {
        if (dimensions_.some(d => !typeUtils.isNumber(d) || !typeUtils.isNumber(Number(d)))) {
            throw new Error("All vector dimensions must be numbers.");
        }
        this.dimensions = dimensions_.map(val => Number(val));
    }

    /**
     * 获取向量的维度
     * @returns {Number} 向量的维度数量
     */
    get dimension() {
        return this.dimensions.length;
    }

    /**
     * 计算向量的模长
     * @returns {Number} 向量的模长
     * @description 向量的模长的几何意义是从原点到向量终点的距离
     */
    get norm() {
        return Math.sqrt(this.dimensions.reduce((sum, dim) => sum + dim ** 2, 0));
    }

    /**
     * 获取向量的指定维度的值
     * @param {Number|String} index_ 维度的索引 从0开始
     * @returns {Number} 维度的值
     * @throws {Error} 如果索引无效
     */
    get(index_) {
        index_ = Number(index_);
        if (!typeUtils.isInteger(index_) || index_ < 0 || index_ >= this.dimension) {
            throw new Error("Invalid index");
        }
        return this.dimensions[index_];
    }

    /**
     * 设置向量的指定维度的值
     * @param {Number|String} index_ 维度的索引
     * @param {Number|String} value_ 要设置的值
     * @returns {Vector} 当前向量
     * @throws {Error} 如果索引无效或值不是数字
     */
    set(index_, value_) {
        index_ = Number(index_), value_ = Number(value_);
        if (!typeUtils.isInteger(index_) || index_ < 0 || index_ >= this.dimension) {
            throw new Error("Invalid index");
        }
        if (!typeUtils.isNumber(value_)) {
            throw new Error("Value must be a number");
        }
        this.dimensions[index_] = value_;
        return this;
    }

    /**
     * 向量求和
     * @param  {Array<Vector>} vectors 一组向量
     * @returns {Vector} 求和后的向量
     * @description 向量求和的几何意义是起点到终点的最终位移
     */
    static sum(...vectors) {
        if (vectors.some(vec => !(vec instanceof Vector))) {
            throw new Error("All inputs must be Vectors");
        }
        if (vectors.length <= 0) {
            throw new Error("At least one Vector is required");
        }
        // 检查所有向量的维度是否相同
        const dimension = vectors[0].dimension;
        if (!vectors.every(vec => vec.dimension === dimension)) {
            throw new Error("All Vectors must have the same dimension");
        }
        // 逐个维度求和 vec1+vec2 => (x1+x2, y1+y2, z1+z2....)
        const result = Array(dimension).fill(0);
        vectors.forEach(vec => {
            vec.dimensions.forEach((dim, index) => {
                result[index] += dim;
            });
        });
        return new Vector(...result);
    }

    /**
     * 向量加法
     * @param {Vector} other_ 另一个向量
     * @returns {Vector} 相加后的向量
     * @throws {Error} 如果输入不是向量或维度不匹配
     * @description 向量求和的几何意义是起点到终点的最终位移
     */
    add(other_) {
        if (!(other_ instanceof Vector)) {
            throw new Error("Input must be a Vector");
        }
        if (this.dimension !== other_.dimension) {
            throw new Error("Dimensions must match");
        }
        // 逐个维度相加 vec1+vec2 => (x1+x2, y1+y2, z1+z2....)
        const result = this.dimensions.map((dim, index) => dim + other_.dimensions[index]);
        return new Vector(...result);
    }

    /**
     * 向量减法
     * @param  {Array<Vector>} vectors 一组向量
     * @returns {Vector} 相减后的向量
     * @throws {Error} 如果输入不是向量或维度不匹配
     */
    static sub(...vectors) {
        if (vectors.some(vec => !(vec instanceof Vector))) {
            throw new Error("All inputs must be Vectors");
        }
        if (vectors.length <= 0) {
            throw new Error("At least one Vector is required");
        }
        // 检查所有向量的维度是否相同
        const dimension = vectors[0].dimension;
        if (!vectors.every(vec => vec.dimension === dimension)) {
            throw new Error("All Vectors must have the same dimension");
        }
        // 逐个维度相减 vec1-vec2 => (x1-x2, y1-y2, z1-z2....)
        const result = Array(dimension).fill(0);
        vectors.forEach(vec => {
            vec.dimensions.forEach((dim, index) => {
                result[index] -= dim;
            });
        });
        return new Vector(...result);
    }

    /**
     * 向量减法
     * @param {Vector} other_ 另一个向量 
     * @returns {Vector} 相减后的向量
     * @throws {Error} 如果输入不是向量或维度不匹配
     */
    subtract(other_) {
        if (!(other_ instanceof Vector)) {
            throw new Error("Input must be a Vector");
        }
        if (this.dimension !== other_.dimension) {
            throw new Error("Dimensions must match");
        }
        // 逐个维度相减 vec1-vec2 => (x1-x2, y1-y2, z1-z2....)
        const result = this.dimensions.map((dim, index) => dim - other_.dimensions[index]);
        return new Vector(...result);
    }

    /**
     * 标量乘法 修改当前向量
     * @param {Number|String} scalar_ 标量
     * @returns {Vector} 相乘后的向量
     * @throws {Error} 如果输入不是标量
     */
    multiplyScalar(scalar_) {
        scalar_ = Number(scalar_);
        if (!typeUtils.isNumber(scalar_)) {
            throw new Error("Input must be a scalar");
        }
        // 逐个维度相乘 vec*k => (x1*k, y1*k, z1*k....)
        this.dimensions.forEach((dim, index) => {
            this.dimensions[index] = dim * scalar_;
        });
        return this;
    }

    /**
     * 标量乘法 返回新的向量
     * @param {Vector} vec_ 
     * @param {Number|String} scalar_ 
     * @returns {Vector} 新的向量
     * @throws {Error} 如果输入不是向量和标量
     */
    static multiplyScalar(vec_, scalar_) {
        scalar_ = Number(scalar_);
        if (!(vec_ instanceof Vector)) {
            throw new Error("Input must be a Vector");
        }
        if (!typeUtils.isNumber(scalar_)) {
            throw new Error("Input must be a scalar");
        }
        // 逐个维度相乘 vec*k => (x1*k, y1*k, z1*k....)
        const result = vec_.dimensions.map(dim => dim * scalar_);
        return new Vector(...result);
    }

    /**
     * 单位向量 向量归一化
     * @returns {Vector} 归一化后的向量 如果模长为0 返回一个相同维度的零向量
     * @description 向量归一化的几何意义是将向量的长度变为1，方向不变
     */
    normalize() {
        const norm = this.norm;
        if (norm === 0) {
            // 返回一个相同维度的零向量
            return new Vector(...Array(this.dimension).fill(0));
        }
        // 每个维度除以模长
        const result = this.dimensions.map(dim => dim / norm);
        return new Vector(...result);
    }

    /**
     * 创建一个指定维度的单位向量
     * @param {Number} dimension_ 向量的维度
     * @returns {Vector} 单位向量
     */
    static normalize() {
        return new Vector(...Array(dimension_).fill(1));
    }

    /**
     * 点乘 内积 点积 等于两个向量的长度相乘再乘以两向量夹角的余弦
     * @param {Vector} other_ 另一个向量
     * @returns {Number} 点乘结果
     * @throws {Error} 如果输入不是向量或维度不匹配
     * @description 点积的性质
     *  1. 点积结果为标量 a*b = |a||b|cos(theta)，对于单位向量 a*b = cos(theta)
     *  2. 点积 a*b 的几何意义为： a 向量在 b 向量上的投影长度
     *  3. 点积 a*b 计算公式为对应维度相乘再相加
     *  4. 点积结果为0 两个向量垂直 a*b = 0 => cos(theta) = 0 => theta = 90°
     *  5. 点积结果为正数 两个向量夹角小于90° a*b > 0 => cos(theta) > 0 => theta < 90°
     *  6. 点积结果为负数 两个向量夹角大于90° a*b < 0 => cos(theta) < 0 => theta > 90°
     */
    dot(other_) {
        if (!(other_ instanceof Vector)) {
            throw new Error("Input must be a Vector");
        }
        if (this.dimension !== other_.dimension) {
            throw new Error("Dimensions must match");
        }
        // 逐个维度相乘 再相加
        return this.dimensions.reduce((sum, dim, index) => sum + dim * other_.dimensions[index], 0);
    }

    /**
     * 转换为字符串表示
     * @returns {String} 向量的字符串表示
     */
    toString() {
        return `Vector(${this.dimensions.join(", ")})`;
    }

    /**
     * 创建一个指定维度的零向量
     * @param {Number | String} dimension_ 向量的维度
     * @returns {Vector} 零向量
     */
    static zero(dimension_) {
        dimension_ = Number(dimension_);
        if (!typeUtils.isNumber(dimension_)) {
            throw new Error("Input dimension must be a Number or String");
        }
        return new Vector(...Array(dimension_).fill(0));
    }

    /**
     * 根据数组创建向量
     * @param {Array<Number>} arr_ 
     * @returns {Vector} 向量
     * @throws {Error} 如果输入不是数组或数组元素不是数字
     */
    static fromArray(arr_) {
        if (!typeUtils.isArray(arr_)) {
            throw new Error("Input must be a Array");
        }
        return new Vector(...arr_);
    }

    /**
     * 判断两个向量是否相等
     * @param {Vector} other_ 向量
     * @returns {Boolean}
     */
    equals(other_) {
        if (!(other_ instanceof Vector)) {
            return false;
        }
        if (this.dimension !== other_.dimension) {
            return false;
        }
        return this.dimensions.every((dim, index) => dim === other_.dimensions[index]);
    }

    /**
     * 叉乘 外积 叉乘 等于两个向量的长度相乘再乘以两向量夹角的正弦
     * 计算公式为：
     *  a x b = (y1*z2 - z1*y2, z1*x2 - x1*z2, x1*y2 - y1*x2)
     * 需要注意：叉乘只适用于三维向量！！！！
     * @param {Vector} other_ 向量
     * @returns {Vector} 叉乘结果
     * @throws {Error} 如果输入不是向量或维度不匹配
     * @description 叉乘的性质
     *  1. 叉乘结果为向量 a x b = |a||b|sin(theta)，对于单位向量 a x b = sin(theta)
     *  2. 叉乘结果的方向垂直于两个向量 a x b
     *  3. 叉乘的结果垂直于原始的两个向量 a,b 所构成的平面
     *  4. 叉乘的结果向量的方向由右手定则确定
     *  5. 叉乘的模长等于以 a,b 向量为临变构成的平行四边形面积
     *  7. 叉乘 a x b = -(b x a)
     *  8. 叉乘 a x a = 0向量
     *  9. 叉乘 满足分配律和结合律
     *  10. 叉乘可以判断两向量的相对位置
     *      a x b > 0 => a 在 b 的逆时针方向
     *      a x b < 0 => a 在 b 的顺时针方向
     *      a x b = 0 => a,b 共线
     *  11. 叉乘判断点是否在三角形内
     *      分别使用三角形ABC的三个边向量和点P与每个点构成向量叉乘
     *      如果三个叉乘结果的方向都相同，则点P在三角形内
     */
    cross(other_) {
        if (!(other_ instanceof Vector)) {
            throw new Error("Input must be a Vector");
        }
        if (this.dimension !== 3 || other_.dimension !== 3) {
            throw new Error("Cross product is only defined for 3D vectors");
        }

        const [x1, y1, z1] = this.dimensions;
        const [x2, y2, z2] = other_.dimensions;

        const rx = y1 * z2 - z1 * y2;
        const ry = z1 * x2 - x1 * z2;
        const rz = x1 * y2 - y1 * x2;

        return new Vector(rx, ry, rz);
    }
}

module.exports = Vector;

"use strict";

import { typeUtils } from "../utils/typeUtils.js";

/**
 * 矩阵
 * @class Matrix
 * @description 矩阵
 */
class Matrix {
    constructor(data_) {
        if (!typeUtils.isArray(data_) || data_.length <= 0 || !data_.every((row) => typeUtils.isArray(row) && row.length > 0)) {
            throw new Error("Matrix data must be a two-dimensional array");
        }
        const numCols = data_[0].length;
        if (!data_.every((row) => row.length === numCols)) {
            throw new Error("All rows in the matrix must have the same number of columns");
        }
        if (data_.some((row) => row.some((val) => !typeUtils.isNumber(val)))) {
            throw new Error("Matrix data must contain only numbers");
        }
        this.rows = data_.length;
        this.cols = numCols;
        this.matrix = data_.map(row => [...row]); // 深拷贝
    }

    /**
     * 获取矩阵的数据
     * @param {Number} row 
     * @param {Number} col 
     * @returns {Number} 
     * @throws {Error} 非整数或索引越界
     */
    get(row, col) {
        if (!typeUtils.isInteger(row) || !typeUtils.isInteger(col)) {
            throw new Error("Row and column indices must be integers");
        }
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            throw new Error("Index out of bounds");
        }
        return this.matrix[row][col];
    }

    /**
     * 设置矩阵的数据
     * @param {Number} row 
     * @param {Number} col 
     * @param {Number} value
     * @returns {Matrix} self
     * @throws {Error} 非整数或索引越界
     */
    set(row, col, value) {
        if (!typeUtils.isInteger(row) || !typeUtils.isInteger(col)) {
            throw new Error("Row and column indices must be integers");
        }
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            throw new Error("Index out of bounds");
        }
        if (!typeUtils.isNumber(value)) {
            throw new Error("Value must be a number");
        }
        this.matrix[row][col] = value;
        return this;
    }

    /**
     * 字符串化
     * @returns {String}
     */
    toString() {
        return 'Matrix:\n[\n' + this.matrix.map(row => '  [' + row.join(' ') + ']').join('\n') + '\n]';
    }

    /**
     * 深拷贝
     * @returns {Matrix} 
     */
    clone() {
        return new Matrix(this.matrix);
    }

    /**
     * 创建全0矩阵
     * @param {Number} rows 
     * @param {Number} cols 
     * @returns {Matrix}
     * @throws {Error} 非整数或索引越界
     */
    static zeros(rows, cols) {
        if (!typeUtils.isInteger(rows) || !typeUtils.isInteger(cols)) {
            throw new Error("Rows and columns must be integers");
        }
        if (rows <= 0 || cols <= 0) {
            throw new Error("Rows and columns must be greater than 0");
        }
        const matrix = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
        return new Matrix(matrix);
    }

    /**
     * 创建全1矩阵
     * @param {Number} rows
     * @param {Number} cols
     * @returns {Matrix}
     * @throws {Error} 非整数或索引越界
     */
    static ones(rows, cols) {
        if (!typeUtils.isInteger(rows) || !typeUtils.isInteger(cols)) {
            throw new Error("Rows and columns must be integers");
        }
        if (rows <= 0 || cols <= 0) {
            throw new Error("Rows and columns must be greater than 0");
        }
        const matrix = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 1));
        return new Matrix(matrix);
    }

    /**
     * 创建单位矩阵 主对角线全为1
     * @param {Number} size
     * @returns {Matrix}
     * @throws {Error} 非整数或索引越界
     */
    static identity(size) {
        if (!typeUtils.isInteger(size)) {
            throw new Error("Size must be an integer");
        }
        if (size <= 0) {
            throw new Error("Size must be greater than 0");
        }
        const matrix = Array.from({ length: size }, (_, i) => Array.from({ length: size }, (_, j) => i === j ? 1 : 0));
        return new Matrix(matrix);
    }

    /**
     * 矩阵加法 只有同类矩阵可以相加
     * @param {Matrix} matrix_ 
     * @returns {Matrix} self
     * @throws {Error} 非同类矩阵输入
     */
    add(matrix_) {
        if (!(matrix_ instanceof Matrix)) {
            throw new Error("Input must be a Matrix instance.");
        }
        if (matrix_.cols !== this.cols || matrix_.rows !== this.rows) {
            throw new Error("Matrices must have the same dimensions for addition.");
        }
        this.matrix = this.matrix.map((row, rowIndex) => row.map((val, colIndex) => val + matrix_.matrix[rowIndex][colIndex]));
        return this;
    }

    /**
     * 矩阵加法 只有同类矩阵可以相加
     * @param {Matrix} matrix_ 
     * @param {Matrix} otherMatrix_ 
     * @returns {Matrix} 新的结果 matrix
     * @throws {Error} 非同类矩阵输入
     */
    static sum(matrix_, otherMatrix_) {
        if (!(matrix_ instanceof Matrix) || !(otherMatrix_ instanceof Matrix)) {
            throw new Error("Input must be a Matrix instance.");
        }
        if (matrix_.cols !== otherMatrix_.cols || matrix_.rows !== matrix_.rows) {
            throw new Error("Matrices must have the same dimensions for addition.");
        }
        const result = matrix_.matrix.map((row, rowIndex) => row.map((val, colIndex) => val + otherMatrix_.matrix[rowIndex][colIndex]));
        return new Matrix(result);
    }

    /**
     * 矩阵减法 只有同类矩阵可以相减
     * @param {Matrix} matrix_ 
     */
    subtract(matrix_) {
        if (!(matrix_ instanceof Matrix)) {
            throw new Error("Input must be a Matrix instance.");
        }
        if (matrix_.cols !== this.cols || matrix_.rows !== this.rows) {
            throw new Error("Matrices must have the same dimensions for addition.");
        }
        this.matrix = this.matrix.map((row, rowIndex) => row.map((val, colIndex) => val - matrix_.matrix[rowIndex][colIndex]));
        return this;
    }

    /**
     * 矩阵减法 只有同类矩阵可以相减
     * @param {Matrix} matrix_ 
     * @param {Matrix} otherMatrix_ 
     * @returns {Matrix} 新的结果 matrix
     * @throws {Error} 非同类矩阵输入
     */
    static sub(matrix_, otherMatrix_) {
        if (!(matrix_ instanceof Matrix) || !(otherMatrix_ instanceof Matrix)) {
            throw new Error("Input must be a Matrix instance.");
        }
        if (matrix_.cols !== otherMatrix_.cols || matrix_.rows !== matrix_.rows) {
            throw new Error("Matrices must have the same dimensions for addition.");
        }
        const result = matrix_.matrix.map((row, rowIndex) => row.map((val, colIndex) => val - otherMatrix_.matrix[rowIndex][colIndex]));
        return new Matrix(result);
    }

    /**
     * 矩阵标量乘法
     * @param {Number} scalar_ 
     * @returns {Matrix}
     * @throws {Error} 输入非数字
     */
    multiplyScalar(scalar_) {
        scalar_ = Number(scalar_);
        if (!typeUtils.isNumber(scalar_)) {
            throw new Error("Input scalar must be a number.");
        }
        this.matrix = this.matrix.map(row => row.map(val => val * scalar_));
        return this;
    }

    /**
     * 矩阵标量乘法
     * @param {Number} scalar_
     * @param {Matrix} matrix_
     * @returns {Matrix}
     * @throws {Error} 输入非数字
     */
    static multiplyScalar(matrix_, scalar_) {
        scalar_ = Number(scalar_);
        if (!(matrix_ instanceof Matrix)) {
            throw new Error("Input must be a Matrix instance.");
        }
        if (!typeUtils.isNumber(scalar_)) {
            throw new Error("Input scalar must be a number.");
        }
        const result = matrix_.matrix.map(row => row.map(val => val * scalar_));
        return new Matrix(result);
    }

    /**
     * 矩阵乘法 只有满足条件的矩阵可以相乘
     * @param {Matrix} otherMatrix_
     * @returns {Matrix} self
     * @throws {Error} 非矩阵输入
     */
    multiply(otherMatrix_) {
        if (!otherMatrix_ || !(otherMatrix_ instanceof Matrix)) {
            throw new Error("Input must be a Matrix instance.");
        }
        if (this.cols !== otherMatrix_.rows) {
            throw new Error("Number of columns in the first matrix must be equal to the number of rows in the second matrix.");
        }

        const result = Array.from({ length: this.rows }, (_, i) => Array.from({ length: otherMatrix_.cols }, (_, j) => {
            let sum = 0;
            for (let k = 0; k < this.cols; k++) {
                sum += this.matrix[i][k] * otherMatrix_.matrix[k][j];
            }
            return sum;
        }));
        this.matrix = result;
        return this;
    }

    /**
     * 矩阵乘法 只有满足条件的矩阵可以相乘
     * @param {Matrix} matrix_
     * @param {Matrix} otherMatrix_
     * @returns {Matrix}
     * @throws {Error} 非矩阵输入
     */
    static multiply(matrix_, otherMatrix_) {
        if (!(matrix_ instanceof Matrix) || !(otherMatrix_ instanceof Matrix)) {
            throw new Error("Input must be a Matrix instance.");
        }
        if (matrix_.cols !== otherMatrix_.rows) {
            throw new Error("Number of columns in the first matrix must be equal to the number of rows in the second matrix.");
        }
        const result = Array.from({ length: matrix_.rows }, (_, i) => Array.from({ length: otherMatrix_.cols }, (_, j) => {
            let sum = 0;
            for (let k = 0; k < matrix_.cols; k++) {
                sum += matrix_.matrix[i][k] * otherMatrix_.matrix[k][j];
            }
            return sum;
        }));
        return new Matrix(result);
    }

    // TODO: 矩阵转置 行列式 逆矩阵....
}

export { Matrix }

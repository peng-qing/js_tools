"use strict";

// 向量表示 (2/3维)
export class Vector {
    constructor(x, y, z = 0) {
        this.X = x;
        this.Y = y;
        this.Z = z;
    }
}

/**
 * 向量点积
 * @param {Vector} vec1 
 * @param {Vector} vec2 
 */
export function dot2(vec1, vec2) {
    return vec1.X * vec2.X + vec1.Y * vec2.Y;
}

/**
 * 向量点积
 * @param {Vector} vec1 
 * @param {Vector} vec2 
 * @returns 
 */
export function dot3(vec1, vec2) {
    return vec1.X * vec1.X + vec1.Y * vec1.Y + vec1.Z * vec2.Z;
}

/**
 * 缓动曲线
 * @param {Number} t 
 */
export function fade(t) {
    //  6t^5 - 15t^4 + 10t^3
    return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * 线性插值函数
 * @description
 *   start <= end
 *   依据参数 t(t ∈ [0,1]) 在 start,end 之实现线性插值
 *   当 t=0 返回start
 *   当 t=1 返回end
 * @param {Number} start 
 * @param {Number} end
 * @param {Number} t t∈[0, 1]
 */
export function lerp(start, end, t) {
    return (end - start) * t + start;
}

// 柏林噪声实现
export class PerlinNoise {
    constructor() {
        // 预定义 用于确定梯度向量的索引
        this.permutation =
            [
                151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
                140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6,
                148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35,
                11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171,
                168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231,
                83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245,
                40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76,
                132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164,
                100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202,
                38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58,
                17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154,
                163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19,
                98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
                251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145,
                235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84,
                204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222,
                114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
                // 重复一组 避免越界
                151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
                140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6,
                148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35,
                11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171,
                168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231,
                83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245,
                40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76,
                132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164,
                100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202,
                38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58,
                17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154,
                163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19,
                98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
                251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145,
                235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84,
                204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222,
                114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
            ];
        // 伪随机梯度向量
        this.grads =
            [
                // x_y
                Vector(1, 1, 0), Vector(1, -1, 0), Vector(-1, 1, 0), Vector(-1, -1, 0),
                // x_z
                Vector(1, 0, 1), Vector(1, 0, -1), Vector(-1, 0, 1), Vector(-1, 0, -1),
                // y_z
                Vector(0, 1, 1), Vector(0, 1, -1), Vector(0, -1, 1), Vector(0, -1, -1)
            ];
    }

    // 柏林噪声hash函数
    perlin() {
        
    }

}


"use strict";

const validationUtils = require("../validation.js");

/**
 * 平面半尺寸 - 表示二维矩形从中心到x,z两侧边界的半尺寸
 * @description
 * x,z 必须为有限非负数
 * 允许为0 此时退化为线或者点
 */
class HalfExtentXZ {
    constructor(x, z) {
        validationUtils.assertNonNegativeNumbers(x, "x");
        validationUtils.assertNonNegativeNumbers(z, "z");

        this.x = x;
        this.z = z;

        Object.freeze(this);
    }

    /**
     * 从对象创建 HalfExtentXZ 实例
     * @param {Object} obj - 对象
     * @returns {HalfExtentXZ}
     * @returns 
     */
    static fromObject(obj) {
        if (obj instanceof HalfExtentXZ) {
            return obj;
        }

        return new HalfExtentXZ(obj?.x, obj?.z);
    }

}

/**
 * 三维半尺寸
 * @description
 * x,y,z 必须为有限非负数
 * 允许为0 此时退化为面或者线或者点
 */
class HalfExtent3D {
    constructor(x, y, z) {
        validationUtils.assertNonNegativeNumbers(x, "x");
        validationUtils.assertNonNegativeNumbers(y, "y");
        validationUtils.assertNonNegativeNumbers(z, "z");

        this.x = x;
        this.y = y;
        this.z = z;

        Object.freeze(this);
    }

    /**
     * 从对象创建 HalfExtent3D 实例
     * @param {Object} obj - 对象
     * @returns {HalfExtent3D}
     */
    static fromObject(obj) {
        if (obj instanceof HalfExtent3D) {
            return obj;
        }

        return new HalfExtent3D(obj?.x, obj?.y, obj?.z);
    }
}

module.exports = {
    HalfExtentXZ,
    HalfExtent3D
};


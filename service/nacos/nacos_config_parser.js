"use strict";

/**
 * 配置类型基类 实现订阅Nacos需要实现继承改类
 */
class NacosConfigBase {
    constructor() { }

    /**
     * 初始化设置数据
     */
    setData(dataObj_) {
        void dataObj_;
        throw new Error("NacosConfigBase setData is virtual method, must be override by subclass");
    }

    /**
     * 配置覆盖回调
     * @param {Object} dataObj_ 配置数据对象
     */
    onOverWrite(dataObj_) {
        void dataObj_;
        throw new Error("NacosConfigBase onOverWrite is virtual method, must be override by subclass");
    }
}

/**
 * 配置解析器基类 实现目标类型配置解析需要实现
 */
class NacosConfigParser {
    constructor() { }

    /**
     * 反序列化 解析配置
     * @param {string} rowDat_ 配置内容
     * @param {NacosConfigBase} target_ 如果指定了目标对象，则将解析数据赋值给目标对象
     * @returns {Object} 返回解析后的数据 如果指定了目标对象，则返回目标对象，否则返回解析后的数据
     */
    decode(rowDat_, target_ = null) {
        void rowDat_;
        void target_;
        throw new Error("NacosConfigParser decode is virtual method, must be override by subclass");
    }

    /**
     * 序列化
     * @param {Object} dataObj_
     */
    encode(dataObj_) {
        void dataObj_;
        throw new Error("NacosConfigParser encode is virtual method, must be override by subclass");
    }
}

/**
 * JSON 配置解析器
 */
class JsonConfigParser extends NacosConfigParser {
    constructor() {
        super();
    }

    /**
     * 解析 JSON 配置
     * @override
     * @param {string} rowData_
     * @param {NacosConfigBase} target_ 如果指定了目标对象，则将解析数据赋值给目标对象
     * @returns {Object} 返回解析后的数据 如果指定了目标对象，则返回目标对象，否则返回解析后的数据
     */
    decode(rowData_, target_) {
        const obj = JSON.parse(rowData_);
        if (target_ && typeof target_ === "object") {
            if (target_.setData && typeof target_.setData === "function") {
                target_.setData(obj);
            }
            else {
                // 如果 target 未实现 setData 方法，则直接赋值
                Object.assign(target_, obj);
            }
            return target_;
        }
        return obj;
    }

    /**
     * 编码配置
     * @override
     * @param {Object} dataObj_ 配置数据对象
     * @returns {string} 返回编码后的配置内容
     */
    encode(dataObj_) {
        if (!dataObj_) {
            return "";
        }
        // 如果是字符串 直接返回
        if (typeof dataObj_ === "string") {
            return dataObj_;
        }
        // 其他 序列化
        return JSON.stringify(dataObj_);
    }
}

module.exports = {
    NacosConfigBase,
    NacosConfigParser,
    JsonConfigParser,
};
"use strict";

const MAX_TARGETS = 500;
const GUID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function assertObject(value, name) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError(`${name} 必须是对象`);
    }
}

function finiteNumber(value, name) {
    if (!Number.isFinite(value)) {
        throw new TypeError(`${name} 必须是有限数字`);
    }

    return value;
}

function nonNegativeNumber(value, name) {
    const result = finiteNumber(value, name);

    if (result < 0) {
        throw new TypeError(`${name} 不能小于 0`);
    }

    return result;
}

function positiveNumber(value, name) {
    const result = finiteNumber(value, name);

    if (result <= 0) {
        throw new TypeError(`${name} 必须大于 0`);
    }

    return result;
}

function mapExtent(value) {
    const result = positiveNumber(value, "mapExtent");

    if (result < 10 || result > 100000) {
        throw new TypeError("mapExtent 必须位于 10 到 100000 之间");
    }

    return result;
}

function nonNegativeInteger(value, name) {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new TypeError(`${name} 必须是非负安全整数`);
    }

    return value;
}

function uint32(value, name) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xFFFFFFFF) {
        throw new TypeError(`${name} 必须是 0 到 4294967295 之间的整数`);
    }

    return value;
}

function guid(value, name) {
    if (typeof value !== "string" || !GUID_PATTERN.test(value)) {
        throw new TypeError(`${name} 只能包含字母、数字、下划线和连字符，长度 1 到 64`);
    }

    return value;
}

function entity(value, name) {
    assertObject(value, name);

    return {
        guid: guid(value.guid, `${name}.guid`),
        x: finiteNumber(value.x, `${name}.x`),
        y: finiteNumber(value.y, `${name}.y`),
        z: finiteNumber(value.z, `${name}.z`),
        flags: uint32(value.flags, `${name}.flags`),
    };
}

/**
 * 将不可信 HTTP JSON 转换为 evaluator 可使用的规范场景。
 * 返回全新的普通对象，避免服务端逻辑持有或修改请求对象。
 */
function normalizeScenario(input) {
    assertObject(input, "scenario");
    assertObject(input.policy, "policy");

    if (!Array.isArray(input.targets) || input.targets.length > MAX_TARGETS) {
        throw new TypeError(`targets 必须是数组且最多包含 ${MAX_TARGETS} 项`);
    }

    if (input.backend !== "brute" && input.backend !== "grid") {
        throw new TypeError("backend 必须是 brute 或 grid");
    }

    const observer = entity(input.observer, "observer");
    const targets = input.targets.map((item, index) => entity(item, `targets[${index}]`));
    const allGuids = new Set([observer.guid]);

    for (const target of targets) {
        if (allGuids.has(target.guid)) {
            throw new TypeError(`实体 GUID 重复: ${target.guid}`);
        }

        allGuids.add(target.guid);
    }

    const policy = {
        shape: input.policy.shape,
        radius: nonNegativeNumber(input.policy.radius, "policy.radius"),
        halfExtentX: nonNegativeNumber(input.policy.halfExtentX, "policy.halfExtentX"),
        halfExtentY: nonNegativeNumber(input.policy.halfExtentY, "policy.halfExtentY"),
        halfExtentZ: nonNegativeNumber(input.policy.halfExtentZ, "policy.halfExtentZ"),
        yaw: finiteNumber(input.policy.yaw, "policy.yaw"),
        halfAngle: nonNegativeNumber(input.policy.halfAngle, "policy.halfAngle"),
        heightEnabled: Boolean(input.policy.heightEnabled),
        minHeight: finiteNumber(input.policy.minHeight, "policy.minHeight"),
        maxHeight: finiteNumber(input.policy.maxHeight, "policy.maxHeight"),
        anyFlags: uint32(input.policy.anyFlags, "policy.anyFlags"),
        needFlags: uint32(input.policy.needFlags, "policy.needFlags"),
        forbidFlags: uint32(input.policy.forbidFlags, "policy.forbidFlags"),
        maxInterest: nonNegativeInteger(input.policy.maxInterest, "policy.maxInterest"),
    };

    if (!["circle", "rectangle", "fan", "cylinder", "cuboid"].includes(policy.shape)) {
        throw new TypeError("policy.shape 不受支持");
    }

    if (policy.halfAngle > Math.PI) {
        throw new TypeError("policy.halfAngle 不能大于 PI");
    }

    return {
        backend: input.backend,
        gridSize: positiveNumber(input.gridSize, "gridSize"),
        mapExtent: mapExtent(input.mapExtent),
        observer,
        targets,
        policy,
    };
}

module.exports = { normalizeScenario };

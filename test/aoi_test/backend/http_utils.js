"use strict";

const MAX_BODY_BYTES = 1024 * 1024;

function writeJson(response, statusCode, body) {
    response.writeHead(statusCode, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
    });
    response.end(JSON.stringify(body));
}

/**
 * 读取有限大小的 JSON Body。
 * 限制大小可以防止本地测试服务因意外粘贴超大场景而持续占用内存。
 */
function readJson(request) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let byteLength = 0;
        let settled = false;

        function fail(error) {
            if (!settled) {
                settled = true;
                reject(error);
            }
        }

        request.on("data", (chunk) => {
            byteLength += chunk.length;

            if (byteLength > MAX_BODY_BYTES) {
                fail(new Error("请求体不能超过 1 MiB"));
                return;
            }

            chunks.push(chunk);
        });
        request.on("end", () => {
            if (settled) return;

            try {
                const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
                settled = true;
                resolve(value);
            } catch {
                fail(new Error("请求体必须是合法 JSON"));
            }
        });
        request.on("error", fail);
    });
}

module.exports = { readJson, writeJson };

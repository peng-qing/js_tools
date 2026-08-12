"use strict";

const http = require("node:http");
const path = require("node:path");
const { evaluateScenario } = require("./scenario_evaluator.js");
const { readJson, writeJson } = require("./http_utils.js");
const { createStaticFileHandler } = require("./static_files.js");

const HOST = "127.0.0.1";
const DEFAULT_PORT = 4273;
const FRONT_DIRECTORY = path.resolve(__dirname, "../front");
const serveStaticFile = createStaticFileHandler(FRONT_DIRECTORY);

/**
 * 创建 HTTP Server，但不立即监听端口，便于调用方自行决定监听时机和端口。
 */
function createServer() {
    return http.createServer(async (request, response) => {
        const url = new URL(request.url, `http://${request.headers.host || HOST}`);

        if (request.method === "POST" && url.pathname === "/api/evaluate") {
            try {
                writeJson(response, 200, evaluateScenario(await readJson(request)));
            } catch (error) {
                writeJson(response, 400, {
                    error: error instanceof Error ? error.message : "AOI 场景计算失败",
                });
            }
            return;
        }

        if (request.method !== "GET" && request.method !== "HEAD") {
            response.writeHead(405, { allow: "GET, HEAD, POST" });
            response.end();
            return;
        }

        serveStaticFile(request, response, url.pathname);
    });
}

function startServer(port = DEFAULT_PORT) {
    const server = createServer();
    server.listen(port, HOST, () => {
        console.log(`src/aoi 测试台: http://${HOST}:${port}`);
    });
    return server;
}

if (require.main === module) {
    const port = Number(process.argv[2] ?? DEFAULT_PORT);

    if (!Number.isSafeInteger(port) || port <= 0 || port > 65535) {
        throw new TypeError("端口必须是 1 到 65535 之间的整数");
    }

    startServer(port);
}

module.exports = { createServer, startServer };

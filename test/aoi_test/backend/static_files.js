"use strict";

const fs = require("node:fs");
const path = require("node:path");

const CONTENT_TYPES = Object.freeze({
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
});

/**
 * 创建只读静态文件处理器。
 * resolve + 相对路径校验用于阻止 `../` 穿越到 front 目录之外。
 */
function createStaticFileHandler(publicDirectory) {
    const root = path.resolve(publicDirectory);

    function resolveFile(urlPath) {
        let decodedPath;

        try {
            decodedPath = decodeURIComponent(urlPath === "/" ? "/index.html" : urlPath);
        } catch {
            return null;
        }

        const filePath = path.resolve(root, `.${decodedPath}`);
        const relativePath = path.relative(root, filePath);

        if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
            return null;
        }

        return filePath;
    }

    return function serveStaticFile(request, response, pathname) {
        const filePath = resolveFile(pathname);

        if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
            response.end("Not found");
            return;
        }

        response.writeHead(200, {
            "content-type": CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream",
            "cache-control": "no-store",
        });

        if (request.method === "HEAD") {
            response.end();
            return;
        }

        fs.createReadStream(filePath).pipe(response);
    };
}

module.exports = { createStaticFileHandler };

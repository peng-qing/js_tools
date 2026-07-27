"use strict";

const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const {
    CommonJSModuleHotReloader,
    CommonJSModulePatchReloader,
} = require("../../src/common/module_hot_reloader.cjs");

const BasicService = require("./basic.cjs");
const ChildService = require("./child.cjs");
const objectService = require("./object_service.cjs");
const SingletonService = require("./singleton.cjs");
const arrayExport = require("./array_export.cjs");

const hotHandler = CommonJSModuleHotReloader.createHotReloadFunction(path.resolve(__dirname, "export_function.cjs"));
const patchHotHandler = CommonJSModulePatchReloader.createHotReloadFunction(path.resolve(__dirname, "export_function.cjs"));

const state = {
    basicInstance: new BasicService("Ada"),
    childInstance: new ChildService("Linus"),
    singletonInstance: new SingletonService(),
};

const testGuide = {
    start: "node test\\commonjsReload\\index.cjs",
    flow: [
        "1. call /process first and observe v1 output.",
        "2. edit the matching .cjs file in test/commonjsReload, for example change suffix from v1 to v2.",
        "3. call /reload?filePath=<file>.",
        "4. or call /reload?mode=patch&filePath=<file> to test CommonJSModulePatchReloader.",
        "5. call /process again and compare output plus identity fields.",
    ],
    expectations: {
        basic: [
            "classIdentityStable should stay true after reload.",
            "oldInstanceofLatest should stay true after reload.",
            "hello/staticVersion should reflect edited code.",
        ],
        child: [
            "classIdentityStable and oldInstanceofLatest should stay true.",
            "hello and parentHello should both reflect edited code.",
        ],
        object: [
            "objectIdentityStable should stay true.",
            "count should keep runtime state and continue increasing.",
            "show/added should reflect edited code.",
        ],
        functionExport: [
            "directRequire shows what normal require currently returns.",
            "hotWrapper reflects edited code after default cache reload.",
            "patchWrapper must reflect edited code after reload?mode=patch.",
            "After patch mode, directRequire may intentionally stay on the old cached function.",
        ],
        proxySingleton: [
            "proxyIdentityStable should stay true.",
            "instanceIdentityStable should stay true, proving the old singleton closure is preserved.",
            "rawClassExists should stay true.",
            "show should reflect edited raw class prototype method after reload.",
        ],
        arrayExport: [
            "This case documents unsupported built-in object exports.",
            "arrayIdentityStable may stay true due cache rewrite, but array contents are not hot patched intentionally.",
        ],
    },
    curl: {
        basic: [
            "curl \"http://localhost:3001/process?handlerName=callBasicService\"",
            "curl \"http://localhost:3001/reload?filePath=basic.cjs\"",
            "curl \"http://localhost:3001/reload?mode=patch&filePath=basic.cjs\"",
        ],
        child: [
            "curl \"http://localhost:3001/process?handlerName=callChildService\"",
            "curl \"http://localhost:3001/reload?filePath=child.cjs\"",
            "curl \"http://localhost:3001/reload?mode=patch&filePath=child.cjs\"",
        ],
        object: [
            "curl \"http://localhost:3001/process?handlerName=callObjectService\"",
            "curl \"http://localhost:3001/reload?filePath=object_service.cjs\"",
            "curl \"http://localhost:3001/reload?mode=patch&filePath=object_service.cjs\"",
        ],
        functionExport: [
            "curl \"http://localhost:3001/process?handlerName=callExportFunction\"",
            "curl \"http://localhost:3001/reload?filePath=export_function.cjs\"",
            "curl \"http://localhost:3001/reload?mode=patch&filePath=export_function.cjs\"",
        ],
        proxySingleton: [
            "curl \"http://localhost:3001/process?handlerName=callSingletonService\"",
            "curl \"http://localhost:3001/reload?filePath=singleton.cjs\"",
            "curl \"http://localhost:3001/reload?mode=patch&filePath=singleton.cjs\"",
        ],
        arrayExport: [
            "curl \"http://localhost:3001/process?handlerName=callArrayExport\"",
            "curl \"http://localhost:3001/reload?filePath=array_export.cjs\"",
            "curl \"http://localhost:3001/reload?mode=patch&filePath=array_export.cjs\"",
        ],
    },
};

function callBasicService() {
    const LatestBasicService = require("./basic.cjs");
    return {
        classIdentityStable: LatestBasicService === BasicService,
        oldInstanceofLatest: state.basicInstance instanceof LatestBasicService,
        hello: state.basicInstance.hello(),
        staticVersion: LatestBasicService.version(),
    };
}

function callChildService() {
    const LatestChildService = require("./child.cjs");
    return {
        classIdentityStable: LatestChildService === ChildService,
        oldInstanceofLatest: state.childInstance instanceof LatestChildService,
        hello: state.childInstance.hello(),
        parentHello: state.childInstance.parentHello(),
    };
}

function callObjectService() {
    const latestObjectService = require("./object_service.cjs");
    objectService.count += 1;
    return {
        objectIdentityStable: latestObjectService === objectService,
        count: latestObjectService.count,
        label: latestObjectService.label,
        show: latestObjectService.show(),
        added: typeof latestObjectService.added === "function" ? latestObjectService.added() : "added not found",
    };
}

function callExportFunction() {
    return {
        directRequire: require("./export_function.cjs")("direct"),
        hotWrapper: hotHandler("wrapper"),
        patchWrapper: patchHotHandler("patch-wrapper"),
    };
}

function callSingletonService() {
    const LatestSingletonService = require("./singleton.cjs");
    const latestInstance = new LatestSingletonService();
    return {
        proxyIdentityStable: LatestSingletonService === SingletonService,
        instanceIdentityStable: latestInstance === state.singletonInstance,
        rawClassExists: Boolean(LatestSingletonService[CommonJSModuleHotReloader.ROW_PROXY_CLASS_KEY]),
        show: state.singletonInstance.show(),
        latestInstanceShow: latestInstance.show(),
    };
}

function callArrayExport() {
    const latestArrayExport = require("./array_export.cjs");
    return {
        arrayIdentityStable: latestArrayExport === arrayExport,
        initialArray: arrayExport,
        latestArray: latestArrayExport,
        arrayLength: ["old: " + arrayExport.length, "new: " + latestArrayExport.length],
    };
}

function resolveReloadPath(filePath) {
    if (!filePath) {
        throw new Error("missing filePath");
    }
    return path.resolve(__dirname, filePath);
}

const handlers = {
    getGuide: () => testGuide,
    callBasicService,
    callChildService,
    callObjectService,
    callExportFunction,
    callSingletonService,
    callArrayExport,
};

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    try {
        if (pathname === "/reload") {
            const filePath = resolveReloadPath(url.searchParams.get("filePath"));
            const mode = url.searchParams.get("mode") || "cache";
            if (mode === "patch") {
                CommonJSModulePatchReloader.reloadURL(filePath);
            }
            else {
                CommonJSModuleHotReloader.reloadURL(filePath);
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ message: "reload complete", mode, filePath }, null, 2));
            return;
        }

        if (pathname === "/process") {
            const handlerName = url.searchParams.get("handlerName");
            const handler = handlers[handlerName];
            if (!handler) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    error: "unknown handlerName",
                    availableHandlers: Object.keys(handlers),
                }, null, 2));
                return;
            }

            const data = handler();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ message: "process complete", data }, null, 2));
            return;
        }

        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "not found" }, null, 2));
    }
    catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            error: err.message,
            stack: err.stack,
        }, null, 2));
    }
});

server.listen(3001, () => {
    console.log("CommonJS hot reload test server: http://localhost:3001");
    console.log("Guide: curl \"http://localhost:3001/process?handlerName=getGuide\"");
});

process.on("SIGINT", () => {
    server.close(() => process.exit(0));
});


// Manual test summary:
//
// 1. Start server:
//    node test\commonjsReload\index.cjs
//
// 2. Show full guide:
//    curl "http://localhost:3001/process?handlerName=getGuide"
//
// 3. Class export:
//    curl "http://localhost:3001/process?handlerName=callBasicService"
//    Edit basic.cjs, change suffix v1 to v2.
//    curl "http://localhost:3001/reload?filePath=basic.cjs"
//    Or test patch mode:
//    curl "http://localhost:3001/reload?mode=patch&filePath=basic.cjs"
//    curl "http://localhost:3001/process?handlerName=callBasicService"
//
// 4. Inherited class export:
//    curl "http://localhost:3001/process?handlerName=callChildService"
//    Edit child.cjs, change suffix v1 to v2.
//    curl "http://localhost:3001/reload?filePath=child.cjs"
//    Or test patch mode:
//    curl "http://localhost:3001/reload?mode=patch&filePath=child.cjs"
//    curl "http://localhost:3001/process?handlerName=callChildService"
//
// 5. Plain object export:
//    curl "http://localhost:3001/process?handlerName=callObjectService"
//    Edit object_service.cjs, change label/show and optionally add added().
//    curl "http://localhost:3001/reload?filePath=object_service.cjs"
//    Or test patch mode:
//    curl "http://localhost:3001/reload?mode=patch&filePath=object_service.cjs"
//    curl "http://localhost:3001/process?handlerName=callObjectService"
//
// 6. Direct function export:
//    curl "http://localhost:3001/process?handlerName=callExportFunction"
//    Edit export_function.cjs, change v1 to v2.
//    curl "http://localhost:3001/reload?filePath=export_function.cjs"
//    Or test patch mode:
//    curl "http://localhost:3001/reload?mode=patch&filePath=export_function.cjs"
//    curl "http://localhost:3001/process?handlerName=callExportFunction"
//
// 7. Proxy singleton export:
//    curl "http://localhost:3001/process?handlerName=callSingletonService"
//    Edit singleton.cjs, change suffix v1 to v2.
//    curl "http://localhost:3001/reload?filePath=singleton.cjs"
//    Or test patch mode:
//    curl "http://localhost:3001/reload?mode=patch&filePath=singleton.cjs"
//    curl "http://localhost:3001/process?handlerName=callSingletonService"
//    Expected after reload:
//      proxyIdentityStable: true
//      instanceIdentityStable: true
//      rawClassExists: true
//      show/latestInstanceShow include v2
//
// 8. Unsupported array export:
//    curl "http://localhost:3001/process?handlerName=callArrayExport"
//    Edit array_export.cjs.
//    curl "http://localhost:3001/reload?filePath=array_export.cjs"
//    Or test patch mode:
//    curl "http://localhost:3001/reload?mode=patch&filePath=array_export.cjs"
//    curl "http://localhost:3001/process?handlerName=callArrayExport"

import assert from "assert";
import http from "node:http";
import { URL } from "node:url";

import { ESMModuleHotReloader } from "../../src/common/module_hot_reloader.mjs";
import { BasicService } from "./basic.js";
import { StaticMethodService } from "./static_method.js";
import { AExtendService, BProxyService, CNewService } from "./singleton.js";

const fnCallBasicService = async () => {
    const app = new BasicService();
    return {
        hello: app.hello(),
        greet: app.greet(),
    }
}

const fnCallStaticMethodService = async () => {
    return {
        add: StaticMethodService.add(1, 2),
        multiply: StaticMethodService.multiply(3, 4),
        getMultiplier: StaticMethodService.getMultiplier(),
    }
}

let counter = 0;
const fnCallGetterSetterService = async () => {
    const app = new BasicService();
    let oldMode = app.mode;
    counter += 1;
    let mode = counter % 2 === 0 ? "dev" : "prod";
    app.mode = mode;
    return {
        mode: app.mode,
        oldMode: oldMode,
    }
}

const fnCallSingletonService = async () => {
    let aExtendService = AExtendService.getInstance();
    let bProxyService = new BProxyService();
    let cNewService = CNewService;

    return {
        aExtendService: aExtendService.showMeVersion(),
        bProxyService: bProxyService.showMeVersion(),
        cNewService: cNewService.showMeVersion(),
    }
}


const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname === "/reload") {
        const filePath = url.searchParams.get("filePath");
        if (!filePath) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "缺少参数 filePath" }));
            return;
        }
        console.log("[reload] 开始热更文件: ", filePath);
        // 进行热更
        await ESMModuleHotReloader.reloadModule(filePath);
        console.log("[reload] 热更完成");

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "热更完成" }));
        return;
    }
    if (pathname === "/process") {
        const handlerName = url.searchParams.get("handlerName");
        if (!handlerName) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "缺少参数 handlerName" }));
            return;
        }
        console.log("[process] 开始执行处理函数: ", handlerName);

        let obj = {};
        if (handlerName === "callBasicService") {
            obj[handlerName] = await fnCallBasicService();
        }
        else if (handlerName === "callStaticMethodService") {
            obj[handlerName] = await fnCallStaticMethodService();
        }
        else if (handlerName === "callGetterSetterService") {
            obj[handlerName] = await fnCallGetterSetterService();
        }
        else if (handlerName === "callSingletonService") {
            obj[handlerName] = await fnCallSingletonService();
        }

        console.log("[process] 处理函数执行完成");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "处理函数执行完成", data: obj }));
        return;
    }
});

server.listen(3000, () => {
    console.log("服务已启动: http://localhost:3000");
});

process.on("SIGINT", () => {
    server.close(() => {
        console.log("服务已关闭");
        process.exit(0);
    });
});
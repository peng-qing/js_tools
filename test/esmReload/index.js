import assert from "assert";
import http from "node:http";
import { URL } from "node:url";

import { ESMModuleHotReloader } from "../../src/common/module_hot_reloader.mjs";
import { BasicService, ChildService } from "./basic.js";
import { StaticMethodService } from "./static_method.js";
import { AExtendService, BProxyService, CNewService } from "./singleton.js";
import { BasicService as BasicServiceB } from "./basic_b.js";
// import { showBanner, add } from "./export_function.js";

let counter = 0;

const fnCallBasicService = async () => {
    const app = new BasicService();
    let oldMode = app.mode;
    counter += 1;
    let mode = counter % 2 === 0 ? "dev" : "prod";
    app.mode = mode;
    return {
        hello: app.hello(),
        greet: app.greet(),
        mode: app.mode,
        oldMode: oldMode,
    }
}

const fnCallStaticMethodService = async () => {
    return {
        add: StaticMethodService.add(1, 2),
        multiply: StaticMethodService.multiply(3, 4),
        getMultiplier: StaticMethodService.getMultiplier(),
    }
}

const fnCallGetterSetterService = async () => {
    return await fnCallBasicService();
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

const fnCallBasicServiceB = async () => {
    const app = new BasicServiceB();
    let oldMode = app.mode;
    counter += 1;
    let mode = counter % 2 === 0 ? "dev" : "prod";
    app.mode = mode;
    return {
        hello: app.hello(),
        greet: app.greet(),
        mode: app.mode,
        oldMode: oldMode,
    }
}

const fnCallChildService = async () => {
    const app = new ChildService();
    let oldMode = app.mode;
    counter += 1;
    let mode = counter % 2 === 0 ? "dev" : "prod";
    app.mode = mode;
    return {
        hello: app.hello(),
        greet: app.greet(),
        mode: app.mode,
        oldMode: oldMode,
    }
}

const fnCallExportFunctionService = async () => {
    const showBanner = await ESMModuleHotReloader.createHotReloadFunction("./export_function.js", "showBanner");
    const add = await ESMModuleHotReloader.createHotReloadFunction("./export_function.js", "add");

    return {
        banner: showBanner(),
        add: add(1, 2),
    }
}

const fnCallAddOrDelFunctionService = async () => {
    const app = new ChildService();

    let addFunc = app.addFunc || (() => "addFunc not found");

    return {
        addFuncResult: addFunc(),
    }
}

const fnCallOnLoadCallbackService = async () => {
    ESMModuleHotReloader.classDef("./basic.js", ChildService, (newModule, isReload) => {
        console.log("[fnCallOnLoadCallbackService] onLoad success, " + " isReload: " + isReload);
        if (isReload) {
            console.log("[fnCallOnLoadCallbackService] onLoad success, suffix reset to v1");
        }
    });
}

const fnCallInstanceofService = async () => {
    const app = new ChildService();
    return {
        instanceof: app instanceof ChildService,
    }
}

const fnCallPrivatePropertyService = async () => {
    const app = new ChildService();
    return {
        privateMethod: app.showPrivateMethod(),
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
        // 支持空文件
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
            // 常规接口  可以被热更
            obj[handlerName] = await fnCallBasicService();
        }
        else if (handlerName === "callStaticMethodService") {
            // 静态方法 可以被热更 但是静态属性无法被热更
            obj[handlerName] = await fnCallStaticMethodService();
        }
        else if (handlerName === "callGetterSetterService") {
            // getter & setter 接口 可以被热更
            obj[handlerName] = await fnCallGetterSetterService();
        }
        else if (handlerName === "callSingletonService") {
            // 单例对象 可以被热更 包括 proxy
            obj[handlerName] = await fnCallSingletonService();
        }
        else if (handlerName === "callBasicService_b") {
            // 不同文件同名对象 可以被热更
            obj[handlerName] = await fnCallBasicServiceB();
        }
        else if (handlerName === "callChildService") {
            // 继承父类对象 可以被热更 且热更后子类对象会继承父类对象的热更后的属性
            // 子类热更不影响父类对象
            obj[handlerName] = await fnCallChildService();
        }
        else if (handlerName === "callExportFunctionService") {
            // 导出函数 无法热更 缺少 prototype 类似的中间层
            // 如果要支持热更 需要借助 包装器/代理 实现
            // 1. export const xxHandler = { handler(){....} };
            // 这里在 ESMModuleHotReloader 中已经支持了函数包装器
            obj[handlerName] = await fnCallExportFunctionService();
        }
        else if (handlerName == "callAddOrDelFunctionService") {
            // 添加/删除函数
            // 1. 新增接口 支持
            // 2. 删除接口 旧方法残留
            obj[handlerName] = await fnCallAddOrDelFunctionService();
        }
        else if (handlerName == "callOnLoadCallbackService") {
            // 加载/热更 回调函数
            // 1. 首次加载 支持
            // 2. 热更 支持
            obj[handlerName] = await fnCallOnLoadCallbackService();
        }
        else if (handlerName == "callInstanceofService") {
            // instanceof 判断
            // 1. 首次加载 支持
            // 2. 热更 支持
            if (!server.test_obj) {
                server.test_obj = new ChildService();
            }
            obj[handlerName] = server.test_obj instanceof ChildService;
            // obj[handlerName] = await fnCallInstanceofService();
        }
        else if (handlerName == "callPrivatePropertyService") {
            // 私有属性 & 私有方法
            obj[handlerName] = await fnCallPrivatePropertyService();
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
process.on("uncaughtException", (err) => {
    console.error("[uncaughtException] 捕获到未处理的异常: ", err);
    process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
    console.error("[unhandledRejection] 捕获到未处理的拒绝: ", reason, promise);
    process.exit(1);
});
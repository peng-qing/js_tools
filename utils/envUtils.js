"use strict";

export const envUtils = {};

export const ENV = {
    UNKNOWN: "unknown",
    NODE: "node",
    BROWSER: "browser",
}

export const OS = {
    UNKNOWN: "unknown",
    LINUX: "linux",
    WINDOWS: "windows",
    MACOS: "macos",
    IOS: "ios",
    ANDROID: "android",
    OTHERS: "others",
}

// 获取运行时环境
envUtils.getEnv = () => {
    if (typeof window === "object" &&
        typeof window.document === "object") {
        return ENV.BROWSER;
    }
    if (typeof global === "object" &&
        typeof global.process === "object") {
        return ENV.NODE
    }

    return ENV.UNKNOWN;
}

// 获取系统
envUtils.getOS = () => {
    const env = envUtils.getEnv();
    if (env === ENV.NODE) {
        let osType = OS.OTHERS;
        switch (process.platform) {
            case "darwin":
                osType = OS.MACOS;
                break;
            case "linux":
                osType = OS.LINUX;
                break;
            case "win32":
                osType = OS.WINDOWS;
                break;
            case "android":
                osType = OS.ANDROID;
                break;
        }
        return osType;
    }
    else if (env === ENV.BROWSER) {
        const userAgent = navigator.userAgent;
        let osType = OS.OTHERS;
        if (userAgent.indexOf("Win") !== -1) {
            osType = OS.WINDOWS;
        }
        else if (userAgent.indexOf("Mac") !== -1) {
            osType = OS.MACOS;
        }
        else if (userAgent.indexOf("Linux") !== -1) {
            osType = OS.LINUX;
        }
        else if (userAgent.indexOf("Android") !== -1) {
            osType = OS.ANDROID;
        }
        else if (userAgent.indexOf("IOS") !== -1 ||
            userAgent.indexOf("iPhone") !== -1 ||
            userAgent.indexOf("iPad") !== -1) {
            osType = OS.IOS;
        }

        return osType;
    }

    return OS.UNKNOWN;
}

// 是否为移动端
envUtils.isMobile = () => {
    if (envUtils.getEnv() !== ENV.BROWSER) {
        throw new Error(`isMobile must be browser environment..`);
    }
    const userAgents = navigator.userAgent;
    const Agents = ['Android', 'iPhone', 'SymbianOS', 'Windows Phone', 'iPad', 'iPod'];

    return Agents.some(agent => userAgents.indexOf(agent) > -1);
}
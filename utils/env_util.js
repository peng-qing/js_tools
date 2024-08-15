"use strict";

export const env_utils = {};

env_utils.ENV = {
    UNKNOWN: 0,
    NODE: 1,
    BROWSER: 2
}

const ENV_NAMES = [
    "unknown",
    "node",
    "browser"
];

env_utils.BROWSER_ENV = {
    UNKNOWN: 0,
    PC: 1,
    MOBILE: 2
}

const BROWSER_ENV_NAMES = [
    "unknown",
    "pc",
    "mobile"
]

env_utils.OS = {
    UNKNOWN: 0,
    LINUX: 1,
    WINDOWS: 2,
    MACOS: 3,
    IOS: 4,
    ANDROID: 5,
    OTHERS: 6
}

const OS_NAMES = [
    "unknown",
    "linux",
    "windows",
    "macos",
    "ios",
    "android",
    "others"
]

env_utils.getEnv = function () {
    if (typeof window === "object" &&
        typeof window.document === "object") {
        return env_utils.ENV.BROWSER;
    }
    if (typeof global === "object" &&
        typeof global.process === "object") {
        return env_utils.ENV.NODE
    }

    return env_utils.ENV.UNKNOWN;
}

env_utils.getEnvName = function () {
    const env = env_utils.getEnv();

    return ENV_NAMES[env];
}

env_utils.getOS = function () {
    const env = env_utils.getEnv();
    if (env === env_utils.ENV.NODE) {
        let osType = env_utils.OS.OTHERS;
        switch (process.platform) {
            case "darwin":
                osType = env_utils.OS.MACOS;
                break;
            case "linux":
                osType = env_utils.OS.LINUX;
                break;
            case "win32":
                osType = env_utils.OS.WINDOWS;
                break;
            case "android":
                osType = env_utils.OS.ANDROID;
                break;
        }
        return osType;
    }
    else if (env === env_utils.ENV.BROWSER) {
        const userAgent = navigator.userAgent;
        let osType = env_utils.OS.OTHERS;
        if (userAgent.indexOf("Win") !== -1) {
            osType = env_utils.OS.WINDOWS;
        }
        else if (userAgent.indexOf("Mac") !== -1) {
            osType = env_utils.OS.MACOS;
        }
        else if (userAgent.indexOf("Linux") !== -1) {
            osType = env_utils.OS.LINUX;
        }
        else if (userAgent.indexOf("Android") !== -1) {
            osType = env_utils.OS.ANDROID;
        }
        else if (userAgent.indexOf("IOS") !== -1 ||
            userAgent.indexOf("iPhone") !== -1 ||
            userAgent.indexOf("iPad") !== -1) {
            osType = env_utils.OS.IOS;
        }

        return osType;
    }

    return env_utils.OS.UNKNOWN;
}

env_utils.getOsName = function () {
    const osType = env_utils.getOS();
    return OS_NAMES[osType];
}

env_utils.getBrowserEnv = function () {
    const env = env_utils.getEnv();
    if (env !== env_utils.ENV.BROWSER) {
        return env_utils.BROWSER_ENV.UNKNOWN;
    }
    const osType = env_utils.getOS();

    if (osType === env_utils.OS.ANDROID ||
        osType === env_utils.OS.IOS) {
        return env_utils.BROWSER_ENV.MOBILE;
    }

    return env_utils.BROWSER_ENV.PC;
}

env_utils.getBrowserEnvName = function () {
    const browserEnv = env_utils.getBrowserEnv();
    return BROWSER_ENV_NAMES[browserEnv];
}
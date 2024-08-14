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
}

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

env_utils.getBrowserEnv = function () {
    const env = env_utils.getEnv();
    if (env !== env_utils.ENV.BROWSER) {
        return env_utils.BROWSER_ENV.UNKNOWN;
    }

    window.navigator.userAgent
}
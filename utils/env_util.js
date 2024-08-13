"use strict";

export const env_utils = {};

env_utils.ENV = {
    UNKNOWN: 0,
    NODE: 1,
    BROWSER: 2
}

env_utils.ENV_NAME = {
    [env_utils.ENV.UNKNOWN]: "unknown",
    [env_utils.ENV.NODE]: "node",
    [env_utils.ENV.BROWSER]: "browser"
}

env_utils.BROWSER_ENV = {
    UNKNOWN: 0,
    PC: 1,
    PHONE: 2
}

env_utils.BROWSER_ENV_NAME = {
    [env_utils.BROWSER_ENV.UNKNOWN]: "unknown",
    [env_utils.BROWSER_ENV.PC]: "pc",
    [env_utils.BROWSER_ENV.PHONE]: "phone"
}

env_utils.OS = {

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

    return env_utils.ENV_NAME[env];
}

env_utils.getBrowserEnv = function () {
    
}
import { Singleton, InjectSingleton } from "../../src/common/singleton.js";

// 1. 继承方式
export class AExtendService extends Singleton {

    showMeVersion() {
        console.log("[AExtendService] showMeVersion v2");
        return "AExtendService v2";
    }
}

class BRowProxyService {

    showMeVersion() {
        console.log("[BProxyService] showMeVersion v2");
        return "BProxyService v2";
    }
}

class CNewRowService {
    showMeVersion() {
        console.log("[CNewService] showMeVersion v2");
        return "CNewService v2";
    }
}

// 2. 代理方式
export const BProxyService = InjectSingleton(BRowProxyService);

// 3. 直接实例化
export const CNewService = new CNewRowService();


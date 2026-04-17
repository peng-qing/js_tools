import { Singleton, InjectSingleton } from "../../src/common/singleton.js";

// 1. 继承方式
export class AExtendService extends Singleton {

    showMeVersion() {
        console.log("[AExtendService] showMeVersion v1");
        return "AExtendService v1";
    }
}

class BRowProxyService {

    showMeVersion() {
        console.log("[BProxyService] showMeVersion v1");
        return "BProxyService v1";
    }
}

class CNewRowService {
    showMeVersion() {
        console.log("[CNewService] showMeVersion v1");
        return "CNewService v1";
    }
}

// 2. 代理方式
export const BProxyService = InjectSingleton(BRowProxyService);

// 3. 直接实例化
export const CNewService = new CNewRowService();


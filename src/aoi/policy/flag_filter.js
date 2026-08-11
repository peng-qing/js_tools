"use strict";

class FlagFilter {
    constructor(any = 0, need = 0, forbid = 0) {
        this.any = any;
        this.need = need;
        this.forbid = forbid;
    }

    matches(targetFlag) {
        return (
            // 不带禁止标志
            (this.forbid & targetFlag) === 0 &&
            // 需要标志匹配
            (this.need & targetFlag) === this.need &&
            // 任意标志匹配
            (this.any & targetFlag) !== 0
        );
    }
}

module.exports = FlagFilter;
"use strict";

import { random_utils } from "./utils/random_utils.js";

function main() {
    const m1 = new Map();
    m1.set(1, 1);

    const m2 = new Map(m1);
    m2.set(2, 100);

    console.log(m1, m2);

    const ret = random_utils.simpleWeightRandom(m2);

    console.log(ret);
}

main();
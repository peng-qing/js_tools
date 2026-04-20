"use strict";

const { Singleton, InjectSingleton } = require("../../src/common/singleton.js");

class TestSingleton extends Singleton {
    constructor() {
        super();
        this.name = "TestSingleton";
        this.version = "v1";
        this.count = 0;
    }

    toString() {
        return `${this.name} v${this.version} count: ${this.count}`;
    }
}

class RowInjectSingleton {
    constructor() {
        this.name = "RowInjectSingleton";
        this.version = "v1";
        this.count = 0;
    }

    toString() {
        return `${this.name} v${this.version} count: ${this.count}`;
    }
}

const TestInjectSingleton = InjectSingleton(RowInjectSingleton);


console.log(TestSingleton.getInstance().toString());
TestSingleton.getInstance().count++;
console.log(TestSingleton.getInstance().toString());

const injectV1 = new TestInjectSingleton();
console.log(injectV1.toString());
injectV1.count++;
console.log(injectV1.toString());
const injectV2 = new TestInjectSingleton();
console.log(injectV2.toString());
injectV2.count++;
console.log(injectV1.toString());
console.log(injectV2.toString());
console.log(injectV1 === injectV2);

// TestSingleton vv1 count: 0
// TestSingleton vv1 count: 1
// RowInjectSingleton vv1 count: 0
// RowInjectSingleton vv1 count: 1
// RowInjectSingleton vv1 count: 1
// RowInjectSingleton vv1 count: 2
// RowInjectSingleton vv1 count: 2
// true
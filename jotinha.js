const importFresh = require("import-fresh");
const clone = require("clone");
const z = require("./testeClass");

const x = importFresh("./testeClass");
console.log(x);

x.a = 10;
console.log(x);

z.a = 40;
// const y = Object.assign(require("./testeClass", {}));
const y = importFresh("./testeClass");
// const j = clone(z);
console.log("===");
// j.a = 55;
// console.log(j);
console.log(z);

console.log(y);
y.a = 20;
console.log(y);
z.a = 44;
console.log(x);
x.a = 30;

console.log(y);
console.log(z);
console.log(x);

y.a = 22;

console.log(y.getData());
console.log(z.getData());
console.log(x.getData());
// console.log(j.getData());

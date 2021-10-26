let a = 41122;

const Batata = {
  _a: 0,
  b: 1,
  c: 2,
  get a() {
    return a;
  },
  set a(val) {
    a = val;
  },
  //  getData: () => this._a,
  getData() {
    return a;
  },
};

// Batata.getData = () => Batata.a;

module.exports = Batata;

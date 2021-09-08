class GShape { // TODO: edit class variables
  constructor() {
    this.N = '';
    this.O = [];
  }
}

class GPath { // TODO: edit class variables
  constructor() {
    this.N = '';
    this.O = [];
  }
}

class GObject {
  constructor() {
    this.t = 1;
    this.p = 1;
    this.a = undefined;
  }
  
  setInterpolationMode(t) {
    this.t = t;
  }
  
  setAperture(a) {
    this.a = a;
  }
  
  setPolarity(p) {
    this.p = (p == 'D' || p == 1 ? 1 : 0);
  }
}

class GFlash extends GObject {
  constructor(P) {
    super();
    this.P = P;
  }
}

class GLine extends GObject {
  constructor(S, E) {
    super();
    this.S = S;
    this.E = E;
  }
}

class GArc extends GObject {
  constructor(C, I, J, t) {
    super();
    this.t = t;
    this.C = C;
    this.I = I;
    this.J = J;
  }
}

module.exports = {
  GPath: GPath,
  GShape: GShape,
  GObject: GObject,
  GLine: GLine,
  GArc: GArc,
  GFlash: GFlash
};

// src/models/prospecto.model.js

class RegisterSOne {
    constructor(data) {
        Object.assign(this, data);
    }
}

class RegisterSTwo {
    constructor(data) {
        Object.assign(this, data);
    }
}

class RegisterSThree {
    constructor(data) {
        Object.assign(this, data);
    }
}

class DistribuidorCompleto {
    constructor({ RegisterSOne: dataOne, RegisterSTwo: dataTwo, RegisterSThree: dataThree }) {
        this.RegisterSOne = new RegisterSOne(dataOne);
        this.RegisterSTwo = new RegisterSTwo(dataTwo);
        this.RegisterSThree = new RegisterSThree(dataThree);
    }
}

module.exports = {
    RegisterSOne,
    RegisterSTwo,
    RegisterSThree,
    DistribuidorCompleto,
};
  
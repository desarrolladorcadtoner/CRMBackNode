// src/models/prospecto.model.js

function limpiarEspacios(data) {
    const limpio = {};
    for (const key in data) {
        const valor = data[key];
        limpio[key] = typeof valor === 'string' ? valor.trim() : valor;
    }
    return limpio;
}

class RegisterSOne {
    constructor(data) {
        Object.assign(this, limpiarEspacios(data));
    }
}

class RegisterSTwo {
    constructor(data) {
        Object.assign(this, limpiarEspacios(data));
    }
}

class RegisterSThree {
    constructor(data) {
        Object.assign(this, limpiarEspacios(data));
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
  
// src/models/login.model.js

class LoginRequest {
    constructor({ usuario, password }) {
        this.usuario = usuario;
        this.password = password;
    }
}

class UsuarioNuevo {
    constructor({ us_idusr, us_nom, us_psw, us_depto }) {
        this.us_idusr = us_idusr;
        this.us_nom = us_nom;
        this.us_psw = us_psw;
        this.us_depto = us_depto;
    }
}

module.exports = {
    LoginRequest,
    UsuarioNuevo,
};
  
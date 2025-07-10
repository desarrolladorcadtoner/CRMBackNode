// src/models/confirmacion.model.js

class ConfirmacionDistribuidor {
    constructor({ rfc, accion, tipo_cliente_id }) {
        this.rfc = rfc;
        this.accion = accion;
        this.tipo_cliente_id = tipo_cliente_id || null;
    }
}

module.exports = {
    ConfirmacionDistribuidor,
};
  
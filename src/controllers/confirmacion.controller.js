// src/controllers/confirmacion.controller.js
const {
    generarPassword,
    getDistribuidorInfoPorRFC,
    getNextIdDistribuidor,
    insertUsuario,
    actualizarIdDistribuidorEnSteps,
    updateTipoCliente,
    actualizarStatusPorRFC,
    catalogoTipoCliente,
} = require("../services/confirmacion.service");
const { enviarCorreoBienvenida } = require("../utils/correo");

async function confirmarDistribuidor(req, res) {
    const { rfc, accion, tipo_cliente_id } = req.body;

    const distribuidor = await getDistribuidorInfoPorRFC(rfc);
    if (!distribuidor) return res.status(404).json({ message: "Distribuidor no encontrado" });

    if (accion.toLowerCase() === "aceptar") {
        if (!tipo_cliente_id) {
            return res.status(400).json({ message: "Debe incluir tipo_cliente_id" });
        }

        const pwd = generarPassword();
        const nuevoId = await getNextIdDistribuidor();

        await insertUsuario(distribuidor.CorreoFact, pwd, nuevoId);
        await updateTipoCliente(rfc, tipo_cliente_id);
        await actualizarIdDistribuidorEnSteps(rfc, nuevoId);
        await actualizarStatusPorRFC(rfc, "Terminado");

        try {
            await enviarCorreoBienvenida(distribuidor.CorreoFact, distribuidor.CorreoFact, pwd, nuevoId);
        } catch (err) {
            return res.status(500).json({ message: "Usuario creado, pero error al enviar correo", error: err.message });
        }

        res.json({
            message: "Distribuidor confirmado y correo enviado",
            usuario: distribuidor.CorreoFact,
            password: pwd,
            idDistribuidor: nuevoId,
        });
    } else if (accion.toLowerCase() === "denegar") {
        await actualizarStatusPorRFC(rfc, "Rechazado");
        res.json({ message: "Distribuidor denegado. Status actualizado." });
    } else {
        res.status(400).json({ message: "Acción inválida. Usa 'aceptar' o 'denegar'" });
    }

    const socket = net.createConnection(465, "mail.cadtoner.com.mx", () => {
        console.log("Conexión abierta ✅");
        socket.end();
      });
}

async function obtenerCatalogoTipoCliente(req, res) {
    try {
        const data = await catalogoTipoCliente();
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: "Error al obtener catálogo", error: err.message });
    }
}

module.exports = {
    confirmarDistribuidor,
    obtenerCatalogoTipoCliente,
};
  
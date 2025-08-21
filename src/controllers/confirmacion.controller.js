// src/controllers/confirmacion.controller.js
const net = require("net");
const bcrypt = require("bcrypt");

const {
    generarPassword,
    getDistribuidorInfoPorRFC,
    getNextIdDistribuidor,
    insertUsuario,
    actualizarIdDistribuidorEnSteps,
    updateTipoCliente,
    actualizarStatusPorRFC,
    catalogoTipoCliente,
    insertarDireccionDesdeRegisterSThree,
    upsertCreditos
} = require("../services/confirmacion.service");
const { enviarCorreoBienvenida, bienvenidaClienteWeb } = require("../utils/correo");

async function confirmarDistribuidor(req, res) {
    const { rfc, accion, tipo_cliente_id } = req.body;
    //console.log("IdDistribuidor: ", idDistribuidor);
    const distribuidor = await getDistribuidorInfoPorRFC(rfc);
    if (!distribuidor) return res.status(404).json({ message: "Distribuidor no encontrado" });

    if (accion === "Aceptar") {
        if (!tipo_cliente_id) {
            return res.status(400).json({ message: "Debe incluir tipo_cliente_id" });
        }

        const pwd = generarPassword();
        const nuevoId = await getNextIdDistribuidor();

        try {
            await enviarCorreoBienvenida(distribuidor.CorreoFact, distribuidor.CorreoFact, pwd)
        } catch (err) {
            return res.status(500).json({ message: "Usuario creado, pero error al enviar correo", error: err.message });
        }

        const hashedPwd = await bcrypt.hash(pwd, 10); // 3. ahora sí: la hasheamos

        await insertUsuario(distribuidor.CorreoFact, hashedPwd, nuevoId);
        await updateTipoCliente(rfc, tipo_cliente_id);
        await actualizarIdDistribuidorEnSteps(rfc, nuevoId);
        await actualizarStatusPorRFC(rfc, "Aceptado");
        await insertarDireccionDesdeRegisterSThree(rfc, nuevoId);

        if (req.body.creditos && typeof req.body.creditos === 'object') {
            try {
                console.log("📦 Créditos recibidos en el backend:", req.body.creditos);
                await upsertCreditos(nuevoId, req.body.creditos);
            } catch (error) {
                console.warn("⚠️ Créditos no insertados/actualizados:", error.message);
                // No detenemos la ejecución si los créditos fallan
            }
        }

        res.json({
            message: "Distribuidor confirmado y correo enviado",
            usuario: distribuidor.CorreoFact.trim(),
            password: pwd,
            idDistribuidor: nuevoId,
        });
    } else if (accion === "Denegar") {
        await actualizarStatusPorRFC(rfc, "Rechazado");
        res.json({ message: "Distribuidor denegado. Status actualizado." });
    } else {
        res.status(400).json({ message: "Acción inválida. Usa 'Aceptar' o 'Denegar'" });
    }

}

async function obtenerCatalogoTipoCliente(req, res) {
    try {
        const data = await catalogoTipoCliente();
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: "Error al obtener catálogo", error: err.message });
    }
}

async function confirmAltaDistExistente(req, res) {
    const { rfc, idDistribuidor, creditos } = req.body;
    //console.log("Id del Distribuidor a registrar: ", creditos)
    if (!rfc || !idDistribuidor) {
        return res.status(400).json({ message: "RFC e idDistribuidor son obligatorios" });
    }

    const distribuidor = await getDistribuidorInfoPorRFC(rfc);
    if (!distribuidor) return res.status(404).json({ message: "Distribuidor no encontrado" });

    const passwordPlano = generarPassword();

    try {
        await bienvenidaClienteWeb(distribuidor.CorreoFact, distribuidor.CorreoFact, passwordPlano)
    } catch (err) {
        return res.status(500).json({ message: "Usuario creado, pero error al enviar correo", error: err.message });
    }

    const passwordHash = await bcrypt.hash(passwordPlano, 10);

    try {
        await insertUsuario(distribuidor.CorreoFact, passwordHash, idDistribuidor);
        await actualizarIdDistribuidorEnSteps(rfc, idDistribuidor);
        await insertarDireccionDesdeRegisterSThree(rfc, idDistribuidor);

        /*if (req.body.creditos && typeof req.body.creditos === 'object') {
            try {
                console.log("📦 Créditos recibidos en el backend:", req.body.creditos);
                await upsertCreditos(idDistribuidor, creditos);
            } catch (error) {
                console.warn("⚠️ Créditos no insertados/actualizados:", error.message);
                // No detenemos la ejecución si los créditos fallan
            }
        }*/
        //await enviarCorreoBienvenida(distribuidor.CorreoFact, distribuidor.CorreoFact, passwordPlano);

        res.status(200).json({
            message: "Alta de Distribuidor Existente migrado y registrado correctamente.",
            usuario: distribuidor.CorreoFact.trim(),
            password: passwordPlano,
            idDistribuidor
        });
    } catch (err) {
        console.error("❌ Error al confirmar desde web:", err);
        res.status(500).json({ message: "Error interno al generar alta", error: err.message });
    }
}


module.exports = {
    confirmarDistribuidor,
    obtenerCatalogoTipoCliente,
    confirmAltaDistExistente
};
  
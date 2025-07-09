// src/controllers/login.controller.js
const { validarUsuario, insertarUsuario } = require("../services/login.service");
const { poolPromise } = require("../config/db");

async function login(req, res) {
    const { usuario, password } = req.body;
    console.log("🔍 Intentando login con:", usuario, password);

    try {
        const valido = await validarUsuario(usuario, password);
        if (valido) {
            return res.json({ message: "Usuario válido" });
        } else {
            return res.status(401).json({ message: "Usuario inválido" });
        }
    } catch (error) {
        return res.status(500).json({ message: "Error del servidor" });
    }
}

async function testConexion(req, res) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query("SELECT TOP 5 * FROM [CadCRM].[dbo].[c4users]");

        return res.json(result.recordset);
    } catch (err) {
        console.error("❌ Error al consultar usuarios:", err);
        return res.status(500).json({ error: "No se pudo consultar la base de datos" });
    }
}

async function crearUsuario(req, res) {
    try {
        const exito = await insertarUsuario(req.body);
        if (exito) {
            return res.json({ message: "Usuario insertado correctamente" });
        } else {
            return res.status(500).json({ message: "Error al insertar usuario" });
        }
    } catch (error) {
        return res.status(500).json({ message: "Error del servidor" });
    }
}

module.exports = {
    login,
    crearUsuario,
    testConexion
};

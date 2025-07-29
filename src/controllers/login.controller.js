// src/controllers/login.controller.js
const { validarUsuario, altaUsuarioCRM, getUsuarioByUsername } = require("../services/login.service");
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "secretKey"; // guarda esto en tu .env

async function loginUsuario(req, res) {
    const { usuario, password } = req.body;

    const esValido = await validarUsuario(usuario, password);
    if (!esValido) return res.status(401).json({ message: "Usuario inválido" });

    const user = await getUsuarioByUsername(usuario);

    const token = jwt.sign({ usuario: user.Usuario }, process.env.JWT_SECRET, {
        expiresIn: "1d",
    });

    // Enviar cookie segura
    res.cookie("token", token, {
        httpOnly: true,
        secure: false, // true si usas HTTPS
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({ message: "Usuario válido" }); // Ya no enviamos el token manualmente
}

/*async function testConexion(req, res) {
    try {
        const pool = await getConnection('DistCRM');
        const result = await pool.request()
            .query("SELECT TOP 5 * FROM [CadCRM].[dbo].[c4users]");

        return res.json(result.recordset);
    } catch (err) {
        console.error("❌ Error al consultar usuarios:", err);
        return res.status(500).json({ error: "No se pudo consultar la base de datos" });
    }
}*/

async function crearUsuario(req, res) {
    try {
        const exito = await altaUsuarioCRM(req.body);
        if (exito) {
            return res.json({ message: "Usuario insertado correctamente" });
        } else {
            return res.status(500).json({ message: "Error al insertar usuario" });
        }
    } catch (error) {
        return res.status(500).json({ message: "Error del servidor" });
    }
}

function logoutUsuario(req, res) {
    res.clearCookie("token");
    res.json({ message: "Sesión cerrada" });
}

module.exports = {
    loginUsuario,
    crearUsuario,
    logoutUsuario
};

// controllers/login.controller.js
const {
    validarUsuario,
    altaUsuarioCRM,
    getUsuarioByUsername,
    actualizarUltimoAcceso
} = require("../services/login.service");

const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "secretKey"; // ⚠️ cámbialo en tu .env

// ✅ Login
async function loginUsuario(req, res) {
    const { usuario, password } = req.body;

    try {
        const user = await validarUsuario(usuario, password);
        if (!user) {
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        // Actualizar último acceso
        await actualizarUltimoAcceso(usuario);

        // Generar token
        const token = jwt.sign(
            { id: user.Id, usuario: user.Usuario, rol: user.Rol },
            SECRET,
            { expiresIn: "1d" }
        );

        // Enviar cookie segura
        res.cookie("token", token, {
            httpOnly: true,
            secure: false, // ⚠️ pon true si usas HTTPS
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000,
        });

        res.json({
            message: "Login exitoso",
            usuario: {
                id: user.Id,
                nombre: user.Usuario,
                rol: user.Rol,
                departamento: user.Departamento,
                correo: user.CorreoCorporativo,
            },
        });
    } catch (error) {
        console.error("❌ Error en loginUsuario:", error);
        res.status(500).json({ message: "Error en servidor" });
    }
}

// ✅ Crear usuario nuevo
async function crearUsuario(req, res) {
    try {
        const exito = await altaUsuarioCRM(req.body);
        if (exito) {
            return res.json({ message: "Usuario creado correctamente" });
        } else {
            return res.status(500).json({ message: "Error al crear usuario" });
        }
    } catch (error) {
        console.error("❌ Error en crearUsuario:", error);
        return res.status(500).json({ message: "Error del servidor" });
    }
}

// ✅ Obtener perfil por username
async function obtenerUsuario(req, res) {
    try {
        const { username } = req.params;
        const user = await getUsuarioByUsername(username);
        if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

        res.json(user);
    } catch (error) {
        console.error("❌ Error en obtenerUsuario:", error);
        res.status(500).json({ message: "Error del servidor" });
    }
}

// ✅ Logout
function logoutUsuario(req, res) {
    res.clearCookie("token");
    res.json({ message: "Sesión cerrada" });
}

module.exports = {
    loginUsuario,
    crearUsuario,
    logoutUsuario,
    obtenerUsuario,
};

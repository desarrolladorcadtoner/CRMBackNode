// services/login.service.js
const { getConnection } = require("../config/db");
const bcrypt = require("bcrypt");

// ✅ Validar login (con contraseña encriptada)
async function validarUsuario(usuario, password) {
    const pool = await getConnection("DistCRM");
    const result = await pool
        .request()
        .input("Usuario", usuario)
        .query(`
            SELECT TOP 1 * FROM [CadCRM].[dbo].[UsuariosCRM]
            WHERE Usuario = @Usuario AND Activo = 1
        `);

    if (result.recordset.length === 0) return null;

    const user = result.recordset[0];

    // Verificar contraseña con bcrypt
    let match = false;

    // Si la contraseña está hasheada con bcrypt
    if (user.Password.startsWith("$2b$")) {
        match = await bcrypt.compare(password, user.Password);
    } else {
        // Comparación directa (contraseña en texto plano)
        match = (password === user.Password);
    }

    if (!match) return null;

    return user;
}

// ✅ Obtener usuario por username (útil para tokens, perfiles, validaciones)
async function getUsuarioByUsername(usuario) {
    const pool = await getConnection("DistCRM");
    const result = await pool
        .request()
        .input("Usuario", usuario)
        .query(`
            SELECT TOP 1 Id, Usuario, CorreoCorporativo, Rol, Departamento, Activo, FechaCreacion, UltimoAcceso
            FROM [CadCRM].[dbo].[UsuariosCRM]
            WHERE Usuario = @Usuario
        `);

    return result.recordset[0] || null;
}

// ✅ Crear un nuevo usuario en el CRM
async function altaUsuarioCRM({ Usuario, Password, CorreoCorporativo, Rol, Departamento }) {
    try {
        const pool = await getConnection("DistCRM");

        // Hashear contraseña antes de guardar
        const hashedPassword = await bcrypt.hash(Password, 10);

        await pool
            .request()
            .input("Usuario", Usuario)
            .input("Password", hashedPassword)
            .input("CorreoCorporativo", CorreoCorporativo || null)
            .input("Rol", Rol || "Empleado")
            .input("Departamento", Departamento || null)
            .query(`
                INSERT INTO [CadCRM].[dbo].[UsuariosCRM]
                (Usuario, Password, CorreoCorporativo, Rol, Departamento, Activo, FechaCreacion)
                VALUES (@Usuario, @Password, @CorreoCorporativo, @Rol, @Departamento, 1, GETDATE())
            `);

        return true;
    } catch (error) {
        console.error("❌ Error en altaUsuarioCRM:", error);
        return false;
    }
}

// ✅ Actualizar último acceso
async function actualizarUltimoAcceso(usuario) {
    const pool = await getConnection("DistCRM");
    await pool
        .request()
        .input("Usuario", usuario)
        .query(`
            UPDATE [CadCRM].[dbo].[UsuariosCRM]
            SET UltimoAcceso = GETDATE()
            WHERE Usuario = @Usuario
        `);
}

module.exports = {
    validarUsuario,
    getUsuarioByUsername,
    altaUsuarioCRM,
    actualizarUltimoAcceso,
};

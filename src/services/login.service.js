// src/services/login.service.js
const { getConnection } = require("../config/db");

async function validarUsuario(usuario, password) {
    const pool = await getConnection('DistCRM');
    const result = await pool
        .request()
        .input("usuario", usuario)
        .input("password", password)
        .query(`
            SELECT * FROM [CadCRM].[dbo].[c4users]
            WHERE us_idusr = @usuario AND us_psw = @password
        `);

    return result.recordset.length > 0;
}

async function getUsuarioByUsername(usuario) {
    const pool = await getConnection('DistCRM');
    const result = await pool
        .request()
        .input("usuario", usuario)
        .query(`
            SELECT * FROM [CadCRM].[dbo].[c4users]
            WHERE us_idusr = @usuario
        `);

    return result.recordset[0];
}

async function altaUsuarioCRM({ us_idusr, us_nom, us_psw, us_depto }) {
    try {
        const pool = await getConnection('DistWeb');
        await pool
            .request()
            .input("us_idusr", us_idusr)
            .input("us_nom", us_nom)
            .input("us_psw", us_psw)
            .input("us_depto", us_depto)
            .query(`
        INSERT INTO [CadCRM].[dbo].[c4users]
        (us_idusr, us_nom, us_psw, us_depto)
        VALUES (@us_idusr, @us_nom, @us_psw, @us_depto)
      `);
        return true;
    } catch (error) {
        console.error("Error en insertarUsuario:", error);
        return false;
    }
}

module.exports = {
    validarUsuario,
    altaUsuarioCRM,
    getUsuarioByUsername
};

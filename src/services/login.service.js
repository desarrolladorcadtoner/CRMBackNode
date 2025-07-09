// src/services/login.service.js
const { poolPromise } = require("../config/db");

async function validarUsuario(usuario, password) {
    try {
        const pool = await poolPromise;
        const result = await pool
            .request()
            .input("usuario", usuario)
            .input("password", password)
            .query(`
          SELECT COUNT(*) as total
          FROM [CadCRM].[dbo].[c4users]
          WHERE us_idusr = @usuario AND us_psw = @password
        `);

        //console.log("🧪 Resultado de validación:", result.recordset);
        return result.recordset[0].total > 0;
    } catch (error) {
        //console.error("Error en validarUsuario:", error);
        throw error;
    }
  }

async function insertarUsuario({ us_idusr, us_nom, us_psw, us_depto }) {
    try {
        const pool = await poolPromise;
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
    insertarUsuario,
};

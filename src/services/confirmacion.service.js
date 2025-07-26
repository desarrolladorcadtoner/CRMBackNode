// src/services/confirmacion.service.js
const { getConnection } = require('../config/db');
//const crypto = require("crypto");

// Funcion para generar una contraseña aleatoria
function generarPassword(longitud = 8) {
    const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length: Math.min(Math.max(longitud, 6), 10) }, () =>
        caracteres.charAt(Math.floor(Math.random() * caracteres.length))
    ).join("");
}

// Obtener información del distribuidor por RFC
async function getDistribuidorInfoPorRFC(rfc) {
    const pool = await getConnection('DistWeb');
    const result = await pool.request()
        .input("rfc", rfc)
        .query(`SELECT RazonSocial, CorreoFact FROM [CadDist].[dbo].[RegisterSOne] WHERE RFC = @rfc`);
    return result.recordset[0] || null;
}

// Obtener el siguiente ID de distribuidor
async function getNextIdDistribuidor() {
    const pool = await getConnection('DistWeb');
    const result = await pool.request()
    .query("SELECT IdDistribuidor FROM [CadDist].[dbo].[Usuarios]");
    const ids = result.recordset.map(row => parseInt(row.IdDistribuidor)).filter(n => !isNaN(n));
    return String((Math.max(...ids, 0)) + 1);
}

// Insertar un nuevo usuario en la tabla Usuarios
async function insertUsuario(usuario, password, idDistribuidor) {
    const pool = await getConnection('DistWeb');
    await pool
        .request()
        .input("usuario", usuario)
        .input("password", password)
        .input("idDistribuidor", idDistribuidor)
        .query(`
      INSERT INTO [CadDist].[dbo].[Usuarios] (Usuario, Password, IdDistribuidor)
      VALUES (@usuario, @password, @idDistribuidor)
    `);
}

// Actualizar el ID del distribuidor en las tablas de pasos
async function actualizarIdDistribuidorEnSteps(rfc, id) {
    const pool = await getConnection('DistWeb');
    const tablas = ["RegisterSOne", "RegisterSTwo", "RegisterSThree", "RegisterSFour"];
    for (const tabla of tablas) {
        await pool
            .request()
            .input("id", id)
            .input("rfc", rfc)
            .query(`
        UPDATE [CadDist].[dbo].[${tabla}]
        SET IdDistribuidor = @id
        WHERE RFC = @rfc
      `);
    }
}

// Update tipo cliente por RFC
async function updateTipoCliente(rfc, tipoId) {
    const pool = await getConnection('DistWeb');
    await pool
        .request()
        .input("id", tipoId)
        .input("rfc", rfc)
        .query(`
      UPDATE [CadDist].[dbo].[RegisterSOne]
      SET TipoClienteId = @id
      WHERE RFC = @rfc
    `);
}

// Actualizar el estado del distribuidor por RFC
async function actualizarStatusPorRFC(rfc, status) {
    const pool = await getConnection('DistWeb');
    await pool
        .request()
        .input("status", status)
        .input("rfc", rfc)
        .query(`
            UPDATE [CadDist].[dbo].[RegisterSOne]
            SET Status = @status
            WHERE RFC = @rfc
        `);
}

// Obtener el catálogo de tipos de cliente
async function catalogoTipoCliente() {
    const pool = await getConnection('DistWeb');
    const result = await pool.request().query("SELECT * FROM [CadDist].[dbo].[TipoCliente]");
    return result.recordset;
}

// Insertar dirección desde RegisterSThree a DireccionesDistribuidor
async function insertarDireccionDesdeRegisterSThree(rfc, idDistribuidor) {
    const pool = await getConnection('DistWeb');

    // 1. Obtener datos de RegisterSThree
    const result = await pool
        .request()
        .input("rfc", rfc)
        .query(`
            SELECT calleEntrega, numExtEntrega, numIntEntrega,
                   coloniaEntrega, codigoPostalEntrega, estadoEntrega, ciudadEntrega
            FROM [CadDist].[dbo].[RegisterSThree]
            WHERE RFC = @rfc
        `);

    if (result.recordset.length === 0) return;

    const direccion = result.recordset[0];

    // 2. Insertar en DireccionesDistribuidor
    await pool
        .request()
        .input("IdDistribuidor", idDistribuidor)
        .input("Calle", direccion.calleEntrega)
        .input("NumExt", direccion.numExtEntrega)
        .input("NumInt", direccion.numIntEntrega)
        .input("Colonia", direccion.coloniaEntrega)
        .input("CodigoPostal", direccion.codigoPostalEntrega)
        .input("Estado", direccion.estadoEntrega)
        .input("Ciudad", direccion.ciudadEntrega)
        .input("TipoDireccion", 'Entrega')
        .query(`
            INSERT INTO [CadDist].[dbo].[DireccionesDistribuidor] (
                IdDistribuidor, Calle, NumExt, NumInt, Colonia,
                CodigoPostal, Estado, Ciudad, TipoDireccion
            )
            VALUES (
                @IdDistribuidor, @Calle, @NumExt, @NumInt, @Colonia,
                @CodigoPostal, @Estado, @Ciudad, @TipoDireccion
            )
        `);
}

module.exports = {
    generarPassword,
    getDistribuidorInfoPorRFC,
    getNextIdDistribuidor,
    insertUsuario,
    actualizarIdDistribuidorEnSteps,
    updateTipoCliente,
    actualizarStatusPorRFC,
    catalogoTipoCliente,
    insertarDireccionDesdeRegisterSThree,
};

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
        .input("correo", usuario)
        .input("password", password)
        .input("idDistribuidor", idDistribuidor)
        .query(`
      INSERT INTO [CadDist].[dbo].[Usuarios] (Usuario, Correo, Password, IdDistribuidor)
      VALUES (@usuario, @correo, @password, @idDistribuidor)
    `);
}

// Actualizar el ID del distribuidor en las tablas de pasos
async function actualizarIdDistribuidorEnSteps(rfc, id) {
    const pool = await getConnection('DistWeb');
    const tablas = ["RegisterSOne", "RegisterSTwo", "RegisterSThree", "RegisterSFour", "SeguimientoCliente"];
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

async function upsertCreditos(idDistribuidor, creditos) {
    const pool = await getConnection('DistWeb');

    const check = await pool.request()
        .input("id", idDistribuidor)
        .query(`SELECT COUNT(*) as existe FROM [dbo].[DescuentosDistribuidores] WHERE IdDistribuidor = @id`);

    const existe = check.recordset[0]?.existe > 0;

    const {
        LimiteCredito,
        DiasCredito,
        DescuentoAutorizado,
        Des_TinGra,
        Des_InsTon,
        Des_InsTin,
        Des_CarTon,
        Des_CarTin
    } = creditos;

    const LineaProducto = 'TODOS'; // o alguna lógica si manejas distintas líneas
    const Descuento = 0; // si necesitas un campo genérico base

    if (existe) {
        await pool.request()
            .input("LimiteCredito", LimiteCredito)
            .input("DiasCredito", DiasCredito)
            .input("DescuentoAutorizado", DescuentoAutorizado)
            .input("DescuentoTintaGranel", Des_TinGra)
            .input("DescuentoInsumoToner", Des_InsTon)
            .input("DescuentoInsumoTinta", Des_InsTin)
            .input("DescuentoCartuchoToner", Des_CarTon)
            .input("DescuentoCartuchoTinta", Des_CarTin)
            .input("IdDistribuidor", idDistribuidor)
            .query(`
                UPDATE [dbo].[DescuentosDistribuidores]
                SET LimiteCredito = @LimiteCredito,
                    DiasCredito = @DiasCredito,
                    DescuentoAutorizado = @DescuentoAutorizado,
                    DescuentoTintaGranel = @DescuentoTintaGranel,
                    DescuentoInsumoToner = @DescuentoInsumoToner,
                    DescuentoInsumoTinta = @DescuentoInsumoTinta,
                    DescuentoCartuchoToner = @DescuentoCartuchoToner,
                    DescuentoCartuchoTinta = @DescuentoCartuchoTinta
                WHERE IdDistribuidor = @IdDistribuidor
            `);
    } else {
        await pool.request()
            .input("IdDistribuidor", idDistribuidor)
            .input("LineaProducto", LineaProducto)
            .input("Descuento", Descuento)
            .input("LimiteCredito", LimiteCredito)
            .input("DiasCredito", DiasCredito)
            .input("DescuentoAutorizado", DescuentoAutorizado)
            .input("DescuentoTintaGranel", Des_TinGra)
            .input("DescuentoInsumoToner", Des_InsTon)
            .input("DescuentoInsumoTinta", Des_InsTin)
            .input("DescuentoCartuchoToner", Des_CarTon)
            .input("DescuentoCartuchoTinta", Des_CarTin)
            .query(`
                INSERT INTO [dbo].[DescuentosDistribuidores] (
                    IdDistribuidor,
                    LineaProducto,
                    Descuento,
                    LimiteCredito,
                    DiasCredito,
                    DescuentoAutorizado,
                    DescuentoTintaGranel,
                    DescuentoInsumoToner,
                    DescuentoInsumoTinta,
                    DescuentoCartuchoToner,
                    DescuentoCartuchoTinta
                ) VALUES (
                    @IdDistribuidor,
                    @LineaProducto,
                    @Descuento,
                    @LimiteCredito,
                    @DiasCredito,
                    @DescuentoAutorizado,
                    @DescuentoTintaGranel,
                    @DescuentoInsumoToner,
                    @DescuentoInsumoTinta,
                    @DescuentoCartuchoToner,
                    @DescuentoCartuchoTinta
                )
            `);
    }

    return { ok: true, operacion: existe ? 'actualizado' : 'insertado' };
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
    upsertCreditos
};

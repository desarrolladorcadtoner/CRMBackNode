const { getConnection } = require("../config/db");

/* ----- Get informacion ----- */

async function obtenerDistribuidoresSiscad(){
    const pool = await getConnection('Siscad');
    const result = await pool.request().query(`
    SELECT cl_clte, cl_nomb, cl_rfc, cl_email, cl_tipcl, cl_dire, cl_colonia, cl_ciud, cl_edo, cl_codpost
    FROM [SISCAD].[dbo].[cad4cli0]
    WHERE cvetipcl IN ( 2, 3 )
    `);

    return result.recordset.map(dist => {
        const base = {
            IdDistribuidor: dist.cl_clte || 0,
            RFC: dist.cl_rfc?.trim() || '',
            RazonSocial: dist.cl_nomb?.trim() || '',
            CorreoFact: dist.cl_email?.trim() || '',
            TipoPersona: dist.cl_tipcl?.trim() || '',
            Calle: dist.cl_dire?.trim() || '',
            Colonia: dist.cl_colonia?.trim() || '',
            Municipio: dist.cl_ciud?.trim() || '',
            Estado: dist.cl_edo?.trim() || '',
            CP: dist.cl_codpost?.trim() || '',
        };
        return base;
    });
}

async function obtenerDatoDistribuidor(cl_clte){
    const pool = await getConnection('Siscad');

    // 1. Obtener datos fiscales básicos
    const datosResult = await pool.request()
        .input('cl_clte', cl_clte)
        .query(`
            SELECT 
                cl_nomb, cl_dire, cl_ext, cl_colonia, cl_ciud, 
                cl_edo, cl_codpost, cl_rfc, tipoper, cl_telef,
                cl_email, cvetipcl
            FROM [dbo].[cad4cli0]
            WHERE cl_clte = @cl_clte
        `);

    const datos = datosResult.recordset[0];
    if (!datos) return null;

    //#region  datos depsues del registro A
    // 2. Obtener RegFisId desde cad4cli0_10
    const regimenResult = await pool.request()
        .input('cl_clte', cl_clte)
        .query(`
            SELECT RegFisId
            FROM [dbo].[cad4cli0_10]
            WHERE cl_clte = @cl_clte
        `);

    const RegFisId = regimenResult.recordset[0]?.RegFisId;

    let RegimenSAT = '';
    let RegimenDescripcion = '';

    // 3. Obtener cvesat y desc_mov desde c4idmov
    if (RegFisId) {
        const movResult = await pool.request()
            .input('RegFisId', RegFisId)
            .query(`
                SELECT cvesat, desc_mov
                FROM [dbo].[c4idmov]
                WHERE tipo_mov = 41 AND id_mov = @RegFisId
            `);

        const regimenInfo = movResult.recordset[0];
        if (regimenInfo) {
            RegimenSAT = regimenInfo.cvesat?.trim() || '';
            RegimenDescripcion = regimenInfo.desc_mov?.trim() || '';
        }
    }
    //#endregion

    // 4. Retornar todo junto
    return {
        TipoPersona: datos.tipoper === 1 ? 'Física' : 'Moral',
        Nombre: datos.cl_nomb?.trim() || '',
        Calle: datos.cl_dire?.trim() || '',
        NumExt: datos.cl_ext?.trim() || '',
        Colonia: datos.cl_colonia?.trim() || '',
        Ciudad: datos.cl_ciud?.trim() || '',
        Estado: datos.cl_edo?.trim() || '',
        CodigoPostal: datos.cl_codpost?.trim() || '',
        TipoClienteId: datos.cvetipcl || '',
        RFC: datos.cl_rfc?.trim() || '',
        NumContacto: datos.cl_telef?.trim() || '',
        Correo: datos.cl_email?.trim() || '',
        RegimenSAT,
        RegimenDescripcion
    };
}

/* ----- Search Distribuidor por identificador unico ----- */

async function buscarDistribuidorPorRFC(rfc) {
    const pool = await getConnection('Siscad');
    const result = await pool.request()
        .input("rfc", rfc)
        .query(`
            SELECT cl_clte, cl_nomb, cl_rfc, cl_email, cl_tipcl, cl_dire, cl_colonia, cl_ciud, cl_edo, cl_codpost
            FROM [SISCAD].[dbo].[cad4cli0]
            WHERE cl_rfc = @rfc
              AND cvetipcl IN (1, 2, 3, 8)
        `);

    return result.recordset.map(dist => ({
        IdDistribuidor: dist.cl_clte || 0,
        RFC: dist.cl_rfc?.trim() || '',
        RazonSocial: dist.cl_nomb?.trim() || '',
        CorreoFact: dist.cl_email?.trim() || '',
        TipoPersona: dist.cl_tipcl?.trim() || '',
        Calle: dist.cl_dire?.trim() || '',
        Colonia: dist.cl_colonia?.trim() || '',
        Municipio: dist.cl_ciud?.trim() || '',
        Estado: dist.cl_edo?.trim() || '',
        CP: dist.cl_codpost?.trim() || '',
    }));
}

async function buscarDistribuidorPorIdDistribuidor(id) {
    const pool = await getConnection('Siscad');
    const result = await pool.request()
        .input("id", id)
        .query(`
            SELECT cl_clte, cl_nomb, cl_rfc, cl_email, cl_tipcl, cl_dire, cl_colonia, cl_ciud, cl_edo, cl_codpost
            FROM [SISCAD].[dbo].[cad4cli0]
            WHERE cl_clte = @id
              AND cvetipcl IN (1, 2, 3, 8)
        `);

    return result.recordset.map(dist => ({
        IdDistribuidor: dist.cl_clte || 0,
        RFC: dist.cl_rfc?.trim() || '',
        RazonSocial: dist.cl_nomb?.trim() || '',
        CorreoFact: dist.cl_email?.trim() || '',
        TipoPersona: dist.cl_tipcl?.trim() || '',
        Calle: dist.cl_dire?.trim() || '',
        Colonia: dist.cl_colonia?.trim() || '',
        Municipio: dist.cl_ciud?.trim() || '',
        Estado: dist.cl_edo?.trim() || '',
        CP: dist.cl_codpost?.trim() || '',
    }));
}

async function buscarDistribuidorPorNombre(nombre) {
    const pool = await getConnection('Siscad');
    const result = await pool.request()
        .input("nombre", `%${nombre}%`)
        .query(`
            SELECT cl_clte, cl_nomb, cl_rfc, cl_email, cl_tipcl, cl_dire, cl_colonia, cl_ciud, cl_edo, cl_codpost
            FROM [SISCAD].[dbo].[cad4cli0]
            WHERE cl_nomb LIKE @nombre
            AND cvetipcl IN (1, 2, 3, 8)
        `);
    /*/*AND cl_fecvta >= DATEADD(YEAR, -2, GETDATE())*/
    return result.recordset.map(dist => ({
        IdDistribuidor: dist.cl_clte || 0,
        RFC: dist.cl_rfc?.trim() || '',
        RazonSocial: dist.cl_nomb?.trim() || '',
        CorreoFact: dist.cl_email?.trim() || '',
        TipoPersona: dist.cl_tipcl?.trim() || '',
        Calle: dist.cl_dire?.trim() || '',
        Colonia: dist.cl_colonia?.trim() || '',
        Municipio: dist.cl_ciud?.trim() || '',
        Estado: dist.cl_edo?.trim() || '',
        CP: dist.cl_codpost?.trim() || '',
    }));
}

/* ----- Update de informacion de 1 distribuidor----- */
async function updateCorreoDistribuidor(idDistribuidor, nuevoCorreo) {
    const pool = await getConnection('Siscad');
    await pool.request()
        .input("correo", nuevoCorreo)
        .input("id", idDistribuidor)
        .query(`
            UPDATE [dbo].[cad4cli0]
            SET cl_email = @correo
            WHERE cl_clte = @id
        `);
}

async function updateContactoDistribuidor(idDistribuidor, nuevoContacto) {
    const pool = await getConnection('Siscad');
    await pool.request()
        .input("telefono", nuevoContacto)
        .input("id", idDistribuidor)
        .query(`
            UPDATE [dbo].[cad4cli0]
            SET cl_telef = @telefono
            WHERE cl_clte = @id
        `);
}

module.exports = {
    obtenerDistribuidoresSiscad,
    obtenerDatoDistribuidor,
    buscarDistribuidorPorRFC,
    buscarDistribuidorPorNombre,
    buscarDistribuidorPorIdDistribuidor,
    updateCorreoDistribuidor,
    updateContactoDistribuidor
};
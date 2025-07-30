const { getConnection } = require("../config/db");

async function obtenerDistribuidoresSiscad(){
    const pool = await getConnection('Siscad');
    const result = await pool.request().query(`
    SELECT cl_clte, cl_nomb, cl_rfc, cl_email, cl_tipcl, cl_dire, cl_colonia, cl_ciud, cl_edo, cl_codpost
    FROM [SISCAD].[dbo].[cad4cli0]
    WHERE cvetipcl IN (2, 3)
      AND cl_fecvta >= DATEADD(YEAR, -2, GETDATE())
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

async function buscarDistribuidorPorRFC(rfc) {
    const pool = await getConnection('Siscad');
    const result = await pool.request()
        .input("rfc", rfc)
        .query(`
            SELECT cl_clte, cl_nomb, cl_rfc, cl_email, cl_tipcl, cl_dire, cl_colonia, cl_ciud, cl_edo, cl_codpost
            FROM [SISCAD].[dbo].[cad4cli0]
            WHERE cl_rfc = @rfc
              AND cvetipcl IN (2, 3)
              AND cl_fecvta >= DATEADD(YEAR, -2, GETDATE())
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
              AND cvetipcl IN (2, 3)
              AND cl_fecvta >= DATEADD(YEAR, -2, GETDATE())
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

module.exports = {
    obtenerDistribuidoresSiscad,
    buscarDistribuidorPorRFC,
    buscarDistribuidorPorNombre
};
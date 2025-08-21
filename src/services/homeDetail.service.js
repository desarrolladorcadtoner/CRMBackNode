const { getConnection } = require("../config/db");

//#region Gestion de Productos
// 1. Total de productos
async function getTotalProductos() {
    const pool = await getConnection('CadDist');
    const result = await pool.request().query(`
        SELECT COUNT(*) AS total FROM [dbo].[Productos]
        WHERE TiendaId = 1
    `);
    return result.recordset[0].total;
}

// 2. Productos sin actualizar hace más de 1 año
async function getProductosSinActualizar() {
    const pool = await getConnection('CadDist');
    const result = await pool.request().query(`
        SELECT COUNT(*) AS total FROM [dbo].[Productos]
        WHERE ProductoDateUpd < DATEADD(YEAR, -1, GETDATE())
        AND TiendaId = 1
    `);
    return result.recordset[0].total;
}

// 3. Productos con datos nulos o vacíos en columnas clave
async function getProductosConCamposNulos(columna) {
    const pool = await getConnection('CadDist');

    // Lista de columnas que pertenecen a ProductosLang
    const columnasProductosLang = [
        "ProductoLangImagen",
        "ProductoLangImagenNombre"
        // agregar más en el futuro
    ];

    let query = "";

    if (columnasProductosLang.includes(columna)) {
        // Columna de ProductosLang
        query = `
            SELECT COUNT(*) AS total
            FROM [dbo].[Productos] p
            INNER JOIN [dbo].[ProductosLang] pl
                ON p.ProductoId = pl.ProductoId
            WHERE p.TiendaId = 1
              AND (pl.${columna} IS NULL OR LTRIM(RTRIM(pl.${columna})) = '')
        `;
    } else {
        // Columna de Productos
        query = `
            SELECT COUNT(*) AS total
            FROM [dbo].[Productos] p
            WHERE p.TiendaId = 1
              AND (p.${columna} IS NULL OR LTRIM(RTRIM(p.${columna})) = '')
        `;
    }

    const result = await pool.request().query(query);
    return result.recordset[0]?.total ?? 0;
}

// 4. Filtro de productos por nombre, referencia, id o categoría
async function filtrarProductos({ referencia, id, categoria, nombre }) {
    const pool = await getConnection('CadDist');

    const condiciones = [];
    if (referencia) condiciones.push(`ProductoReference LIKE '%' + @referencia + '%'`);
    if (id) condiciones.push(`ProductoId = @id`);
    if (categoria) condiciones.push(`CategoriaDescripcion LIKE '%' + @categoria + '%'`);
    if (nombre) condiciones.push(`ProductoLangName LIKE '%' + @nombre + '%'`);

    if (condiciones.length === 0) return [];

    const request = pool.request();
    if (referencia) request.input("referencia", referencia);
    if (id) request.input("id", id);
    if (categoria) request.input("categoria", categoria);
    if (nombre) request.input("nombre", nombre);

    const result = await request.query(`
        SELECT ProductoId, ProductoReference, ProductoLangName, CategoriaDescripcion, ProductoDateUpd
        FROM [dbo].[ProductosFin]
        WHERE ${condiciones.join(" AND ")}
    `);

    return result.recordset;
}

// 5. Productos que no cuentan con productos relacionados
async function getProductosSinReferencia() {
    const pool = await getConnection('CadDist');
    const result = await pool.request().query(`
        SELECT COUNT(*) AS total
        FROM [dbo].[Productos] p
        LEFT JOIN [dbo].[ProductosRelacionadosProductos] pr
            ON p.ProductoId = pr.ProductoId
        WHERE p.TiendaId = 1
          AND pr.ProductoId IS NULL
    `);
    return result.recordset[0]?.total ?? 0;
}
//#endregion

//#region  Gestion de prospectos 

async function getTotalProspectos() {
    const pool = await getConnection('DistWeb');
    const result = await pool.request().query(`
        SELECT COUNT(*) AS total FROM RegisterSOne
    `);
    return result.recordset[0].total;
}

async function getProspectosPorStatus(status) {
    const pool = await getConnection('DistWeb');

    // Para "Aceptado" y "Pendiente" contamos solo los que en seguimiento figuran como "Nuevo"
    const queryAceptadoOPendiente = `
    SELECT COUNT(*) AS total
    FROM dbo.RegisterSOne r
    INNER JOIN dbo.SeguimientoCliente s
      ON s.RFC = r.RFC
    WHERE r.Status = @status
      AND s.tipoRegistro = 'Nuevo'
  `;

    // Para otros estatus (p.ej. "Rechazado") contamos directo sin filtrar por seguimiento
    const queryDefault = `
        SELECT COUNT(*) AS total
        FROM dbo.RegisterSOne
        WHERE Status = @status
    `;

    const query = (status === 'Aceptado' || status === 'Pendiente')
        ? queryAceptadoOPendiente
        : queryDefault;

    const result = await pool.request()
        .input('status', status)
        .query(query);

    return result.recordset[0]?.total ?? 0;
}
//#endregion

//#region Gestion de Distribuidores de Siscad

async function getTotalDistribuidoresSiscad() {
    const pool = await getConnection('Siscad');
    const result = await pool.request().query(`
        SELECT COUNT(*) AS total
        FROM [SISCAD].[dbo].[cad4cli0]
        WHERE cvetipcl IN (2, 3)
        AND cl_fecvta >= DATEADD(YEAR, -2, GETDATE())
    `);
    return result.recordset[0].total;
}

async function getTotalMigrados() {
    const poolCad = await getConnection('Siscad');
    const poolCRM = await getConnection('CadDist');

    const clientesSiscad = await poolCad.request().query(`
        SELECT DISTINCT cl_rfc FROM [SISCAD].[dbo].[cad4cli0]
        WHERE cl_rfc IS NOT NULL AND LTRIM(RTRIM(cl_rfc)) != ''
        AND cvetipcl IN (2, 3)
        AND cl_fecvta >= DATEADD(YEAR, -2, GETDATE())
    `);

    const rfcs = clientesSiscad.recordset.map(row => `'${row.cl_rfc.trim()}'`).join(",");
    if (rfcs.length === 0) return 0;

    const result = await poolCRM.request().query(`
        SELECT COUNT(*) AS totalMigrados
        FROM [CadDist].[dbo].[SeguimientoCliente]
        WHERE tipoRegistro = 'migrado'
        AND RTRIM(LTRIM(RFC)) IN (${rfcs})
    `);

    return result.recordset[0].totalMigrados;
}

async function getTotalPendientesMigrar() {
    const poolCad = await getConnection('Siscad');
    const poolCRM = await getConnection('CadDist');

    // 1. Traemos los RFCs válidos de SISCAD
    const siscadResult = await poolCad.request().query(`
        SELECT cl_rfc
        FROM [SISCAD].[dbo].[cad4cli0]
        WHERE cvetipcl IN (2, 3)
        AND cl_fecvta >= DATEADD(YEAR, -2, GETDATE())
    `);
    const rfcsSiscad = siscadResult.recordset.map(row => row.cl_rfc?.trim()).filter(Boolean);

    // 2. Traemos los RFCs migrados desde SeguimientoCliente
    const crmResult = await poolCRM.request().query(`
        SELECT RFC
        FROM [CadDist].[dbo].[SeguimientoCliente]
    `);
    const rfcsMigrados = new Set(crmResult.recordset.map(row => row.RFC?.trim()).filter(Boolean));

    // 3. Filtramos los RFCs que NO estén en los migrados
    const pendientes = rfcsSiscad.filter(rfc => !rfcsMigrados.has(rfc));

    return pendientes.length;
}

//#endregion 


module.exports = {
    getTotalProductos,
    getProductosSinActualizar,
    getProductosConCamposNulos,
    filtrarProductos,
    getTotalProspectos,
    getProspectosPorStatus,
    getTotalDistribuidoresSiscad,
    getTotalMigrados,
    getTotalPendientesMigrar,
    getProductosSinReferencia
};

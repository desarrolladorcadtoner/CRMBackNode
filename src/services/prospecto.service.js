// src/services/prospecto.service.js
const { poolPromise } = require("../config/db");
const fs = require("fs");
const path = require("path");

async function obtenerDatosDistribuidorPorRFC(rfc) {
    const pool = await poolPromise;

    const consulta = async (query, rfc) => {
        const result = await pool.request().input("rfc", rfc).query(query);
        const cols = result.recordset.columns ? Object.keys(result.recordset.columns) : Object.keys(result.recordset[0] || {});
        return result.recordset.length ? { row: result.recordset[0], cols } : null;
    };

    const secciones = await Promise.all([
        consulta(`SELECT * FROM [CadDist].[dbo].[RegisterSOne] WHERE RFC = @rfc`, rfc),
        consulta(`SELECT * FROM [CadDist].[dbo].[RegisterSTwo] WHERE RFC = @rfc`, rfc),
        consulta(`SELECT * FROM [CadDist].[dbo].[RegisterSThree] WHERE RFC = @rfc`, rfc),
    ]);

    if (secciones.includes(null)) return null;

    return {
        RegisterSOne: secciones[0].row,
        RegisterSTwo: secciones[1].row,
        RegisterSThree: secciones[2].row,
    };
}

async function obtenerDistribuidoresFiltrados() {
    const pool = await poolPromise;
    const result = await pool.request().query(`
    SELECT RFC, TipoPersona, RazonSocial, NombreComercial, Telefono, CorreoFact
    FROM [CadDist].[dbo].[RegisterSOne]
    WHERE RFC IS NOT NULL AND RFC != ''
  `);

    return result.recordset.map(dist => {
        const base = {
            RFC: dist.RFC,
            TipoPersona: dist.TipoPersona,
            RazonSocial: dist.RazonSocial,
            CorreoFact: dist.CorreoFact,
            Telefono: dist.Telefono,
        };
        if (dist.TipoPersona.toLowerCase() === "moral") {
            base.NombreComercial = dist.NombreComercial;
        }
        return base;
    });
}

async function obtenerDocumentosPorRFC(rfc) {
    const pool = await poolPromise;
    const result = await pool.request()
        .input("rfc", rfc)
        .query(`
      SELECT actaConstitutiva, constanciaFiscal, comprobanteDomicilio, edoCuenta, ine
      FROM [CadDist].[dbo].[RegisterSFour]
      WHERE RFC = @rfc
    `);

    if (!result.recordset.length) return null;

    const row = Object.values(result.recordset[0]);
    const names = ["actaConstitutiva", "constanciaFiscal", "comprobanteDomicilio", "edoCuenta", "ine"];
    const allowedTypes = {
        '%PDF': '.pdf',
        '\xFF\xD8\xFF': '.jpg',
        '\x89PNG\r\n\x1a\n': '.png',
        '\xD0\xCF\x11\xE0': '.doc',
        'PK\x03\x04': '.docx',
    };

    const outputDir = path.resolve("documentos");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const archivos = {};

    row.forEach((contenido, i) => {
        if (!contenido) return;
        let extension = null;
        for (let firma in allowedTypes) {
            if (contenido.toString("binary").startsWith(firma)) {
                extension = allowedTypes[firma];
                break;
            }
        }
        if (extension) {
            const filename = `${names[i]}${extension}`;
            const fullPath = path.join(outputDir, filename);
            fs.writeFileSync(fullPath, contenido);
            archivos[filename] = fullPath;
        }
    });

    return archivos;
}

module.exports = {
    obtenerDatosDistribuidorPorRFC,
    obtenerDistribuidoresFiltrados,
    obtenerDocumentosPorRFC,
};

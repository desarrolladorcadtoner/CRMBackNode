// src/services/prospecto.service.js
const { getConnection } = require("../config/db");
const fs = require("fs");
const path = require("path");

/* ---------- Funcion Query para ejectura consultas a enviar ---------- */

async function executeQuery(dbName, query, params = []) {
    try {
        const pool = await getConnection(dbName);
        const request = pool.request();
        params.forEach((param, i) => request.input(`param${i}`, param));
        const result = await request.query(query);
        return result.recordset;
    } catch (error) {
        console.error('❌ Error en executeQuery:', error);
        return [];
    }
}

/* ------ Funciones existentes del prsopecto para el CRM */

async function obtenerDatosDistribuidorPorRFC(rfc) {
    const pool = await getConnection('DistWeb');

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
    const pool = await getConnection('DistWeb');
    const result = await pool.request().query(`
    SELECT RFC, TipoPersona, RazonSocial, NombreComercial, Telefono, CorreoFact
    FROM [CadDist].[dbo].[RegisterSOne]
    WHERE RFC IS NOT NULL AND RFC != ''
  `);

    return result.recordset.map(dist => {
        const base = {
            RFC: dist.RFC?.trim() || '',
            TipoPersona: dist.TipoPersona?.trim() || '',
            RazonSocial: dist.RazonSocial?.trim() || '',
            CorreoFact: dist.CorreoFact?.trim() || '',
            Telefono: dist.Telefono?.trim() || '',
        };
        if (dist.TipoPersona.toLowerCase() === "moral") {
            base.NombreComercial = dist.NombreComercial;
        }
        return base;
    });
}

async function obtenerDocumentosPorRFC(rfc) {
    const pool = await getConnection('DistWeb');
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

 //#region Funciones para enviar el prospecto nuevo o migrado a Siscado o autmotaico
    /* ---------- Funcion de get para compartir la informacion a externo ---------- */
    //#region Funciones para obtener los datos generales a enviar del prospecto 
    // Obtener info principal del prospecto (RegisterSOne)
    async function getDataProspectoGeneral(rfcProspecto) {
        const query = `
            SELECT IdDistribuidor, RazonSocial, RFC AS RfcProspecto, TipoPersona, TipoClienteId
            FROM  [dbo].[RegisterSOne]
            WHERE RFC = @param0
        `;
        const data = await executeQuery('DistWeb', query, [rfcProspecto]);
        if (!data[0]) return null;

        const row = data[0];

        // Espera correctamente la respuesta asíncrona
        const tipoCliente = await getTipoClienteProspecto(row.TipoClienteId);
        //console.log(tipoCliente);
        return {
            ClienteId: row.IdDistribuidor,
            ClienteNombre: row.RazonSocial?.trim() || '',
            ClienteRFC: row.RfcProspecto?.trim() || '',
            TipoContribuyente: row.TipoPersona?.trim() || '',
            TipoClienteId: row.TipoClienteId || 0,
            TipoCliente: tipoCliente || 'Sin Datos'
        };
    }

    // Obtener descripción del tipo de cliente desde SISCAD
    async function getTipoClienteProspecto(tipoClienteId) {
        try {
            const query = `
                SELECT descrip
                FROM [dbo].[tipos_clte]
                WHERE tipo = @param0
            `;
            const data = await executeQuery('Siscad', query, [tipoClienteId]);
            return data[0]?.descrip?.trim() || "Sin Datos";
        } catch (err) {
            console.error("❌ Error al consultar tipos_clte:", err.message);
            return "Sin Datos";
        }
    }
//#endregion

    // Funcion para obtener los datos de contcto/comunicacion con el cliente
    async function getDatosContacto(rfcProspecto){
    const query = `
        SELECT RazonSocial, Telefono AS Tel1, whatsApp, CorreoFact, 'Dueño' AS TipoContacto, NULL AS FechaCumple
        FROM dbo.RegisterSOne
        WHERE RFC = @param0
    `;

    const data = await executeQuery('DistWeb', query, [rfcProspecto]);

    return data.map(r =>({
        NombreContacto: r.RazonSocial.trim() || '',
        Tel1: r.Tel1.trim() || '',
        Tel2: '',
        Cel1: r.whatsApp.trim() || '',
        Cel2: '',
        Mail1: r.CorreoFact.trim() || '',
        Mail2: '',
        TipoContacto: r.TipoContacto.trim(),
        FechaCumple: r.FechaCumple || '1999-12-31',
    }));
    }

    //#region Funciones para obtener la informacion de direccion de entrega del prospecto
    // funcion para obtener la direccion de entrega de prodcuto del cliente
    async function getDireccionesEntrega(rfcProspecto) {
        const query = `
            SELECT 0 AS DireccionEntregaId,
            calleEntrega,
            coloniaEntrega,
            '' AS EntreCalles,
            codigoPostalEntrega,
            ciudadEntrega AS Municipio,
            estadoEntrega AS Estado,
            'México' AS Pais
            FROM RegisterSThree
            WHERE RFC = @param0 ;
        `;

        const data = await executeQuery('DistWeb', query, [rfcProspecto]);

        const direcciones = await Promise.all(
            data.map(async (r) => {
                const estadoNombre = r.Estado?.trim() || "";
                const municipioNombre = r.Municipio?.trim() || "";

                const estadoId = await getObtenerIdEstado(estadoNombre);
                const municipioId = await getObtenerIdMunicipio(municipioNombre, estadoId);

                return {
                    IdDireccion: r.DireccionEntregaId,
                    Calle: r.calleEntrega?.trim() || '',
                    Colonia: r.coloniaEntrega?.trim() || '',
                    Entrecalles: r.EntreCalles?.trim() || '',
                    CP: r.codigoPostalEntrega?.trim() || '',
                    MunicipioId: municipioId,
                    Municipio: municipioNombre,
                    EstadoId: estadoId,
                    Estado: estadoNombre,
                    Pais: r.Pais
                };
            })
        );

        return direcciones;
    }

    //funcion obtener id del estado
    async function getObtenerIdEstado(nameEstado){
        try {
            const query = `
                SELECT CVE_ENT
                FROM [dbo].[Estados]
                WHERE NOM_ENT = @param0
            `;
            const data = await executeQuery('DistWeb', query, [nameEstado]);
            return data[0]?.CVE_ENT || "-";
        } catch (err) {
            console.error("❌ Error al consultar Estados:", err.message);
            return err;
        }
    }

    //Funcion para obtener el id del municipio
    async function getObtenerIdMunicipio(nameMunicipio, estadoId) {
        try {
            const query = `
                SELECT CVE_MUN
                FROM [dbo].[Municipios]
                WHERE CVE_ENT = @param0 AND NOM_MUN = @param1;
            `;
            const data = await executeQuery('DistWeb', query, [estadoId, nameMunicipio]);
            return data[0]?.CVE_MUN || "-";
        } catch (err) {
            console.error("❌ Error al consultar Municipio:", err.message);
            return "-";
        }
    }

//#endregion

    //Funcion para obtener los datos del credito del prospecto
    async function getDatosCompras(rfcProspecto) {
        const query = `
            SELECT LimiteCredito,
            DiasCredito,
            Des_Aut AS DescuentoAutorizado
            FROM [dbo].[CreditosProspectos]
            WHERE RFC = @param0
        `;

        const data = await executeQuery('DistCRM', query, [rfcProspecto]);

        return data.map(r => ({
            LimiteCredito: r.LimiteCredito.toString(),
            DiasCredito: r.DiasCredito,
            DescuentoAutorizado: r.DescuentoAutorizado ,
        }));
    }

    // Funcion para obtener los datos de direccion fiscal
    async function getDireccionFiscal(rfcProspecto) {
        const query = `
            SELECT 0 AS DireccionFiscalId,
            RazonSocial,
            RFC,
            CodigoPostal,
            RegimenFiscal
            FROM [dbo].[RegisterSOne]
            WHERE RFC = @param0
        `;

        const data = await executeQuery('DistWeb', query, [rfcProspecto]);

        const resultados = await Promise.all(
            data.map(async (r) => {
                const regimenRaw = r.RegimenFiscal?.trim() || "";
                const regimenId = parseInt(regimenRaw.split(" ")[0]);

                const regimenInfo = await fetchRegimenSAT(regimenId);

                return {
                    DireccionFiscalId: 0,
                    RazonCapital: r.RazonSocial?.trim() || '',
                    RFC: r.RFC?.trim() || '',
                    CodigoPostal: r.CodigoPostal?.trim() || '',
                    RegimenFiscal: regimenInfo?.RegimenSATId || null,
                    RegimenFiscalDescripcion: regimenInfo?.RegimenSATDescripcion.trim() || 'Sin descripción'
                };
            })
        );

        return resultados;
    }

    async function fetchRegimenSAT(regimenId) {
        const query = `
            SELECT RegimenSATId, RegimenSATDescripcion
            FROM [AuroFiscal].[dbo].[RegimenSAT]
            WHERE RegimenSATId = @param0
        `;

        const data = await executeQuery("Fiscal", query, [regimenId]);

        return data[0] || null;
    }

        /* ACtuializar Datos antes de envio */
        async function actualizarDatosCompras(rfc, { LimiteCredito, DiasCredito, DescuentoAutorizado, Des_TinGra, Des_InsTon, Des_InsTin, Des_CarTon, Des_CarTin }) {
                try {
                    const query = `
                        UPDATE [dbo].[CreditosProspectos]
                        SET 
                            LimiteCredito = @param0,
                            DiasCredito = @param1,
                            Des_Aut = @param2,
                            Des_TinGra = @param3,
                            Des_InsTon = @param4,
                            Des_InsTin = @param5,
                            Des_CarTon = @param6,
                            Des_CarTin = @param7
                        WHERE RFC = @param8
                    `;

                    await executeQuery('DistCRM', query, [
                        LimiteCredito,
                        DiasCredito,
                        DescuentoAutorizado,
                        Des_TinGra,
                        Des_InsTon,
                        Des_InsTin,
                        Des_CarTon,
                        Des_CarTin,
                        rfc
                    ]);

                    return true;
                } catch (error) {
                    console.error("❌ Error al actualizar datos de compras:", error.message);
                    return false;
                }
            }
//#endregion

module.exports = {
    obtenerDatosDistribuidorPorRFC,
    obtenerDistribuidoresFiltrados,
    obtenerDocumentosPorRFC,
    /** Get de envio de información **/
    getDataProspectoGeneral,
    getDatosContacto,
    getDireccionesEntrega,
    getObtenerIdEstado,
    getDatosCompras,
    getDireccionFiscal,
    /**Para actualizacion */
    actualizarDatosCompras
};

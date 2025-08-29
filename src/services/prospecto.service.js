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

/**
* Trae distribuidores por estatus.
* - "Aceptado" | "Pendiente": solo tipoRegistro = 'Nuevo' en SeguimientoCliente (excluye Migrados).
* - "Rechazado": directo de RegisterSOne.
* @param {"Aceptado"|"Pendiente"|"Rechazado"} status
* @param {{ page?: number, pageSize?: number }} opts
*/
async function obtenerDistribuidoresFiltrados(status = "Pendiente", opts = {}) {
    const page = Math.max(1, opts.page || 1);
    const pageSize = Math.min(200, Math.max(1, opts.pageSize || 50));
    const offset = (page - 1) * pageSize;

    const pool = await getConnection("DistWeb");

    const selectCols = `
        r.RFC,
        r.TipoPersona,
        r.RazonSocial,
        r.NombreComercial,
        r.Telefono,
        r.CorreoFact
    `;

    // Para Aceptado/Pendiente: unir con SeguimientoCliente y exigir tipoRegistro = 'Nuevo'
    const queryConJoin = `
        SELECT ${selectCols}
        FROM [dbo].[RegisterSOne] r
        INNER JOIN [dbo].[SeguimientoCliente] s
        ON s.RFC = r.RFC
        WHERE r.Status = @status
        AND r.RFC IS NOT NULL AND r.RFC <> ''
        AND s.tipoRegistro = 'Nuevo'
        ORDER BY r.RFC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    `;

    // Para Rechazado: sin join
    const querySinJoin = `
        SELECT ${selectCols}
        FROM [dbo].[RegisterSOne] r
        WHERE r.Status = @status
        AND r.RFC IS NOT NULL AND r.RFC <> ''
        ORDER BY r.RFC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    `;

    const usarJoin = status === "Aceptado" || status === "Pendiente";
    const sql = usarJoin ? queryConJoin : querySinJoin;

    const result = await pool.request()
        .input("status", status)
        .input("offset", offset)
        .input("pageSize", pageSize)
        .query(sql);

    return result.recordset.map((dist) => {
        const base = {
            RFC: dist.RFC?.trim() || "",
            TipoPersona: dist.TipoPersona?.trim() || "",
            RazonSocial: dist.RazonSocial?.trim() || "",
            CorreoFact: dist.CorreoFact?.trim() || "",
            Telefono: dist.Telefono?.trim() || "",
        };
        if (dist?.TipoPersona?.toLowerCase() === "moral") {
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

async function marcarDocumentosComoDescargados(rfc) {
    try {
        const query = `
            UPDATE [CadDist].[dbo].[SeguimientoCliente]
            SET documentosDescargados = 1,
                fechaActualizacion = GETDATE()
            WHERE RFC = @param0;
        `;
        await executeQuery("DistWeb", query, [rfc]);
        return true;
    } catch (error) {
        console.error("❌ Error al marcar documentos como descargados:", error.message);
        return false;
    }
}

async function getDocumentosDescargados(rfc) {
    const query = `
        SELECT documentosDescargados
        FROM [CadDist].[dbo].[SeguimientoCliente]
        WHERE RFC = @param0
    `;
    const data = await executeQuery("DistWeb", query, [rfc]);
    if (!data[0]) return false;

    const valor = data[0].documentosDescargados;
    return valor === true || valor === 1;
}

async function obtenerDocumentosRfcCarpeta(rfc) {
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

    // >>> NUEVO: subcarpeta por RFC
    const rfcClean = (rfc || '').replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const baseDir = path.resolve("documentos");
    const outputDir = path.join(baseDir, rfcClean);
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const archivos = {}; // { [nombre]: { path, filename } }

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
            archivos[filename] = { path: fullPath, filename };
        }
    });

    return {
        carpeta: rfcClean,
        ruta: outputDir,
        archivos // objeto con meta por archivo
    };
}


/* ---------- Funcion de get para compartir la informacion a externo ---------- */
//#region Funciones para obtener los datos generales a enviar del prospecto 
// Obtener info principal del prospecto (RegisterSOne)
async function getDataProspectoGeneral(rfcProspecto) {
    const query = `
        SELECT 
            r1.IdDistribuidor, 
            r1.RazonSocial, 
            r1.RFC AS RfcProspecto, 
            r1.TipoPersona, 
            r1.TipoClienteId,
            r3.giroNegocio
        FROM [dbo].[RegisterSOne] r1
        LEFT JOIN [CadDist].[dbo].[RegisterSThree] r3 ON r1.RFC = r3.RFC
        WHERE r1.RFC = @param0
    `;
    const data = await executeQuery('DistWeb', query, [rfcProspecto]);
    if (!data[0]) return null;

    const row = data[0];

    // Obtener descripción del tipo de cliente
    const tipoCliente = await getTipoClienteProspecto(row.TipoClienteId);
    const giroNegocioId = await fetchGirosNegocios(row.giroNegocio);

    return {
        ClienteId: row.IdDistribuidor,
        ClienteNombre: row.RazonSocial?.trim() || '',
        ClienteRFC: row.RfcProspecto?.trim() || '',
        TipoContribuyente: row.TipoPersona?.trim() || '',
        TipoClienteId: row.TipoClienteId || 0,
        TipoCliente: tipoCliente || 'Sin Datos',
        GiroId: giroNegocioId || 0,
        GiroNegocio: row.giroNegocio?.trim() || ''   // 👈 nuevo campo
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

async function fetchGirosNegocios(giroNegocio) {
    const query = `
        SELECT clave 
        FROM [dbo].[cad4cli0_giro]
        WHERE descripcion = @param0;
    `;
    try {
        const data = await executeQuery('Siscad', query, [giroNegocio]);
        //console.log(data)
        return data[0]?.clave || "Sin Datos";
    } catch (err) {
        throw new Error(`Error al obtener Giros de Negocios: ${err.message}`);
    }
}
//#endregion

// Funcion para obtener los datos de contcto/comunicacion con el cliente
async function getDatosContacto(rfcProspecto) {
    const query = `
            SELECT RazonSocial, Telefono AS Tel1, whatsApp, CorreoFact, 'Dueño' AS TipoContacto, NULL AS FechaCumple
            FROM dbo.RegisterSOne
            WHERE RFC = @param0
        `;

    const data = await executeQuery('DistWeb', query, [rfcProspecto]);

    return data.map(r => ({
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
async function getObtenerIdEstado(nameEstado) {
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
        DescuentoAutorizado: r.DescuentoAutorizado,
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

/*Obtener Documentos y mandarlos en Base 64 */
async function getDocumentosBase64(rfc) {
    const pool = await getConnection('DistWeb');
    const result = await pool.request()
        .input("rfc", rfc)
        .query(`
            SELECT actaConstitutiva, constanciaFiscal, comprobanteDomicilio, edoCuenta, ine,
            actaConstitutivaExtension, constanciaFiscalExtension, comprobanteDomicilioExtension, edoCuentaExtension, ineExtension
            FROM [CadDist].[dbo].[RegisterSFour]
            WHERE RFC = @rfc
        `);

    if (!result.recordset.length) return null;

    const row = result.recordset[0];

    // Convertir a base64 si hay contenido
    const documentos = {
        ActaConstitutiva: row.actaConstitutiva ? Buffer.from(row.actaConstitutiva).toString("base64") : null,
        ActaConstitutivaExtension: row.actaConstitutivaExtension,
        ConstanciaFiscal: row.constanciaFiscal ? Buffer.from(row.constanciaFiscal).toString("base64") : null,
        ConstanciaFiscalExtension: row.constanciaFiscalExtension,
        ComprobanteDomicilio: row.comprobanteDomicilio ? Buffer.from(row.comprobanteDomicilio).toString("base64") : null,
        ComprobanteDomicilioExtension: row.comprobanteDomicilioExtension,
        EdoCuenta: row.edoCuenta ? Buffer.from(row.edoCuenta).toString("base64") : null,
        EdoCuentaExtension: row.edoCuentaExtension,
        INE: row.ine ? Buffer.from(row.ine).toString("base64") : null,
        INEExtension: row.ineExtension,
    };

    return documentos;
}

/* ================================
   NUEVAS FUNCIONES SolicitudTerceros
   ================================ */

async function crearSolicitudTerceros({ RFC, ClienteId = null, TipoSolicitud, DetalleSolicitud = null, UsuarioCRMId = null, OrigenSolicitud = "CRM", Prioridad = "Normal", IPCliente = null }) {
    const query = `
        INSERT INTO [dbo].[SolicitudTerceros] 
        (RFC, ClienteId, TipoSolicitud, DetalleSolicitud, EstatusSolicitud, UsuarioCRMId, OrigenSolicitud, Prioridad, IPCliente)
        OUTPUT INSERTED.SolicitudId
        VALUES (@param0, @param1, @param2, @param3, 'Pendiente', @param4, @param5, @param6, @param7)
    `;

    const result = await executeQuery("DistCRM", query, [
        RFC,
        ClienteId,
        TipoSolicitud,
        DetalleSolicitud,
        UsuarioCRMId,
        OrigenSolicitud,
        Prioridad,
        IPCliente
    ]);

    return result[0]?.SolicitudId || null;
}

async function obtenerSolicitudPorId(idSolicitud) {
    const query = `
        SELECT *
        FROM [dbo].[SolicitudTerceros]
        WHERE SolicitudId = @param0
    `;
    const result = await executeQuery("DistCRM", query, [idSolicitud]);
    return result[0] || null;
}

async function actualizarRespuestaSolicitud(idSolicitud, { ClienteId = null, EstatusSolicitud, RespuestaTercero }) {
    const query = `
        UPDATE [dbo].[SolicitudTerceros]
        SET ClienteId = ISNULL(@param0, ClienteId),
            EstatusSolicitud = @param1,
            RespuestaTercero = @param2,
            FechaActualizacion = GETDATE()
        WHERE SolicitudId = @param3
    `;
    await executeQuery("DistCRM", query, [ClienteId, EstatusSolicitud, RespuestaTercero, idSolicitud]);
    return true;
}

module.exports = {
    obtenerDatosDistribuidorPorRFC,
    obtenerDistribuidoresFiltrados,
    obtenerDocumentosPorRFC,
    marcarDocumentosComoDescargados,
    getDocumentosDescargados,
    obtenerDocumentosRfcCarpeta,
    /** Get de envio de información **/
    getDataProspectoGeneral,
    getDatosContacto,
    getDireccionesEntrega,
    getObtenerIdEstado,
    getDatosCompras,
    getDireccionFiscal,
    getDocumentosBase64,
    /**Para actualizacion */
    actualizarDatosCompras,
    /*SolicitudTerceros */
    crearSolicitudTerceros,
    obtenerSolicitudPorId,
    actualizarRespuestaSolicitud
};

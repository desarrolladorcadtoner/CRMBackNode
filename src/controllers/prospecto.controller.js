const { obtenerDocumentosPorRFC, marcarDocumentosComoDescargados, getDocumentosDescargados, obtenerDatosDistribuidorPorRFC, obtenerDistribuidoresFiltrados, 
    getDataProspectoGeneral, getDatosContacto, getDireccionesEntrega, getDatosCompras, getDireccionFiscal,
    actualizarDatosCompras, obtenerDocumentosRfcCarpeta, getDocumentosBase64, crearSolicitudTerceros,
    obtenerSolicitudPorId, actualizarRespuestaSolicitud } = require("../services/prospecto.service");
const { updateTipoCliente } = require("../services/confirmacion.service");
const { DistribuidorCompleto } = require("../models/prospecto.model");
const archiver = require("archiver");
const { getConnection } = require("../config/db");


async function descargarDocumentos(req, res) {
    const { rfc } = req.params;
    const archivos = await obtenerDocumentosPorRFC(rfc);
    const datos = await obtenerDatosDistribuidorPorRFC(rfc);

    if (!archivos || !datos) {
        return res.status(404).json({ message: "Distribuidor no encontrado o sin documentos" });
    }

    const rfcClean = rfc.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const zipName = `Distribuidor_${rfcClean}.zip`;

    res.set({
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
        "Access-Control-Expose-Headers": "Content-Disposition, X-RFC-Distribuidor",
        "X-RFC-Distribuidor": rfcClean
    });

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    for (const [nombre, ruta] of Object.entries(archivos)) {
        archive.file(ruta, { name: `Distribuidor${rfcClean}/${nombre}` });
    }

    // ✅ marcar en la BD antes de finalizar
    await marcarDocumentosComoDescargados(rfc);

    archive.finalize();
}

async function checkDocumentosDescargados(req, res) {
    const { rfc } = req.params;
    try {
        const flag = await getDocumentosDescargados(rfc);
        res.json({ documentosDescargados: flag });
    } catch (err) {
        console.error("❌ Error en checkDocumentosDescargados:", err.message);
        res.status(500).json({ message: "Error al consultar documentosDescargados" });
    }
}

async function prepararCarpetaDocumentos(req, res) {
    const { rfc } = req.params;

    try {
        // 1) Verificar que exista el distribuidor (opcional, pero útil)
        const infoDocs = await obtenerDocumentosRfcCarpeta(rfc);
        if (!infoDocs || !infoDocs.archivos || Object.keys(infoDocs.archivos).length === 0) {
            return res.status(404).json({ message: "Distribuidor sin documentos" });
        }

        // 2) Obtener/guardar archivos en carpeta <RFC>
        /*const infoDocs = await obtenerDocumentosPorRFC(rfc);
        if (!infoDocs || !infoDocs.archivos || Object.keys(infoDocs.archivos).length === 0) {
            return res.status(404).json({ message: "Distribuidor sin documentos" });
        }*/

        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const urls = Object.entries(infoDocs.archivos).map(([nombre, meta]) => ({
            nombre, // ej. actaConstitutiva.pdf
            url: `${baseUrl}/static/${infoDocs.carpeta}/${meta.filename}`
        }));

        return res.json({
            rfc: infoDocs.carpeta,
            carpeta: `/static/${infoDocs.carpeta}/`,
            documentos: urls
        });
    } catch (err) {
        console.error("❌ Error en prepararCarpetaDocumentos:", err.message);
        return res.status(500).json({ message: "Error al preparar carpeta de documentos" });
    }
}

async function getDistribuidor(req, res) {
    const { rfc } = req.params;
    const datos = await obtenerDatosDistribuidorPorRFC(rfc);
    if (!datos) return res.status(404).json({ message: "Distribuidor no encontrado" });
    //res.json(new DistribuidorCompleto(datos));

    // Consulta el flag de documentos descargados
    const pool = await getConnection("DistWeb");
    const result = await pool.request()
        .input("rfc", rfc)
        .query(`SELECT documentosDescargados FROM [CadDist].[dbo].[SeguimientoCliente] WHERE RFC = @rfc`);

    const documentosDescargados = result.recordset[0]?.documentosDescargados === 1;

    res.json({
        ...new DistribuidorCompleto(datos),
        documentosDescargados   // 👈 nuevo flag
    });
}

async function getDistribuidoresResumen(req, res) {
    const { status = "Pendiente" } = req.query;

    try {
        const datos = await obtenerDistribuidoresFiltrados(status, { page: 1, pageSize: 100 });
        res.json(datos);
    } catch (err) {
        console.error("❌ Error al obtener distribuidores por status:", err.message);
        res.status(500).json({ message: "Error al obtener distribuidores" });
    }
}

async function actualizarCreditoProspecto(req, res){
    const {rfc} = req.params;
    const { LimiteCredito, DiasCredito, DescuentoAutorizado, Des_TinGra, Des_InsTon, Des_InsTin, Des_CarTon, Des_CarTin } = req.body;

    if(!rfc || LimiteCredito == null || DiasCredito == null || DescuentoAutorizado == null){
        return res.status(400).json({message: "Faltan datos para actualizar"})
    }

    const success = await actualizarDatosCompras(rfc, { LimiteCredito, DiasCredito, DescuentoAutorizado, Des_TinGra, Des_InsTon, Des_InsTin, Des_CarTon, Des_CarTin });

    if (!success) {
        return res.status(500).json({ message: "Error al actualizar los datos" });
    }

    res.json({ message: "Datos de crédito actualizados correctamente" });
}

async function updateAndSendProspecto(req, res) {
    const { idSolicitud } = req.params;
    const { tipoClienteId, creditos } = req.body;

    try {
        // 1. Actualizar tipo cliente y créditos si llegan
        if (tipoClienteId) {
            await updateTipoCliente(rfc, tipoClienteId);
        }

        if (creditos) {
            await actualizarDatosCompras(rfc, creditos);
        }

        // 2. Obtener info actualizada
        const datosGenerales = await getDataProspectoGeneral(rfc);
        if (!datosGenerales) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const [
            DatosContacto,
            DireccionesEntrega,
            DatosCompras,
            DireccionFiscal
        ] = await Promise.all([
            getDatosContacto(rfc),
            getDireccionesEntrega(rfc),
            getDatosCompras(rfc),
            getDireccionFiscal(rfc)
        ]);

        // 3. Armar y enviar el response completo
        const prospectoResponse = {
            ...datosGenerales,
            DatosContacto,
            DireccionesEntrega,
            DatosCompras,
            DireccionFiscal
        };

        res.json(prospectoResponse);
    } catch (error) {
        console.error("❌ Error en updateAndSendProspecto:", error.message);
        res.status(500).json({ message: "Error al enviar datos del prospecto" });
    }
}

async function sendDataProspecto(req, res) {
    const { rfc } = req.params;

    try {
        // 1. Obtener info general
        const datosGenerales = await getDataProspectoGeneral(rfc);
        if (!datosGenerales) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // 2. Obtener info adicional en paralelo
        const [
            DatosContacto,
            DireccionesEntrega,
            DatosCompras,
            DireccionFiscal,
            Documentos
        ] = await Promise.all([
            getDatosContacto(rfc),
            getDireccionesEntrega(rfc),
            getDatosCompras(rfc),
            getDireccionFiscal(rfc),
            getDocumentosBase64(rfc)
        ]);

        // 3. Armar respuesta completa
        const prospectoResponse = {
            ...datosGenerales,
            DatosContacto,
            DireccionesEntrega,
            DatosCompras,
            DireccionFiscal,
            Documentos
        };

        res.json(prospectoResponse);
    } catch (error) {
        console.error("❌ Error en sendDataProspecto:", error.message);
        res.status(500).json({ message: "Error al enviar datos del prospecto" });
    }
}

/* ================================
   NUEVOS CONTROLADORES SolicitudTerceros
   ================================ */

// Crear solicitud de alta
async function crearSolicitudAlta(req, res) {
    try {
        const { RFC, ClienteId, UsuarioCRMId, DetalleSolicitud } = req.body;

        if (!RFC) {
            return res.status(400).json({ message: "El RFC es obligatorio" });
        }

        const idSolicitud = await crearSolicitudTerceros({
            RFC,
            ClienteId,
            TipoSolicitud: "AltaProspecto",
            DetalleSolicitud: DetalleSolicitud || null,
            UsuarioCRMId,
            OrigenSolicitud: "CRM"
        });

        res.json({ message: "Solicitud creada correctamente", idSolicitud });
    } catch (err) {
        console.error("❌ Error en crearSolicitudAlta:", err.message);
        res.status(500).json({ message: "Error al crear solicitud" });
    }
}

// Consultar solicitud por ID
async function getSolicitudById(req, res) {
    try {
        const { idSolicitud } = req.params;
        const solicitud = await obtenerSolicitudPorId(idSolicitud);

        if (!solicitud) {
            return res.status(404).json({ message: "Solicitud no encontrada" });
        }

        res.json(solicitud);
    } catch (err) {
        console.error("❌ Error en getSolicitudById:", err.message);
        res.status(500).json({ message: "Error al obtener solicitud" });
    }
}

// Enviar datos por idSolicitud (usa RFC)
async function sendDataBySolicitud(req, res) {
    try {
        const { idSolicitud } = req.params;
        const solicitud = await obtenerSolicitudPorId(idSolicitud);

        if (!solicitud) {
            return res.status(404).json({ message: "Solicitud no encontrada" });
        }

        const rfc = solicitud.RFC;

        // Reutilizamos la lógica de sendDataProspecto
        const datosGenerales = await getDataProspectoGeneral(rfc);
        if (!datosGenerales) {
            return res.status(404).json({ message: 'Prospecto no encontrado' });
        }

        const [
            DatosContacto,
            DireccionesEntrega,
            DatosCompras,
            DireccionFiscal,
            Documentos
        ] = await Promise.all([
            getDatosContacto(rfc),
            getDireccionesEntrega(rfc),
            getDatosCompras(rfc),
            getDireccionFiscal(rfc),
            getDocumentosBase64(rfc)
        ]);

        res.json({
            SolicitudId: solicitud.SolicitudId,
            EstatusSolicitud: solicitud.EstatusSolicitud,
            RespuestaTercero: solicitud.RespuestaTercero,
            TipoSolicitud: solicitud.TipoSolicitud,
            Prospecto: {
                ...datosGenerales,
                DatosContacto,
                DireccionesEntrega,
                DatosCompras,
                DireccionFiscal,
                Documentos
            }
        });
    } catch (err) {
        console.error("❌ Error en sendDataBySolicitud:", err.message);
        res.status(500).json({ message: "Error al enviar datos por solicitud" });
    }
}

// Actualizar respuesta del tercero
async function actualizarRespuestaSolicitudCtrl(req, res) {
    try {
        const { idSolicitud } = req.params;
        const { ClienteId, EstatusSolicitud, RespuestaTercero } = req.body;

        await actualizarRespuestaSolicitud(idSolicitud, { ClienteId, EstatusSolicitud, RespuestaTercero });

        res.json({ message: "Respuesta de solicitud actualizada correctamente" });
    } catch (err) {
        console.error("❌ Error en actualizarRespuestaSolicitudCtrl:", err.message);
        res.status(500).json({ message: "Error al actualizar respuesta" });
    }
}

module.exports = {
    descargarDocumentos,
    getDistribuidor,
    getDistribuidoresResumen,
    actualizarCreditoProspecto,
    updateAndSendProspecto,
    sendDataProspecto,
    prepararCarpetaDocumentos,
    crearSolicitudAlta,
    getSolicitudById,
    sendDataBySolicitud,
    actualizarRespuestaSolicitudCtrl,
    checkDocumentosDescargados
};

const { obtenerDocumentosPorRFC, obtenerDatosDistribuidorPorRFC, obtenerDistribuidoresFiltrados, 
    getDataProspectoGeneral, getDatosContacto, getDireccionesEntrega, getDatosCompras, getDireccionFiscal,
    actualizarDatosCompras } = require("../services/prospecto.service");
const { updateTipoCliente } = require("../services/confirmacion.service");
const { DistribuidorCompleto } = require("../models/prospecto.model");
const archiver = require("archiver");

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

    archive.finalize();
}

async function getDistribuidor(req, res) {
    const { rfc } = req.params;
    const datos = await obtenerDatosDistribuidorPorRFC(rfc);
    if (!datos) return res.status(404).json({ message: "Distribuidor no encontrado" });
    res.json(new DistribuidorCompleto(datos));
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
    const { rfc } = req.params;
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


module.exports = {
    descargarDocumentos,
    getDistribuidor,
    getDistribuidoresResumen,
    actualizarCreditoProspecto,
    updateAndSendProspecto,
};

const { obtenerDocumentosPorRFC, obtenerDatosDistribuidorPorRFC, obtenerDistribuidoresFiltrados } = require("../services/prospecto.service");
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
    const datos = await obtenerDistribuidoresFiltrados();
    res.json(datos);
}

module.exports = {
    descargarDocumentos,
    getDistribuidor,
    getDistribuidoresResumen,
};

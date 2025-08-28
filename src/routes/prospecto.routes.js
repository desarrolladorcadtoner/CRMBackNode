const express = require("express");
const router = express.Router();
const {
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
    actualizarRespuestaSolicitudCtrl
} = require("../controllers/prospecto.controller");

router.get("/documentos/rfc/:rfc", descargarDocumentos); // Descargar documentos desde el CRM
router.get("/documentos/rfc/:rfc/carpeta", prepararCarpetaDocumentos); // Descargar documentos en carpeta y no por -zip
router.get("/distribuidor/rfc/:rfc", getDistribuidor);
router.get("/distribuidores/prospectosdist", getDistribuidoresResumen);
//router.post("/sendData/:idSolicitud", updateAndSendProspecto);
router.get("/senData/:rfc", sendDataProspecto);
router.put("/actualizar-credito/:rfc", actualizarCreditoProspecto);

// Solicitudes Terceros
router.post("/solicitud/alta", crearSolicitudAlta);                 // Crear solicitud de alta
router.get("/solicitud/:idSolicitud", getSolicitudById);            // Consultar solicitud
router.post("/sendData/:idSolicitud", sendDataBySolicitud);         // Enviar datos prospecto por idSolicitud
router.put("/solicitud/:idSolicitud/respuesta", actualizarRespuestaSolicitudCtrl); // Actualizar respuesta de Genexus

module.exports = router;

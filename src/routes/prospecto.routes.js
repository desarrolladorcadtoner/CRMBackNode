const express = require("express");
const router = express.Router();
const {
    descargarDocumentos,
    getDistribuidor,
    getDistribuidoresResumen,
    actualizarCreditoProspecto,
    updateAndSendProspecto,
    sendDataProspecto,
    prepararCarpetaDocumentos
} = require("../controllers/prospecto.controller");

router.get("/documentos/rfc/:rfc", descargarDocumentos); // Descargar documentos desde el CRM
router.get("/documentos/rfc/:rfc/carpeta", prepararCarpetaDocumentos); // Descargar documentos en carpeta y no por -zip
router.get("/distribuidor/rfc/:rfc", getDistribuidor);
router.get("/distribuidores/prospectosdist", getDistribuidoresResumen);
router.post("/sendData/:rfc", updateAndSendProspecto);
router.get("/senData/:rfc", sendDataProspecto);
router.put("/actualizar-credito/:rfc", actualizarCreditoProspecto);

module.exports = router;

const express = require("express");
const router = express.Router();
const {
    descargarDocumentos,
    getDistribuidor,
    getDistribuidoresResumen,
    sendDataProspecto,
} = require("../controllers/prospecto.controller");

router.get("/documentos/rfc/:rfc", descargarDocumentos);
router.get("/distribuidor/rfc/:rfc", getDistribuidor);
router.get("/distribuidores/prospectosdist", getDistribuidoresResumen);
router.get('/senData/:rfc', sendDataProspecto)

module.exports = router;

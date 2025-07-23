const express = require("express");
const router = express.Router();
const {
    descargarDocumentos,
    getDistribuidor,
    getDistribuidoresResumen,
    sendDataProspecto,
    testapi
} = require("../controllers/prospecto.controller");

router.get("/documentos/rfc/:rfc", descargarDocumentos);
router.get("/distribuidor/rfc/:rfc", getDistribuidor);
router.get("/distribuidores/prospectosdist", getDistribuidoresResumen);
router.get('/senData/:rfc', sendDataProspecto)
router.get('/test/Estado/:municipio', testapi)

module.exports = router;

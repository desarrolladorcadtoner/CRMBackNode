const express = require("express");
const router = express.Router();
const {
    getDistribuidoresExistentes,
    getDistribuidorPorRFC,
    getDistribuidorPorNombre,
    getDistribuidorPorId
} = require("../controllers/distribuidoresSiscad.controller");

router.get("/existentes", getDistribuidoresExistentes);
router.get("/buscar/rfc/:rfc", getDistribuidorPorRFC);
router.get("/buscar/id/:idDist", getDistribuidorPorId);
router.get("/buscar/nombre/:nombre", getDistribuidorPorNombre);

module.exports = router;
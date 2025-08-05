const express = require("express");
const router = express.Router();
const {
    getDistribuidoresExistentes,
    obtenerDatosFiscales,
    getDistribuidorPorRFC,
    getDistribuidorPorNombre,
    getDistribuidorPorId,
    actualizarCorreo,
    actualizarContacto
} = require("../controllers/distribuidoresSiscad.controller");

router.get("/existentes", getDistribuidoresExistentes);
router.get("/distribuidor/infoFiscal/:cl_clte", obtenerDatosFiscales);
router.get("/buscar/rfc/:rfc", getDistribuidorPorRFC);
router.get("/buscar/id/:idDist", getDistribuidorPorId);
router.get("/buscar/nombre/:nombre", getDistribuidorPorNombre);
router.put("/actualizar/correo/:id", actualizarCorreo);
router.put("/actualizar/contacto/:id", actualizarContacto);

module.exports = router;
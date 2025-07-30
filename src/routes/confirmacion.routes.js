const express = require("express");
const router = express.Router();
const {
    confirmarDistribuidor,
    obtenerCatalogoTipoCliente,
    confirmAltaDistExistente
} = require("../controllers/confirmacion.controller");

router.post("/distribuidores/confirmar", confirmarDistribuidor);
router.get("/catalogo/tipo-cliente", obtenerCatalogoTipoCliente);
router.post("/confirmUserExist", confirmAltaDistExistente);

module.exports = router;

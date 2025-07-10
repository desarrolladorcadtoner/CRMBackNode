const express = require("express");
const router = express.Router();
const {
    confirmarDistribuidor,
    obtenerCatalogoTipoCliente,
} = require("../controllers/confirmacion.controller");

router.post("/distribuidores/confirmar", confirmarDistribuidor);
router.get("/catalogo/tipo-cliente", obtenerCatalogoTipoCliente);

module.exports = router;

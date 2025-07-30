const express = require("express");
const router = express.Router();
const {
    totalProductos,
    productosSinActualizar,
    productosNulos,
    buscarProducto,
    resumenProspectos,
    resumenDistribuidoresExistentes
} = require("../controllers/homeDetail.controller");

router.get("/productos/total", totalProductos);
router.get("/productos/sin-actualizar", productosSinActualizar);
router.get("/productos/nulos/:columna", productosNulos);
router.get("/productos/buscar/:campo/:valor", buscarProducto);
router.get("/prospectos/resumen", resumenProspectos);
router.get('/distribuidores/existentes', resumenDistribuidoresExistentes);

module.exports = router;

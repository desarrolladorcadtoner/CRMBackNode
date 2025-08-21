// routes/productos.routes.js
const express = require("express");
const router = express.Router();
const { obtenerProductos, obtenerProducto, editarProducto } = require("../controllers/productos.controller");

// GET todos los productos
router.get("/", obtenerProductos);

// GET un producto por ID
router.get("/:id", obtenerProducto);

// PUT editar producto
router.put("/:id", editarProducto);

module.exports = router;

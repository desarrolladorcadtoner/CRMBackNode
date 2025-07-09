// src/routes/login.routes.js
const express = require("express");
const router = express.Router();
const { login, crearUsuario, testConexion } = require("../controllers/login.controller");

router.post("/login", login);
router.get("/test", testConexion);
router.post("/usuarios", crearUsuario);

module.exports = router;

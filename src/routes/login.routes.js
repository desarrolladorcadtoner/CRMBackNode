// src/routes/login.routes.js
const express = require("express");
const router = express.Router();
const { loginUsuario, logoutUsuario, crearUsuario } = require("../controllers/login.controller");

router.post("/login", loginUsuario);
router.post("/logout", logoutUsuario);
/*router.get("/test", testConexion);*/
router.post("/usuarios", crearUsuario);

module.exports = router;

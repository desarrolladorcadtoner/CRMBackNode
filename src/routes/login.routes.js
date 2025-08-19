// routes/login.routes.js
const express = require("express");
const router = express.Router();
const {
    loginUsuario,
    logoutUsuario,
    crearUsuario,
    obtenerUsuario
} = require("../controllers/login.controller");

// Login
router.post("/login", loginUsuario);

// Logout
router.post("/logout", logoutUsuario);

// Alta de usuario
router.post("/usuarios", crearUsuario);

// Obtener usuario por username
router.get("/usuarios/:username", obtenerUsuario);

module.exports = router;

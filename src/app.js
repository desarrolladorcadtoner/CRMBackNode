const express = require("express");
const cors = require("cors");
require("dotenv").config();
const morgan = require("morgan");

const app = express();

// Middlewares
app.use(cors({
    origin: (origin, callback) => {
        // Permitir todas las IPs + localhost durante desarrollo
        callback(null, true);
    },
    credentials: true
}));
app.use(express.json());
app.use(morgan(":method :url :status :remote-addr"));

// Rutas
const loginRouter = require("./routes/login.routes");
const prospectoRouter = require("./routes/prospecto.routes");
const confirmacionRouter = require("./routes/confirmacion.routes");
const distSiscadRouter = require("./routes/distribuidoresSiscad.routes");
const homeDetail = require("./routes/homeDetail.routes");
const productosRouter = require("./routes/productos.routes");

// Prefijo para las rutas - endpints - api
app.use("/login", loginRouter);
app.use("/prospecto", prospectoRouter);
app.use("/confirmacion", confirmacionRouter);
app.use("/distribuidores/siscad", distSiscadRouter);
app.use("/dashboard", homeDetail);
app.use("/productos", productosRouter);

app.get("/", (req, res) => {
    res.send("✅ CRM Backend activo desde app.js");
});

module.exports = app;

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middlewares
app.use(cors({
    origin: [
        "http://localhost:3001",
        "http://172.100.203.202:3001",
    ],
    credentials: true,
}));
app.use(express.json());

// Rutas
const loginRouter = require("./routes/login.routes");
const prospectoRouter = require("./routes/prospecto.routes");
const confirmacionRouter = require("./routes/confirmacion.routes");

// Prefijo para las rutas - endpints - api
app.use("/login", loginRouter);
app.use("/prospecto", prospectoRouter);
app.use("/confirmacion", confirmacionRouter);



app.get("/", (req, res) => {
    res.send("✅ CRM Backend activo desde app.js");
});

module.exports = app;

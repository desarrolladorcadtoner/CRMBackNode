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

const loginRouter = require("./routes/login.routes");

// Rutas
app.use("/login", loginRouter);
// app.use("/register", require("./routes/register"));
// app.use("/confirmacion", require("./routes/confirmacion"));

app.get("/", (req, res) => {
    res.send("✅ CRM Backend activo desde app.js");
});

module.exports = app;

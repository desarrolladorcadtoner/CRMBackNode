//Para correr el servidor es npx nodemon
const app = require("./app");
const PORT = process.env.PORT;
const os = require("os");

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (let name in interfaces) {
        for (let iface of interfaces[name]) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return "localhost";
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor escuchando en http://${getLocalIP()}:${PORT}`);
});

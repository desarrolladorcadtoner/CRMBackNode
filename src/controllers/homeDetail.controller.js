const {
    getTotalProductos,
    getProductosSinActualizar,
    getProductosConCamposNulos,
    filtrarProductos,
    getTotalProspectos,
    getProspectosPorStatus,
    getTotalDistribuidoresSiscad,
    getTotalMigrados,
    getTotalPendientesMigrar
} = require("../services/homeDetail.service");

async function totalProductos(req, res) {
    const total = await getTotalProductos();
    res.json({ total });
}

async function productosSinActualizar(req, res) {
    const total = await getProductosSinActualizar();
    res.json({ total });
}

async function productosNulos(req, res) {
    const { columna } = req.params;
    const total = await getProductosConCamposNulos(columna);
    res.json({ columna, total });
}

async function buscarProducto(req, res) {
    const { campo, valor } = req.params;
    const resultados = await filtrarProductos(campo, valor);
    res.json(resultados);
}

async function resumenProspectos(req, res) {
    try {
        const total = await getTotalProspectos();
        const aceptados = await getProspectosPorStatus("Aceptado");
        const rechazados = await getProspectosPorStatus("Rechazado");
        const pendientes = await getProspectosPorStatus("Pendiente");

        res.json({
            total,
            aceptados,
            rechazados,
            pendientes
        });
    } catch (error) {
        console.error("❌ Error al obtener resumen de prospectos:", error.message);
        res.status(500).json({ message: "Error al obtener datos de prospectos" });
    }
}

async function resumenDistribuidoresExistentes(req, res) {
    try {
        const [total, migrados, pendientes] = await Promise.all([
            getTotalDistribuidoresSiscad(),
            getTotalMigrados(),
            getTotalPendientesMigrar()
        ]);

        res.json({ total, migrados, pendientes });
    } catch (err) {
        console.error("❌ Error en resumenDistribuidoresExistentes:", err.message);
        res.status(500).json({ message: "Error al obtener resumen de distribuidores existentes" });
    }
}

module.exports = {
    totalProductos,
    productosSinActualizar,
    productosNulos,
    buscarProducto,
    resumenProspectos,
    resumenDistribuidoresExistentes
};
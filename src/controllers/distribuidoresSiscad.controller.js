const {
    obtenerDistribuidoresSiscad,
    buscarDistribuidorPorRFC,
    buscarDistribuidorPorNombre,
    buscarDistribuidorPorIdDistribuidor
} = require("../services/distribuidoresSiscad.service");

async function getDistribuidoresExistentes(req, res) {
    try {
        const data = await obtenerDistribuidoresSiscad();
        res.json(data);
    } catch (error) {
        console.error("❌ Error al obtener distribuidores:", error.message);
        res.status(500).json({ message: "Error al obtener distribuidores" });
    }
}

async function getDistribuidorPorRFC(req, res) {
    const { rfc } = req.params;
    try {
        const data = await buscarDistribuidorPorRFC(rfc);
        res.json(data);
    } catch (error) {
        console.error("❌ Error al buscar por RFC:", error.message);
        res.status(500).json({ message: "Error al buscar por RFC" });
    }
}

async function getDistribuidorPorId(req, res) {
    const { idDist } = req.params;
    try {
        const data = await buscarDistribuidorPorIdDistribuidor(idDist);
        console.log(data);
        res.json(data);
    } catch (error) {
        console.error("❌ Error al buscar por id:", error.message);
        res.status(500).json({ message: "Error al buscar por id distribuidor" });
    }
}

async function getDistribuidorPorNombre(req, res) {
    const { nombre } = req.params;
    try {
        const data = await buscarDistribuidorPorNombre(nombre);
        res.json(data);
    } catch (error) {
        console.error("❌ Error al buscar por nombre:", error.message);
        res.status(500).json({ message: "Error al buscar por nombre" });
    }
}

module.exports = {
    getDistribuidoresExistentes,
    getDistribuidorPorRFC,
    getDistribuidorPorNombre,
    getDistribuidorPorId
};
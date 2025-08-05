const {
    obtenerDistribuidoresSiscad,
    obtenerDatoDistribuidor,
    buscarDistribuidorPorRFC,
    buscarDistribuidorPorNombre,
    buscarDistribuidorPorIdDistribuidor,
    updateCorreoDistribuidor,
    updateContactoDistribuidor
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

async function obtenerDatosFiscales(req, res) {
    const { cl_clte } = req.params;

    if (!cl_clte) {
        return res.status(400).json({ mensaje: 'Falta el ID del cliente (cl_clte).' });
    }

    try {
        const datos = await obtenerDatoDistribuidor(cl_clte);

        if (!datos) {
            return res.status(404).json({ mensaje: 'Cliente no encontrado.' });
        }

        res.status(200).json(datos); // ✅ Ya contiene TipoPersona
    } catch (error) {
        console.error('❌ Error al obtener datos fiscales:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

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

async function actualizarCorreo(req, res) {
    const { id } = req.params;
    const { correo } = req.body;

    if (!correo) return res.status(400).json({ mensaje: "Falta el correo" });

    try {
        await updateCorreoDistribuidor(id, correo);
        res.status(200).json({ mensaje: "Correo actualizado correctamente" });
    } catch (error) {
        console.error("❌ Error al actualizar correo:", error);
        res.status(500).json({ mensaje: "Error al actualizar correo" });
    }
}

async function actualizarContacto(req, res) {
    const { id } = req.params;
    const { numContacto } = req.body;

    if (!numContacto) return res.status(400).json({ mensaje: "Falta el número de contacto" });

    try {
        await updateContactoDistribuidor(id, numContacto);
        res.status(200).json({ mensaje: "Contacto actualizado correctamente" });
    } catch (error) {
        console.error("❌ Error al actualizar contacto:", error);
        res.status(500).json({ mensaje: "Error al actualizar contacto" });
    }
}

module.exports = {
    getDistribuidoresExistentes,
    obtenerDatosFiscales,
    getDistribuidorPorRFC,
    getDistribuidorPorNombre,
    getDistribuidorPorId,
    actualizarCorreo,
    actualizarContacto
};
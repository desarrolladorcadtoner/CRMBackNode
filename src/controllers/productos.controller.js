// controllers/productos.controller.js
const { getAllProductos, getProductoById, updateProducto } = require("../services/productos.service");

// ✅ Obtener todos los productos
async function obtenerProductos(req, res) {
    try {
        const productos = await getAllProductos();
        res.json(productos);
    } catch (error) {
        console.error("❌ Error en obtenerProductos:", error);
        res.status(500).json({ message: "Error en servidor" });
    }
}

// ✅ Obtener un producto por ID
async function obtenerProducto(req, res) {
    try {
        const { id } = req.params;
        const producto = await getProductoById(id);
        if (!producto) return res.status(404).json({ message: "Producto no encontrado" });
        res.json(producto);
    } catch (error) {
        console.error("❌ Error en obtenerProducto:", error);
        res.status(500).json({ message: "Error en servidor" });
    }
}

// ✅ Editar un producto
async function editarProducto(req, res) {
    try {
        const { id } = req.params;
        const exito = await updateProducto(id, req.body);
        if (exito) {
            res.json({ message: "Producto actualizado correctamente" });
        } else {
            res.status(400).json({ message: "No se pudo actualizar el producto" });
        }
    } catch (error) {
        console.error("❌ Error en editarProducto:", error);
        res.status(500).json({ message: "Error en servidor" });
    }
}

module.exports = {
    obtenerProductos,
    obtenerProducto,
    editarProducto,
};

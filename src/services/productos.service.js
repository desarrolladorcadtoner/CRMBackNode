// services/productos.service.js
const { getConnection } = require("../config/db");

// ✅ Obtener todos los productos con filtros (solo algunos campos + joins)
async function getAllProductos() {
    const pool = await getConnection("CadDist");
    const result = await pool.request().query(`
        SELECT 
            p.ProductoId,
            p.ProveedorId,
            p.FabricanteId,
            p.CategoriaID,
            p.ProductoPrice,
            p.ProductoDateAdd,
            p.ProductoReference,
            p.ProductoDateUpd,
            pl.ProductoLangDescripcion,
            pl.ProductoLangDescCorta,
            c.CategoriaDescripcion,
            c.CategoriaLinea,
            pr.ProveedorNombre,
            f.FabricanteNombre
        FROM [CadDistribuidores].[dbo].[Productos] p
        INNER JOIN [CadDistribuidores].[dbo].[ProductosLang] pl ON p.ProductoId = pl.ProductoId
        INNER JOIN [CadDistribuidores].[dbo].[Categorias] c ON p.CategoriaID = c.CategoriaID
        INNER JOIN [CadDistribuidores].[dbo].[Proveedores] pr ON p.ProveedorId = pr.ProveedorId
        INNER JOIN [CadDistribuidores].[dbo].[Fabricantes] f ON p.FabricanteId = f.FabricanteId
        WHERE p.TiendaId = 1 AND p.ProductoOnSale = 0 AND p.ProductoOnlyLine = 0
    `);

    return result.recordset;
}

// ✅ Obtener un solo producto por ID
async function getProductoById(productoId) {
    const pool = await getConnection("CadDist");
    const result = await pool
        .request()
        .input("ProductoId", productoId)
        .query(`
            SELECT 
                p.ProductoId,
                p.ProveedorId,
                p.FabricanteId,
                p.CategoriaID,
                p.ProductoPrice,
                p.ProductoDateAdd,
                p.ProductoReference,
                p.ProductoDateUpd,
                pl.ProductoLangDescripcion,
                pl.ProductoLangDescCorta,
                c.CategoriaDescripcion,
                c.CategoriaLinea,
                pr.ProveedorNombre,
                f.FabricanteNombre
            FROM [CadDistribuidores].[dbo].[Productos] p
            INNER JOIN [CadDistribuidores].[dbo].[ProductosLang] pl ON p.ProductoId = pl.ProductoId
            INNER JOIN [CadDistribuidores].[dbo].[Categorias] c ON p.CategoriaID = c.CategoriaID
            INNER JOIN [CadDistribuidores].[dbo].[Proveedores] pr ON p.ProveedorId = pr.ProveedorId
            INNER JOIN [CadDistribuidores].[dbo].[Fabricantes] f ON p.FabricanteId = f.FabricanteId
            WHERE p.ProductoId = @ProductoId
        `);

    return result.recordset[0] || null;
}

// ✅ Editar un producto (NO edita ProductoId, ProductoReference, ProductoDateAdd, ProductoDateUp)
async function updateProducto(productoId, data) {
    const pool = await getConnection("CadDist");

    // Extraer campos editables
    const {
        ProveedorId,
        FabricanteId,
        CategoriaID,
        ProductoPrice,
        ProductoOnSale,
        ProductoOnlyLine,
        ProductoLangDescripcion,
        ProductoLangDescCorta
    } = data;

    // Actualizamos Productos
    await pool.request()
        .input("ProductoId", productoId)
        .input("ProveedorId", ProveedorId)
        .input("FabricanteId", FabricanteId)
        .input("CategoriaID", CategoriaID)
        .input("ProductoPrice", ProductoPrice)
        .input("ProductoOnSale", ProductoOnSale ?? 0)
        .input("ProductoOnlyLine", ProductoOnlyLine ?? 0)
        .query(`
            UPDATE [CadDistribuidores].[dbo].[Productos]
            SET 
                ProveedorId = @ProveedorId,
                FabricanteId = @FabricanteId,
                CategoriaID = @CategoriaID,
                ProductoPrice = @ProductoPrice,
                ProductoOnSale = @ProductoOnSale,
                ProductoOnlyLine = @ProductoOnlyLine,
                ProductoDateUp = GETDATE()
            WHERE ProductoId = @ProductoId
        `);

    // Actualizamos ProductosLang
    await pool.request()
        .input("ProductoId", productoId)
        .input("ProductoLangDescripcion", ProductoLangDescripcion)
        .input("ProductoLangDescCorta", ProductoLangDescCorta)
        .query(`
            UPDATE [CadDistribuidores].[dbo].[ProductosLang]
            SET 
                ProductoLangDescripcion = @ProductoLangDescripcion,
                ProductoLangDescCorta = @ProductoLangDescCorta
            WHERE ProductoId = @ProductoId
        `);

    return true;
}

module.exports = {
    getAllProductos,
    getProductoById,
    updateProducto,
};

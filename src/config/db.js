const sql = require("mssql");
require("dotenv").config();

const dbConfigs = {
    DistCRM: {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER,
        database: process.env.DB_NAME,
        options: {
            encrypt: true,
            trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
        },
    },
    DistWeb: {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER,
        database: process.env.DB_NAME3,
        options: {
            encrypt: true,
            trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
        },
    },
    Siscad: {
        user: process.env.DB_USER2,
        password: process.env.DB_PASSWORD2,
        server: process.env.DB_SERVER2,
        database: process.env.DB_DATABASE2,
        options: {
            instanceName: process.env.DB_INSTANCENAME2,
            encrypt: true,
            trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
        },
    },
    Fiscal: {
        user: process.env.DB_USER1,
        password: process.env.DB_PASSWORD1,
        server: process.env.DB_SERVER1,
        database: process.env.DB_DATABASE1,
        options: {
            encrypt: true,
            trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
        },
    },
};

const pools = {};

async function getConnection(nombreConexion) {
    if (!dbConfigs[nombreConexion]) {
        throw new Error(`❌ No hay configuración para la conexión: ${nombreConexion}`);
    }

    if (!pools[nombreConexion]) {
        try {
            const pool = await new sql.ConnectionPool(dbConfigs[nombreConexion]).connect();
            pools[nombreConexion] = pool;
            console.log(`🧩 Ejecutando query en base: ${dbConfigs[nombreConexion].database}`);
            //console.log("📄 Query:", query);
        } catch (err) {
            console.error(`❌ Error conectando a ${nombreConexion}:`, err);
            throw err;
        }
    }

    return pools[nombreConexion];
}

module.exports = {
    getConnection,
};

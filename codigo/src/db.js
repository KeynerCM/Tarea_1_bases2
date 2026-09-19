/*
 * nombre: db.js
 * descripcion: Modulo de conexion a SQL Server. Arma la configuracion de la
 *   conexion a partir de las variables de entorno del archivo .env y administra
 *   un unico pool de conexiones que se reutiliza en todas las peticiones de la API.
 *   Autor: Keyner Cerdas Morales. Fecha: 2026-09-15.
 */
const sql = require('mssql');

/*
 * nombre: config
 * descripcion: Parametros de conexion que usa el driver mssql.
 *   - server, port, database, user, password: se leen del archivo .env.
 *   - encrypt: cifra la comunicacion con SQL Server, salvo que DB_ENCRYPT sea 'false'.
 *   - trustServerCertificate: acepta el certificado autofirmado de SQL Server en
 *     Linux; solo debe ser true en un entorno local.
 *   - useUTC: false porque ModifiedDate se guarda con GETDATE() (hora local del
 *     servidor), no en UTC; asi el driver interpreta bien las fechas.
 *   - pool: hasta 10 conexiones simultaneas; las que quedan sin uso 30 segundos
 *     se cierran.
 */
const config = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT !== 'false',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    useUTC: false,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let poolPromise = null;

/*
 * nombre: getPool
 * salidas: Promesa que se resuelve con el pool de conexiones (sql.ConnectionPool)
 *   ya conectado. Se rechaza con el error de conexion si SQL Server no esta
 *   disponible.
 * descripcion: Devuelve el pool unico de conexiones. La primera llamada lo crea y
 *   lo conecta; las siguientes reutilizan la misma promesa, de modo que nunca se
 *   abre mas de un pool. Si la conexion falla, descarta la promesa para que la
 *   siguiente llamada vuelva a intentarlo; asi la API se recupera sola cuando
 *   SQL Server vuelve a estar disponible, sin reiniciarla.
 */
function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect().catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

/*
 * nombre: closePool
 * salidas: Promesa sin valor que se resuelve cuando el pool quedo cerrado.
 * descripcion: Cierra el pool de conexiones, si existe, y libera las conexiones
 *   abiertas con SQL Server. Se usa al detener la API. Si el pool nunca llego a
 *   conectarse, no hace nada.
 */
async function closePool() {
  if (poolPromise) {
    const pool = await poolPromise.catch(() => null);
    poolPromise = null;
    if (pool) await pool.close();
  }
}

module.exports = { sql, getPool, closePool };

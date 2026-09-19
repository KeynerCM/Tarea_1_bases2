/*
 * nombre: server.js
 * descripcion: Punto de entrada de la API REST. Carga las variables de entorno
 *   del archivo .env, configura Express (lectura de JSON, rutas bajo /api/v1,
 *   respuesta para rutas inexistentes y manejador de errores), abre el puerto y
 *   cierra el pool de conexiones de forma ordenada al detener la API.
 *   Se ejecuta con npm start desde la carpeta codigo/.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const express = require('express');
const { router, errorHandler, fail } = require('./routes');
const { getPool, closePool } = require('./db');

const app = express();

app.use(express.json());
app.use('/api/v1', router);

/*
 * nombre: manejador de rutas no encontradas
 * entradas: req: peticion de Express a una ruta que no coincide con ningun endpoint.
 *   res: objeto de respuesta de Express.
 * salidas: 404 con el formato uniforme y el metodo y la ruta pedidos.
 * descripcion: Se registra despues de las rutas, por lo que solo se ejecuta si
 *   ninguna coincidio. Reemplaza la pagina HTML de error que Express envia por
 *   defecto por una respuesta JSON.
 */
app.use((req, res) => fail(res, 404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;

/*
 * nombre: arranque del servidor (callback de app.listen)
 * entradas: err: error al abrir el puerto, por ejemplo EADDRINUSE si ya esta en
 *   uso; undefined si el puerto se abrio bien.
 * descripcion: En Express 5 este callback se ejecuta tanto si el puerto se abre
 *   como si falla, y en el segundo caso recibe el error. Si hay error, lo muestra
 *   y termina el proceso con codigo 1, para no dejar una API abierta que no
 *   atiende peticiones. Si no hay error, informa la URL y hace una primera
 *   conexion a SQL Server; si esa conexion falla, la API sigue corriendo y vuelve
 *   a intentarlo en la siguiente peticion.
 */
const server = app.listen(PORT, (err) => {
  if (err) {
    console.error(`No se pudo iniciar la API en el puerto ${PORT}: ${err.message}`);
    process.exit(1);
  }
  console.log(`API escuchando en http://localhost:${PORT}/api/v1`);
  getPool()
    .then(() => console.log(`Conectado a SQL Server, base ${process.env.DB_NAME}`))
    .catch((err) => console.error(`No se pudo conectar a SQL Server: ${err.message}`));
});

/*
 * nombre: shutdown
 * entradas: signal: nombre de la senal recibida del sistema operativo ('SIGINT'
 *   al presionar Ctrl+C, 'SIGTERM' al terminar el proceso).
 * descripcion: Detiene la API de forma ordenada: deja de aceptar peticiones
 *   nuevas, espera a que terminen las que estan en curso, cierra el pool de
 *   conexiones con SQL Server y termina el proceso con codigo 0.
 */
function shutdown(signal) {
  console.log(`${signal} recibido, cerrando la API...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

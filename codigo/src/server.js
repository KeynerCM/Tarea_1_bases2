// server.js - Arranque de la API REST y cierre ordenado del pool. Autor: Keyner Cerdas Morales, 2026-09-15.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const express = require('express');
const { router, errorHandler, fail } = require('./routes');
const { getPool, closePool } = require('./db');

const app = express();

app.use(express.json());
app.use('/api/v1', router);
app.use((req, res) => fail(res, 404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;

// En Express 5 este callback también recibe el error si el puerto no se puede abrir.
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

function shutdown(signal) {
  console.log(`${signal} recibido, cerrando la API...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

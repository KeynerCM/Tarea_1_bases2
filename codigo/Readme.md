### Código de la API REST (Node.js)

API REST en Node.js 20 con Express 5 que expone el CRUD de departamentos de
AdventureWorks2025. Solo invoca Stored Procedures del esquema `api`; no
contiene sentencias SQL.

| Archivo | Contenido |
|---|---|
| `src/server.js` | Arranque de la API y cierre ordenado |
| `src/routes.js` | Endpoints, validaciones y manejo de errores |
| `src/db.js` | Pool único de conexiones a SQL Server |
| `.env.example` | Plantilla de configuración, sin contraseñas |
| `package.json`, `package-lock.json` | Dependencias: express, mssql y dotenv |
| `docs/coleccion_postman.json` | Colección de pruebas para Postman |

Para ejecutarla, desde esta carpeta:

```bash
cp .env.example .env    # completar DB_PASSWORD con la clave de api_user
npm install
npm start
```

La API queda disponible en `http://localhost:3000/api/v1`. Detalle en las
secciones 5.2, 8 y 9 del [README principal](../README.md).

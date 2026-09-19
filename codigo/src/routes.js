/*
 * nombre: routes.js
 * descripcion: Define los endpoints REST de departamentos, las validaciones de
 *   entrada y el manejo centralizado de errores. Cada endpoint invoca unicamente
 *   Stored Procedures del esquema api por su nombre; este archivo no contiene
 *   sentencias SQL. Todos los valores se envian como parametros tipados, lo que
 *   impide la inyeccion de SQL.
 */
const express = require('express');
const { sql, getPool } = require('./db');

const router = express.Router();

const ID_INVALIDO = 'El id debe ser un número entero entre 1 y 32767.';
const BD_NO_DISPONIBLE = 'La base de datos no está disponible.';

/*
 * nombre: ok
 * entradas: res: objeto de respuesta de Express.
 *   status: codigo HTTP de exito (200 o 201).
 *   data: resultado a devolver, un objeto o un arreglo.
 *   meta: informacion adicional, como el total de registros y la paginacion.
 *     Es opcional; por defecto es null.
 * salidas: La respuesta HTTP enviada, con el cuerpo
 *   { success: true, data, meta, error: null }.
 * descripcion: Envia una respuesta exitosa con el formato uniforme de la API.
 */
function ok(res, status, data, meta = null) {
  return res.status(status).json({ success: true, data, meta, error: null });
}

/*
 * nombre: fail
 * entradas: res: objeto de respuesta de Express.
 *   status: codigo HTTP de error (400, 404, 409, 500 o 503).
 *   message: mensaje en espanol que explica el error.
 * salidas: La respuesta HTTP enviada, con el cuerpo
 *   { success: false, data: null, meta: null, error: message }.
 * descripcion: Envia una respuesta de error con el mismo formato uniforme que las
 *   respuestas exitosas, para que el cliente siempre reciba la misma estructura.
 */
function fail(res, status, message) {
  return res.status(status).json({ success: false, data: null, meta: null, error: message });
}

/*
 * nombre: parseId
 * entradas: value: texto del parametro :id de la ruta.
 * salidas: El identificador como numero entero entre 1 y 32767, o null si el
 *   valor no es valido.
 * descripcion: Valida el identificador de un departamento. Solo acepta digitos,
 *   por lo que rechaza letras, decimales y numeros negativos. El rango 1 a 32767
 *   corresponde al tipo SMALLINT de la columna DepartmentID.
 */
function parseId(value) {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return id >= 1 && id <= 32767 ? id : null;
}

/*
 * nombre: parseQueryInt
 * entradas: value: texto recibido en la query string, o undefined si no se envio.
 *   defaultValue: valor que se usa cuando el parametro no se envio.
 *   min, max: rango permitido, inclusive.
 * salidas: El numero entero, defaultValue si no se envio el parametro, o NaN si
 *   el valor no es un entero dentro del rango.
 * descripcion: Convierte y valida los parametros numericos de paginacion
 *   (offset y limit). Quien la llama revisa si el resultado es NaN para
 *   responder 400.
 */
function parseQueryInt(value, defaultValue, min, max) {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return NaN;
  const n = Number(value);
  return n >= min && n <= max ? n : NaN;
}

/*
 * nombre: validateDepartment
 * entradas: body: cuerpo JSON de la peticion, con los campos Name y GroupName.
 * salidas: Arreglo con los mensajes de error encontrados. Si esta vacio, los
 *   datos son validos.
 * descripcion: Valida los datos de un departamento antes de enviarlos a la base.
 *   Name y GroupName son obligatorios, deben ser texto y no pueden superar los 50
 *   caracteres (tamano de las columnas NVARCHAR(50)). Los espacios al inicio y al
 *   final no cuentan, asi que un texto con solo espacios se considera vacio.
 */
function validateDepartment(body) {
  const errores = [];
  for (const campo of ['Name', 'GroupName']) {
    const valor = body?.[campo];
    if (typeof valor !== 'string' || valor.trim() === '') {
      errores.push(`El campo ${campo} es obligatorio.`);
    } else if (valor.trim().length > 50) {
      errores.push(`El campo ${campo} no puede superar los 50 caracteres.`);
    }
  }
  return errores;
}

/*
 * nombre: toDateOnly
 * entradas: value: fecha (Date) que proviene de una columna SQL de tipo date, o
 *   null.
 * salidas: Texto con formato AAAA-MM-DD, o null si value es null.
 * descripcion: Las columnas de tipo date no tienen hora, pero el driver las
 *   entrega como la medianoche local del dia. Si se devolvieran tal cual, el JSON
 *   mostraria una hora (por ejemplo 2009-02-13T06:00:00.000Z). Esta funcion
 *   devuelve solo la fecha, usando la hora local para no cambiar de dia.
 */
function toDateOnly(value) {
  if (!value) return null;
  const mm = String(value.getMonth() + 1).padStart(2, '0');
  const dd = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${mm}-${dd}`;
}

/*
 * nombre: findDepartment
 * entradas: pool: pool de conexiones obtenido con getPool().
 *   id: identificador del departamento, ya validado con parseId.
 * salidas: Promesa que se resuelve con el departamento (DepartmentID, Name,
 *   GroupName, ModifiedDate) o con null si no existe.
 * descripcion: Ejecuta api.usp_Department_SelectById. La reutilizan varios
 *   endpoints: la consulta por id, la creacion y la actualizacion (para devolver
 *   el registro ya guardado) y la consulta de empleados (para verificar que el
 *   departamento existe).
 */
async function findDepartment(pool, id) {
  const result = await pool.request()
    .input('DepartmentID', sql.SmallInt, id)
    .execute('api.usp_Department_SelectById');
  return result.recordset[0] || null;
}

/*
 * nombre: GET /api/v1/health
 * salidas: 200 con { api: 'activa', baseDatos: 'conectada' }.
 *   503 si no hay conexion con SQL Server.
 * descripcion: Verifica el estado del servicio. En lugar de solo responder, ejecuta
 *   un Stored Procedure real (api.usp_Department_SelectAll con limite de 1 fila),
 *   con lo que confirma a la vez la conexion con SQL Server y que api_user tiene
 *   el permiso EXECUTE sobre el esquema api.
 */
router.get('/health', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().input('Limit', sql.Int, 1).execute('api.usp_Department_SelectAll');
    return ok(res, 200, { api: 'activa', baseDatos: 'conectada' });
  } catch (err) {
    console.error(`[health] ${err.message}`);
    return fail(res, 503, BD_NO_DISPONIBLE);
  }
});

/*
 * nombre: GET /api/v1/departments
 * entradas: Query string:
 *   offset: cantidad de registros a omitir; entero mayor o igual a 0 (por defecto 0).
 *   limit: cantidad de registros a devolver; entero entre 1 y 200 (por defecto 50).
 *   search: texto de hasta 50 caracteres para filtrar por nombre o grupo; opcional.
 * salidas: 200 con el arreglo de departamentos de la pagina pedida y
 *   meta { total, offset, limit }.
 *   400 si algun parametro no es valido.
 * descripcion: Lista los departamentos con paginacion y filtro opcional mediante
 *   api.usp_Department_SelectAll. El SP devuelve el total de registros que cumplen
 *   el filtro en la columna TotalRegistros de cada fila; se toma de la primera
 *   fila para meta.total y se quita de los objetos que se devuelven.
 */
router.get('/departments', async (req, res) => {
  const offset = parseQueryInt(req.query.offset, 0, 0, 1000000);
  const limit = parseQueryInt(req.query.limit, 50, 1, 200);
  const { search } = req.query;

  if (Number.isNaN(offset)) return fail(res, 400, 'offset debe ser un número entero mayor o igual a 0.');
  if (Number.isNaN(limit)) return fail(res, 400, 'limit debe ser un número entero entre 1 y 200.');
  if (search !== undefined && (typeof search !== 'string' || search.length > 50)) {
    return fail(res, 400, 'search debe ser un texto de máximo 50 caracteres.');
  }

  const pool = await getPool();
  const result = await pool.request()
    .input('Offset', sql.Int, offset)
    .input('Limit', sql.Int, limit)
    .input('Search', sql.NVarChar(50), search?.trim() || null)
    .execute('api.usp_Department_SelectAll');

  const rows = result.recordset;
  const total = rows.length ? rows[0].TotalRegistros : 0;
  const data = rows.map(({ TotalRegistros, ...department }) => department);
  return ok(res, 200, data, { total, offset, limit });
});

/*
 * nombre: GET /api/v1/departments/:id
 * entradas: id (ruta): identificador del departamento.
 * salidas: 200 con el departamento.
 *   400 si el id no es un entero entre 1 y 32767.
 *   404 si el departamento no existe.
 * descripcion: Consulta un departamento puntual mediante
 *   api.usp_Department_SelectById. El SP devuelve un conjunto vacio cuando el id
 *   no existe, y este endpoint lo traduce a 404.
 */
router.get('/departments/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, ID_INVALIDO);

  const department = await findDepartment(await getPool(), id);
  if (!department) return fail(res, 404, `No existe un departamento con id ${id}.`);
  return ok(res, 200, department);
});

/*
 * nombre: POST /api/v1/departments
 * entradas: Cuerpo JSON con Name y GroupName (texto obligatorio, maximo 50
 *   caracteres cada uno).
 * salidas: 201 con el departamento creado y la cabecera Location con su URL.
 *   400 si los datos no son validos.
 *   409 si ya existe un departamento con ese nombre (error 50409 del SP).
 * descripcion: Crea un departamento mediante api.usp_Department_Insert. El SP
 *   devuelve el id generado en el parametro de salida NewDepartmentID; con ese id
 *   se consulta el registro guardado para devolverlo completo, incluida la fecha
 *   de modificacion que asigna la base.
 */
router.post('/departments', async (req, res) => {
  const errores = validateDepartment(req.body);
  if (errores.length) return fail(res, 400, errores.join(' '));

  const pool = await getPool();
  const result = await pool.request()
    .input('Name', sql.NVarChar(50), req.body.Name.trim())
    .input('GroupName', sql.NVarChar(50), req.body.GroupName.trim())
    .output('NewDepartmentID', sql.SmallInt)
    .execute('api.usp_Department_Insert');

  const id = result.output.NewDepartmentID;
  res.location(`/api/v1/departments/${id}`);
  return ok(res, 201, await findDepartment(pool, id));
});

/*
 * nombre: PUT /api/v1/departments/:id
 * entradas: id (ruta): identificador del departamento.
 *   Cuerpo JSON con Name y GroupName (texto obligatorio, maximo 50 caracteres
 *   cada uno).
 * salidas: 200 con el departamento ya actualizado.
 *   400 si el id o los datos no son validos.
 *   404 si el departamento no existe.
 *   409 si el nuevo nombre ya pertenece a otro departamento (error 50409 del SP).
 * descripcion: Actualiza el nombre y el grupo mediante api.usp_Department_Update.
 *   El SP devuelve FilasAfectadas; si es 0, el departamento no existe y se
 *   responde 404.
 */
router.put('/departments/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, ID_INVALIDO);
  const errores = validateDepartment(req.body);
  if (errores.length) return fail(res, 400, errores.join(' '));

  const pool = await getPool();
  const result = await pool.request()
    .input('DepartmentID', sql.SmallInt, id)
    .input('Name', sql.NVarChar(50), req.body.Name.trim())
    .input('GroupName', sql.NVarChar(50), req.body.GroupName.trim())
    .execute('api.usp_Department_Update');

  if (result.recordset[0].FilasAfectadas === 0) {
    return fail(res, 404, `No existe un departamento con id ${id}.`);
  }
  return ok(res, 200, await findDepartment(pool, id));
});

/*
 * nombre: DELETE /api/v1/departments/:id
 * entradas: id (ruta): identificador del departamento.
 * salidas: 204 sin cuerpo si se borro.
 *   400 si el id no es valido.
 *   404 si el departamento no existe.
 *   409 si el departamento tiene empleados en su historial (error 50547 del SP).
 * descripcion: Borra un departamento mediante api.usp_Department_Delete. Los
 *   departamentos con registros en HumanResources.EmployeeDepartmentHistory no se
 *   pueden borrar por la llave foranea; el SP convierte ese error en uno legible y
 *   el manejador de errores responde 409 en lugar de 500.
 */
router.delete('/departments/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, ID_INVALIDO);

  const pool = await getPool();
  const result = await pool.request()
    .input('DepartmentID', sql.SmallInt, id)
    .execute('api.usp_Department_Delete');

  if (result.recordset[0].FilasAfectadas === 0) {
    return fail(res, 404, `No existe un departamento con id ${id}.`);
  }
  return res.status(204).end();
});

/*
 * nombre: GET /api/v1/departments/:id/employees
 * entradas: id (ruta): identificador del departamento.
 *   activos (query string): 'true' o '1' para ver solo los empleados que siguen en
 *   el departamento; 'false' o '0' para incluir tambien el historial. Por defecto
 *   'true'.
 * salidas: 200 con el arreglo de empleados (puede estar vacio) y
 *   meta { total, activos }.
 *   400 si el id o el parametro activos no son validos.
 *   404 si el departamento no existe.
 * descripcion: Consulta con JOIN mediante api.usp_EmployeesByDepartment_Select,
 *   que une Department, EmployeeDepartmentHistory, Employee y Shift (esquema
 *   HumanResources) con Person (esquema Person). Primero verifica que el
 *   departamento exista, para distinguir un departamento inexistente (404) de uno
 *   sin empleados (200 con arreglo vacio). Las fechas de ingreso y salida se
 *   devuelven como AAAA-MM-DD.
 */
router.get('/departments/:id/employees', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, ID_INVALIDO);

  const { activos } = req.query;
  if (activos !== undefined && !['true', 'false', '1', '0'].includes(activos)) {
    return fail(res, 400, 'activos debe ser true o false.');
  }
  const soloActivos = activos === undefined || activos === 'true' || activos === '1';

  const pool = await getPool();
  if (!(await findDepartment(pool, id))) {
    return fail(res, 404, `No existe un departamento con id ${id}.`);
  }

  const result = await pool.request()
    .input('DepartmentID', sql.SmallInt, id)
    .input('SoloActivos', sql.Bit, soloActivos)
    .execute('api.usp_EmployeesByDepartment_Select');

  const data = result.recordset.map((row) => ({
    ...row,
    FechaIngresoDepartamento: toDateOnly(row.FechaIngresoDepartamento),
    FechaSalidaDepartamento: toDateOnly(row.FechaSalidaDepartamento),
  }));
  return ok(res, 200, data, { total: data.length, activos: soloActivos });
});

const CODIGOS_CONEXION = new Set(['ESOCKET', 'ETIMEOUT', 'ELOGIN', 'ECONNCLOSED', 'ENOTOPEN', 'EINSTLOOKUP']);

/*
 * nombre: errorHandler
 * entradas: err: error lanzado por un endpoint o por Express.
 *   req: peticion de Express.
 *   res: objeto de respuesta de Express.
 *   next: siguiente middleware. No se usa, pero Express necesita que la funcion
 *   reciba los cuatro parametros para reconocerla como manejador de errores.
 * salidas: Respuesta HTTP de error con el formato uniforme:
 *   400 si el cuerpo de la peticion no es un JSON valido.
 *   409 si el error es 50409 (nombre repetido) o 50547 (departamento con historial).
 *   503 si el error es de conexion con SQL Server (codigos de CODIGOS_CONEXION).
 *   500 para cualquier otro error.
 * descripcion: Manejador centralizado de errores. Traduce los errores de SQL
 *   Server y de Express a codigos HTTP, para que ningun error esperado termine
 *   en un 500. Los errores 50409 y 50547 son los errores propios que lanzan los
 *   Stored Procedures de escritura. En el caso 500 el detalle se escribe en la
 *   consola y al cliente solo se le envia un mensaje generico.
 */
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return fail(res, 400, 'El cuerpo de la petición no es un JSON válido.');
  }
  if (err.number === 50409 || err.number === 50547) {
    return fail(res, 409, err.message);
  }
  if (CODIGOS_CONEXION.has(err.code)) {
    console.error(`[bd] ${err.code}: ${err.message}`);
    return fail(res, 503, BD_NO_DISPONIBLE);
  }
  console.error(err);
  return fail(res, 500, 'Error interno del servidor.');
}

module.exports = { router, errorHandler, fail };

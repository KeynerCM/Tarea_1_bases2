// routes.js - Endpoints REST de departamentos; solo invocan Stored Procedures del esquema api. Autor: Keyner Cerdas Morales, 2026-09-15.
const express = require('express');
const { sql, getPool } = require('./db');

const router = express.Router();

const ID_INVALIDO = 'El id debe ser un número entero entre 1 y 32767.';
const BD_NO_DISPONIBLE = 'La base de datos no está disponible.';

function ok(res, status, data, meta = null) {
  return res.status(status).json({ success: true, data, meta, error: null });
}

function fail(res, status, message) {
  return res.status(status).json({ success: false, data: null, meta: null, error: message });
}

function parseId(value) {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return id >= 1 && id <= 32767 ? id : null;
}

function parseQueryInt(value, defaultValue, min, max) {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return NaN;
  const n = Number(value);
  return n >= min && n <= max ? n : NaN;
}

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

// Las columnas SQL de tipo date llegan como medianoche local; se devuelven como YYYY-MM-DD.
function toDateOnly(value) {
  if (!value) return null;
  const mm = String(value.getMonth() + 1).padStart(2, '0');
  const dd = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${mm}-${dd}`;
}

async function findDepartment(pool, id) {
  const result = await pool.request()
    .input('DepartmentID', sql.SmallInt, id)
    .execute('api.usp_Department_SelectById');
  return result.recordset[0] || null;
}

router.get('/health', async (req, res) => {
  try {
    const pool = await getPool();
    // Ejecutar un SP real valida la conexión y el permiso EXECUTE de api_user.
    await pool.request().input('Limit', sql.Int, 1).execute('api.usp_Department_SelectAll');
    return ok(res, 200, { api: 'activa', baseDatos: 'conectada' });
  } catch (err) {
    console.error(`[health] ${err.message}`);
    return fail(res, 503, BD_NO_DISPONIBLE);
  }
});

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

router.get('/departments/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, ID_INVALIDO);

  const department = await findDepartment(await getPool(), id);
  if (!department) return fail(res, 404, `No existe un departamento con id ${id}.`);
  return ok(res, 200, department);
});

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

// 50409 y 50547 son los errores propios que lanzan los SP de escritura.
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

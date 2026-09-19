### Scripts SQL del proyecto

Scripts de base de datos para AdventureWorks2025 en SQL Server 2025. Se ejecutan
en orden, como el usuario `sa`, desde la raíz del repositorio.

| Orden | Archivo | Qué hace |
|---|---|---|
| 1 | `01_schema_api.sql` | Crea el esquema `api` |
| 2 | `02_login_api_user.sql` | Crea el login y el usuario `api_user`, con permiso solo de `EXECUTE` sobre el esquema `api` |
| 3 | `03_sp_department_select_all.sql` | SP de consulta de la tabla, con paginación y filtro |
| 4 | `04_sp_department_select_by_id.sql` | SP de consulta por identificador |
| 5 | `05_sp_department_insert.sql` | SP de inserción |
| 6 | `06_sp_department_update.sql` | SP de actualización |
| 7 | `07_sp_department_delete.sql` | SP de borrado |
| 8 | `08_sp_employees_by_department.sql` | SP de la consulta con JOIN |

Para ejecutar los ocho scripts de una vez:

```bash
for f in "Script sql"/0[1-8]_*.sql; do
  sqlcmd -S localhost -U sa -P '<CLAVE_SA>' -C -b -v ApiUserPassword='<CLAVE_API_USER>' -i "$f" || break
done
```

El script `02` recibe la contraseña de `api_user` con la opción `-v` de sqlcmd,
así que nunca queda escrita en los archivos. Instrucciones completas en la
sección 5.1 del [README principal](../README.md#51-ejecutar-los-scripts-sql).

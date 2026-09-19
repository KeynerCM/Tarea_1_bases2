/*

 Archivo    : 01_schema_api.sql
 Proposito  : Crear el esquema 'api' que contiene todos los Stored
              Procedures expuestos por la API REST. Se usa un esquema
              propio para no alterar los esquemas originales de
              AdventureWorks y poder otorgar permisos granulares.
 Parametros : Ninguno
 Ejecucion  : sqlcmd -S localhost -U sa -P '<clave>' -C \
                     -d AdventureWorks2025 -i "Script sql/01_schema_api.sql"
*/

USE AdventureWorks2025;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'api')
BEGIN
    EXEC('CREATE SCHEMA api');
    PRINT 'Esquema [api] creado correctamente.';
END
ELSE
BEGIN
    PRINT 'El esquema [api] ya existe. No se realizaron cambios.';
END
GO

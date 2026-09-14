/*
====================================================================
 Archivo    : 02_login_api_user.sql
 Proposito  : Crear el login y el usuario de base de datos que utiliza
              la API REST, aplicando el principio de minimo privilegio:
              solo recibe EXECUTE sobre el esquema [api]. No puede
              ejecutar SELECT, INSERT, UPDATE ni DELETE directos contra
              las tablas de AdventureWorks.
 Autor      : Keyner Cerdas Morales
 Fecha      : 2026-09-14
 Parametros : $(ApiUserPassword) - contrasena del login api_user.
              Se entrega en tiempo de ejecucion, nunca se versiona.
 Ejecucion  : sqlcmd -S localhost -U sa -P '<clave>' -C \
                     -d AdventureWorks2025 \
                     -v ApiUserPassword="<clave_api_user>" \
                     -i "Script sql/02_login_api_user.sql"
====================================================================
*/

USE master;
GO

-- Login a nivel de servidor
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'api_user')
BEGIN
    CREATE LOGIN api_user
        WITH PASSWORD = '$(ApiUserPassword)',
             CHECK_POLICY = ON,
             DEFAULT_DATABASE = AdventureWorks2025;
    PRINT 'Login [api_user] creado correctamente.';
END
ELSE
BEGIN
    PRINT 'El login [api_user] ya existe. No se realizaron cambios.';
END
GO

USE AdventureWorks2025;
GO

-- Usuario de base de datos asociado al login
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'api_user')
BEGIN
    CREATE USER api_user FOR LOGIN api_user;
    PRINT 'Usuario [api_user] creado en AdventureWorks2025.';
END
ELSE
BEGIN
    PRINT 'El usuario [api_user] ya existe en AdventureWorks2025.';
END
GO

-- Unico permiso otorgado: ejecutar los Stored Procedures del esquema api
GRANT EXECUTE ON SCHEMA::api TO api_user;
PRINT 'Permiso EXECUTE sobre el esquema [api] otorgado a [api_user].';
GO

-- Denegacion explicita de acceso directo a las tablas.
-- Refuerza que toda operacion pase obligatoriamente por un Stored Procedure.
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::HumanResources TO api_user;
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::Person         TO api_user;
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::Production     TO api_user;
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::Sales          TO api_user;
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::Purchasing     TO api_user;
PRINT 'Acceso directo a las tablas denegado explicitamente para [api_user].';
GO

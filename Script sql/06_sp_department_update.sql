/*
 Archivo    : 06_sp_department_update.sql
 Proposito  : Actualizar el nombre y el grupo de un departamento.
              Devuelve las filas afectadas: 0 significa que el
              identificador no existe y la API responde 404.
 Parametros : @DepartmentID SMALLINT     - departamento a modificar
              @Name         NVARCHAR(50) - nuevo nombre (unico)
              @GroupName    NVARCHAR(50) - nuevo grupo
 Retorna    : Columna FilasAfectadas (0 o 1).
 Errores    : 50409 - ya existe otro departamento con ese nombre
 Ejecucion  : EXEC api.usp_Department_Update
                   @DepartmentID = 17, @Name = N'Nuevo', @GroupName = N'Grupo';
*/

USE AdventureWorks2025;
GO

CREATE OR ALTER PROCEDURE api.usp_Department_Update
    @DepartmentID SMALLINT,
    @Name         NVARCHAR(50),
    @GroupName    NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        UPDATE HumanResources.Department
        SET Name         = @Name,
            GroupName    = @GroupName,
            ModifiedDate = GETDATE()
        WHERE DepartmentID = @DepartmentID;

        SELECT FilasAfectadas = @@ROWCOUNT;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 50409, 'Ya existe otro departamento con ese nombre.', 1;

        THROW;
    END CATCH
END
GO

PRINT 'Stored Procedure [api].[usp_Department_Update] creado correctamente.';
GO

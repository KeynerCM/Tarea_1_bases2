/*
 Archivo    : 07_sp_department_delete.sql
 Proposito  : Eliminar un departamento. Devuelve las filas afectadas:
              0 significa que el identificador no existe y la API
              responde 404. Si el departamento tiene historial de
              empleados, la llave foranea impide borrarlo y se lanza
              un error legible que la API traduce a 409.
 Parametros : @DepartmentID SMALLINT - departamento a eliminar
 Retorna    : Columna FilasAfectadas (0 o 1).
 Errores    : 50547 - el departamento tiene empleados en su historial
 Ejecucion  : EXEC api.usp_Department_Delete @DepartmentID = 17;
*/

USE AdventureWorks2025;
GO

CREATE OR ALTER PROCEDURE api.usp_Department_Delete
    @DepartmentID SMALLINT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        DELETE FROM HumanResources.Department
        WHERE DepartmentID = @DepartmentID;

        SELECT FilasAfectadas = @@ROWCOUNT;
    END TRY
    BEGIN CATCH
        -- 547: conflicto con FK_EmployeeDepartmentHistory_Department_DepartmentID
        IF ERROR_NUMBER() = 547
            THROW 50547, 'No se puede eliminar el departamento porque tiene empleados registrados en su historial.', 1;

        THROW;
    END CATCH
END
GO

PRINT 'Stored Procedure [api].[usp_Department_Delete] creado correctamente.';
GO

/*
====================================================================
 Archivo    : 04_sp_department_select_by_id.sql
 Proposito  : Consultar un departamento puntual por su identificador.
              Si el identificador no existe devuelve un conjunto
              vacio, sin lanzar error: la traduccion a HTTP 404 es
              responsabilidad de la capa Node.
 Autor      : Keyner Cerdas Morales
 Fecha      : 2026-09-14
 Parametros : @DepartmentID SMALLINT - identificador del departamento
 Retorna    : Result set con 0 o 1 fila.
 Ejecucion  : EXEC api.usp_Department_SelectById @DepartmentID = 1;
====================================================================
*/

USE AdventureWorks2025;
GO

CREATE OR ALTER PROCEDURE api.usp_Department_SelectById
    @DepartmentID SMALLINT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        SELECT
            d.DepartmentID,
            d.Name,
            d.GroupName,
            d.ModifiedDate
        FROM HumanResources.Department AS d
        WHERE d.DepartmentID = @DepartmentID;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

PRINT 'Stored Procedure [api].[usp_Department_SelectById] creado correctamente.';
GO

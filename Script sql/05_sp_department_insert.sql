/*
====================================================================
 Archivo    : 05_sp_department_insert.sql
 Proposito  : Insertar un nuevo departamento y devolver el
              identificador generado.
 Autor      : Keyner Cerdas Morales
 Fecha      : 2026-09-15
 Parametros : @Name            NVARCHAR(50) - nombre del departamento (unico)
              @GroupName       NVARCHAR(50) - grupo al que pertenece
              @NewDepartmentID SMALLINT OUTPUT - identificador generado
 Errores    : 50409 - ya existe un departamento con ese nombre
 Ejecucion  : DECLARE @Id SMALLINT;
              EXEC api.usp_Department_Insert
                   @Name = N'Prueba', @GroupName = N'Grupo',
                   @NewDepartmentID = @Id OUTPUT;
              SELECT @Id;
====================================================================
*/

USE AdventureWorks2025;
GO

CREATE OR ALTER PROCEDURE api.usp_Department_Insert
    @Name            NVARCHAR(50),
    @GroupName       NVARCHAR(50),
    @NewDepartmentID SMALLINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        INSERT INTO HumanResources.Department (Name, GroupName, ModifiedDate)
        VALUES (@Name, @GroupName, GETDATE());

        SET @NewDepartmentID = CAST(SCOPE_IDENTITY() AS SMALLINT);
    END TRY
    BEGIN CATCH
        -- 2601/2627: violacion del indice unico AK_Department_Name
        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 50409, 'Ya existe un departamento con ese nombre.', 1;

        THROW;
    END CATCH
END
GO

PRINT 'Stored Procedure [api].[usp_Department_Insert] creado correctamente.';
GO

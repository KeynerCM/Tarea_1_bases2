/*
 Archivo    : 03_sp_department_select_all.sql
 Proposito  : Consultar los departamentos de la tabla
              HumanResources.Department con paginacion y filtro
              opcional por nombre. Responde al requerimiento de
              "procedimiento almacenado que retorne los resultados
              de una tabla".
 Parametros : @Offset INT           - filas a omitir (default 0)
              @Limit  INT           - filas a retornar (default 50)
              @Search NVARCHAR(50)  - filtro parcial por Name o
                                      GroupName (default NULL = sin filtro)
 Retorna    : Result set de departamentos y la columna TotalRegistros
              con el total de filas que cumplen el filtro.
 Ejecucion  : EXEC api.usp_Department_SelectAll @Offset = 0, @Limit = 5;
*/

USE AdventureWorks2025;
GO

CREATE OR ALTER PROCEDURE api.usp_Department_SelectAll
    @Offset INT          = 0,
    @Limit  INT          = 50,
    @Search NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- Saneamiento de los parametros de paginacion
        IF @Offset IS NULL OR @Offset < 0
            SET @Offset = 0;

        IF @Limit IS NULL OR @Limit <= 0
            SET @Limit = 50;

        -- Tope de seguridad para no devolver conjuntos desmedidos
        IF @Limit > 200
            SET @Limit = 200;

        DECLARE @Total INT;

        SELECT @Total = COUNT(*)
        FROM HumanResources.Department
        WHERE @Search IS NULL
           OR Name      LIKE '%' + @Search + '%'
           OR GroupName LIKE '%' + @Search + '%';

        SELECT
            d.DepartmentID,
            d.Name,
            d.GroupName,
            d.ModifiedDate,
            TotalRegistros = @Total
        FROM HumanResources.Department AS d
        WHERE @Search IS NULL
           OR d.Name      LIKE '%' + @Search + '%'
           OR d.GroupName LIKE '%' + @Search + '%'
        ORDER BY d.DepartmentID
        OFFSET @Offset ROWS
        FETCH NEXT @Limit ROWS ONLY;
    END TRY
    BEGIN CATCH
        -- Se relanza el error para que la capa Node lo traduzca a HTTP
        THROW;
    END CATCH
END
GO

PRINT 'Stored Procedure [api].[usp_Department_SelectAll] creado correctamente.';
GO

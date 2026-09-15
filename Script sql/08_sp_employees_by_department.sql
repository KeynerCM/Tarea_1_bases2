/*
====================================================================
 Archivo    : 08_sp_employees_by_department.sql
 Proposito  : Consultar los empleados de cada departamento cruzando
              tablas de los esquemas HumanResources y Person. Responde
              al requerimiento de "procedimiento almacenado que
              responda a una consulta con join".
              Relacion utilizada:
                Department
                  -> EmployeeDepartmentHistory
                     -> Employee -> Person.Person
                     -> Shift
 Autor      : Keyner Cerdas Morales
 Fecha      : 2026-09-15
 Parametros : @DepartmentID SMALLINT - departamento a consultar
                                       (default NULL = todos)
              @SoloActivos  BIT      - 1 = solo empleados que siguen en
                                       el departamento (EndDate IS NULL),
                                       0 = incluye historial (default 1)
 Retorna    : Result set con departamento, nombre completo, cargo,
              turno, fecha de ingreso y fecha de salida.
 Ejecucion  : EXEC api.usp_EmployeesByDepartment_Select @DepartmentID = 7;
====================================================================
*/

USE AdventureWorks2025;
GO

CREATE OR ALTER PROCEDURE api.usp_EmployeesByDepartment_Select
    @DepartmentID SMALLINT = NULL,
    @SoloActivos  BIT      = 1
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        SELECT
            d.DepartmentID,
            Departamento             = d.Name,
            e.BusinessEntityID,
            NombreCompleto           = CONCAT_WS(' ', p.FirstName, p.MiddleName, p.LastName),
            Cargo                    = e.JobTitle,
            Turno                    = s.Name,
            FechaIngresoDepartamento = edh.StartDate,
            FechaSalidaDepartamento  = edh.EndDate
        FROM HumanResources.Department AS d
        INNER JOIN HumanResources.EmployeeDepartmentHistory AS edh
            ON edh.DepartmentID = d.DepartmentID
        INNER JOIN HumanResources.Employee AS e
            ON e.BusinessEntityID = edh.BusinessEntityID
        INNER JOIN Person.Person AS p
            ON p.BusinessEntityID = e.BusinessEntityID
        INNER JOIN HumanResources.Shift AS s
            ON s.ShiftID = edh.ShiftID
        WHERE (@DepartmentID IS NULL OR d.DepartmentID = @DepartmentID)
          AND (ISNULL(@SoloActivos, 1) = 0 OR edh.EndDate IS NULL)
        ORDER BY d.DepartmentID, p.LastName, p.FirstName;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO

PRINT 'Stored Procedure [api].[usp_EmployeesByDepartment_Select] creado correctamente.';
GO

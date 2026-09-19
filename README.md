# Tarea 1 - API REST sobre SQL Server (AdventureWorks2025)
### Nombre y carné de los integrantes:
Keyner Cerdas Morales - 2024108270

### Estado del proyecto:
Completado y funcional.

### Enlace del video:
https://youtu.be/8RNsEUSl7Wo

---

## Tabla de contenidos

1. [Introducción](#1-introducción)
    - [Contexto](#contexto)
    - [Objetivo](#objetivo)
    - [Alcance](#alcance)
    - [Datos del curso](#datos-del-curso)
2. [Arquitectura de la solución](#2-arquitectura-de-la-solución)
    - [Diagrama](#diagrama)
    - [Recorrido de una petición](#recorrido-de-una-petición)
    - [Decisiones de diseño](#decisiones-de-diseño)
3. [Requerimientos previos](#3-requerimientos-previos)
    - [Hardware](#hardware)
    - [Software](#software)
    - [Conocimientos](#conocimientos)
4. [Instalación paso a paso](#4-instalación-paso-a-paso)
    - [4.1 Preparar Ubuntu](#41-preparar-ubuntu)
    - [4.2 Instalar SQL Server 2025](#42-instalar-sql-server-2025)
    - [4.3 Instalar las herramientas de línea de comandos (sqlcmd)](#43-instalar-las-herramientas-de-línea-de-comandos-sqlcmd)
    - [4.4 Verificar la conexión a SQL Server](#44-verificar-la-conexión-a-sql-server)
    - [4.5 Restaurar la base de datos AdventureWorks2025](#45-restaurar-la-base-de-datos-adventureworks2025)
    - [4.6 Instalar Node.js 20](#46-instalar-nodejs-20)
    - [4.7 Instalar Postman](#47-instalar-postman)
    - [4.8 Clonar el repositorio](#48-clonar-el-repositorio)
5. [Configuración](#5-configuración)
    - [5.1 Ejecutar los scripts SQL](#51-ejecutar-los-scripts-sql)
    - [5.2 Variables de entorno](#52-variables-de-entorno)
    - [5.3 Instalar las dependencias de Node.js](#53-instalar-las-dependencias-de-nodejs)
6. [Estructura del repositorio](#6-estructura-del-repositorio)
7. [Stored Procedures](#7-stored-procedures)
    - [Resumen](#resumen)
    - [Detalle](#detalle)
    - [Errores propios](#errores-propios)
    - [Ejemplos de ejecución directa](#ejemplos-de-ejecución-directa)
8. [Servicios web (endpoints)](#8-servicios-web-endpoints)
    - [Contrato](#contrato)
    - [Parámetros](#parámetros)
    - [Formato de respuesta](#formato-de-respuesta)
    - [Códigos HTTP](#códigos-http)
    - [Ejemplos rápidos con curl](#ejemplos-rápidos-con-curl)
9. [Ejecución del proyecto](#9-ejecución-del-proyecto)
    - [Iniciar la API](#iniciar-la-api)
    - [Verificar que funciona](#verificar-que-funciona)
    - [Detener la API](#detener-la-api)
10. [Datos de prueba](#10-datos-de-prueba)
    - [Importar la colección](#importar-la-colección)
    - [Escenario 0: estado del servicio](#escenario-0-estado-del-servicio)
    - [Escenario 1: estado inicial](#escenario-1-estado-inicial)
    - [Escenario 2: crear un departamento (INSERT)](#escenario-2-crear-un-departamento-insert)
    - [Escenario 3: actualizar el departamento (UPDATE)](#escenario-3-actualizar-el-departamento-update)
    - [Escenario 4: borrar el departamento (DELETE exitoso)](#escenario-4-borrar-el-departamento-delete-exitoso)
    - [Escenario 5: borrado rechazado por llave foránea](#escenario-5-borrado-rechazado-por-llave-foránea)
    - [Escenario 6: consulta con JOIN](#escenario-6-consulta-con-join)
    - [Escenario 7: validaciones y errores](#escenario-7-validaciones-y-errores)
11. [Referencias](#11-referencias)

---

## 1. Introducción

### Contexto

Esta tarea del curso **Bases de Datos II** busca poner en práctica una arquitectura en la que la comunicación entre la aplicación y la base de datos está descentralizada: la aplicación no escribe consultas SQL, sino que se comunica con la base de datos únicamente a través de una API y de procedimientos almacenados (Stored Procedures).

### Objetivo

Construir una API RESTful en Node.js que permita consultar, insertar, actualizar y eliminar departamentos de la base de datos de ejemplo **AdventureWorks2025**, alojada en **SQL Server 2025** sobre una distribución Linux (**Ubuntu 22.04.5 LTS**).

### Alcance

- Instalación de SQL Server 2025 en Ubuntu y restauración de AdventureWorks2025.
- Seis Stored Procedures en un esquema propio llamado `api`:
  - Cuatro para el CRUD: inserción, actualización, borrado y selección.
  - Uno que retorna los resultados de una tabla (`HumanResources.Department`), con paginación y filtro.
  - Uno que responde a una consulta con JOIN entre cinco tablas de dos esquemas distintos.
- Una API REST con seis endpoints más uno de verificación de estado (`/health`).
- Un usuario de base de datos (`api_user`) con el mínimo privilegio necesario: solo puede ejecutar los Stored Procedures, no puede leer ni modificar las tablas directamente.
- Datos de prueba reproducibles con una colección de Postman.

### Datos del curso

| Campo | Valor |
|---|---|
| Curso | Bases de Datos II |
| Actividad | Tarea 1 - API |
| Modalidad | Individual |
| Estudiante | Keyner Cerdas Morales |
| Carné | 2024108270 |

---

## 2. Arquitectura de la solución

### Diagrama

```text
 Cliente (Postman, navegador o curl)
            |
            |  HTTP + JSON, puerto 3000
            v
 +---------------------------------------------+
 |  API REST - Node.js 20 + Express 5          |
 |  codigo/src/server.js   arranque            |
 |  codigo/src/routes.js   endpoints y errores |
 |  codigo/src/db.js       pool de conexiones  |
 +---------------------------------------------+
            |
            |  driver mssql (protocolo TDS), puerto 1433
            |  usuario: api_user (solo EXECUTE sobre el esquema api)
            v
 +---------------------------------------------+
 |  SQL Server 2025 - Ubuntu 22.04.5 LTS       |
 |  Base de datos: AdventureWorks2025          |
 |                                             |
 |  Esquema api          -> 6 Stored Procedures|
 |  Esquema HumanResources \                   |
 |  Esquema Person          > tablas (datos)   |
 +---------------------------------------------+
```

### Recorrido de una petición

Por ejemplo, `GET /api/v1/departments/1`:

1. Express recibe la petición y valida que el `id` sea un número entero entre 1 y 32767. Si no lo es, responde `400` sin tocar la base de datos.
2. La API toma una conexión del pool (se crea una sola vez y se reutiliza) y ejecuta `api.usp_Department_SelectById` pasando el `id` como parámetro tipado `SmallInt`.
3. El Stored Procedure consulta `HumanResources.Department` y devuelve 0 o 1 fila.
4. La API traduce el resultado a JSON: `200` si encontró el departamento o `404` si no existe.

### Decisiones de diseño

**Toda operación de datos pasa por un Stored Procedure.** El código de la API no contiene ninguna sentencia `SELECT`, `INSERT`, `UPDATE` ni `DELETE`; solo invoca procedimientos por su nombre. Esto separa responsabilidades: la base de datos es dueña de la lógica de acceso a los datos y la API se encarga de HTTP, validación y formato de respuesta.

**Esquema propio `api`.** Los Stored Procedures se crean en un esquema nuevo, no en los esquemas originales de AdventureWorks (`HumanResources`, `Person`, etc.). Así no se altera la base de ejemplo y se pueden otorgar permisos a todo el esquema de una sola vez.

**Usuario con mínimo privilegio.** La API se conecta con el usuario `api_user`, no con `sa` (el administrador). Ese usuario:

- Tiene permiso `EXECUTE` sobre el esquema `api`: puede ejecutar los Stored Procedures.
- Tiene `DENY` explícito de `SELECT`, `INSERT`, `UPDATE` y `DELETE` sobre los esquemas de datos: no puede consultar ni modificar las tablas directamente.

Si alguien obtuviera las credenciales de la API, solo podría hacer lo que los Stored Procedures permiten.

**Por qué funciona a pesar del `DENY`.** SQL Server aplica el mecanismo de *ownership chaining* (encadenamiento de propiedad): cuando un Stored Procedure accede a una tabla que tiene el mismo dueño que el procedimiento (en este caso `dbo` es dueño de ambos esquemas), SQL Server no vuelve a verificar los permisos sobre la tabla. Por eso `api_user` obtiene datos al ejecutar `api.usp_Department_SelectById`, pero recibe un error de permisos si intenta `SELECT * FROM HumanResources.Department`. El Stored Procedure es la única puerta de entrada.

**Parámetros tipados.** Cada valor que llega del cliente se envía a SQL Server como un parámetro con tipo (`sql.NVarChar(50)`, `sql.SmallInt`, `sql.Int`, `sql.Bit`). El driver los transmite separados del nombre del procedimiento, nunca concatenados en un texto SQL, lo que impide la inyección de SQL.

**Un solo pool de conexiones.** Abrir una conexión a SQL Server es costoso, así que la API crea un pool una vez y lo reutiliza en todas las peticiones. Si SQL Server no está disponible, la API sigue corriendo, responde `503` y se reconecta sola cuando el servicio vuelve.

**Rutas versionadas.** Todas las rutas empiezan con `/api/v1`, para poder publicar una versión nueva sin romper a los clientes existentes.

**Fechas.** La columna `ModifiedDate` se guarda con `GETDATE()`, que devuelve la hora local del servidor. La API está configurada (`useUTC: false` en `codigo/src/db.js`) para interpretar esas fechas como hora local y devolverlas en formato ISO 8601 en UTC. Por eso `2008-04-30T06:00:00.000Z` corresponde a la medianoche del 30 de abril de 2008 en Costa Rica (UTC-6). Las columnas que solo guardan fecha, sin hora (ingreso y salida de un empleado), se devuelven como `AAAA-MM-DD`.

---

## 3. Requerimientos previos

### Hardware

| Recurso | Mínimo para SQL Server | Equipo donde se desarrolló |
|---|---|---|
| Memoria RAM | 2 GB (se recomiendan 4 GB) | 11 GB |
| Procesador | x64, 2 núcleos | 16 núcleos |
| Disco libre | 6 GB | 25 GB libres |

SQL Server no se instala si el equipo tiene menos de 2 GB de RAM. Si se usa una máquina virtual, conviene asignarle al menos 4 GB.

### Software

Todas las versiones de esta tabla son las que se usaron y verificaron en este proyecto.

| Software | Versión | Uso |
|---|---|---|
| Ubuntu | 22.04.5 LTS | Sistema operativo |
| SQL Server | 2025 (17.0.4085.5), edición Enterprise Developer | Motor de base de datos |
| mssql-tools18 (`sqlcmd`) | 18.6 | Cliente de línea de comandos para SQL Server |
| AdventureWorks | 2025 (OLTP) | Base de datos de ejemplo |
| Node.js | 20.20.2 (LTS) | Entorno de ejecución de la API |
| npm | 10.8.2 | Gestor de paquetes de Node.js |
| Express | 5.2.1 | Servidor HTTP |
| mssql | 12.7.2 | Driver de SQL Server para Node.js |
| dotenv | 17.4.2 | Carga de variables de entorno desde `.env` |
| Postman | 11.71.7 | Cliente HTTP para las pruebas |
| Git | 2.34.1 | Control de versiones |

### Conocimientos

Para seguir esta guía basta con saber abrir una terminal en Ubuntu y copiar comandos. Los comandos que empiezan con `sudo` piden la contraseña del usuario de Ubuntu.

---

## 4. Instalación paso a paso

Esta guía parte de un Ubuntu 22.04 recién instalado y sin SQL Server. Todos los comandos se ejecutan en una terminal.

En los comandos aparecen dos valores que cada persona debe elegir y reemplazar:

| Marcador | Significado |
|---|---|
| `<CLAVE_SA>` | Contraseña del administrador de SQL Server (`sa`), que se define en el paso 4.2 |
| `<CLAVE_API_USER>` | Contraseña del usuario de la API (`api_user`), que se define en el paso 5.1 |

Ambas contraseñas deben cumplir la política de SQL Server: **al menos 8 caracteres** y caracteres de **al menos tres** de estos cuatro grupos: mayúsculas, minúsculas, números y símbolos. Por ejemplo, `Clave#2026` es válida y `clave2026` no lo es.

### 4.1 Preparar Ubuntu

Actualizar la lista de paquetes e instalar `curl` (para descargar archivos) y `git` (para clonar el repositorio):

```bash
sudo apt-get update
sudo apt-get install -y curl git
```

Confirmar la versión del sistema:

```bash
lsb_release -a
```

Salida esperada:

```text
No LSB modules are available.
Distributor ID:	Ubuntu
Description:	Ubuntu 22.04.5 LTS
Release:	22.04
Codename:	jammy
```

### 4.2 Instalar SQL Server 2025

**Por qué la versión 2025.** El respaldo `AdventureWorks2025.bak` fue generado por SQL Server 2025. SQL Server puede restaurar respaldos de versiones anteriores, pero nunca de versiones más nuevas. Si se instala SQL Server 2022 e intenta restaurar este respaldo, falla con el error 3169, que indica que el respaldo pertenece a una versión más nueva del motor. Por eso se instala directamente la versión 2025.

**Paso 1. Registrar la llave de Microsoft.** Ubuntu solo instala paquetes de repositorios en los que confía. Esta llave permite verificar que los paquetes de SQL Server realmente vienen de Microsoft:

```bash
curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | sudo tee /etc/apt/trusted.gpg.d/microsoft.asc
```

**Paso 2. Agregar el repositorio de SQL Server 2025 para Ubuntu 22.04:**

```bash
curl -fsSL https://packages.microsoft.com/config/ubuntu/22.04/mssql-server-2025.list | sudo tee /etc/apt/sources.list.d/mssql-server-2025.list
```

El comando debe mostrar esta línea, que es el contenido del archivo creado:

```text
deb [arch=amd64,arm64,armhf] https://packages.microsoft.com/ubuntu/22.04/mssql-server-2025 jammy main
```

**Paso 3. Instalar el motor:**

```bash
sudo apt-get update
sudo apt-get install -y mssql-server
```

Esto instala los archivos del motor en `/opt/mssql`, pero SQL Server todavía no está configurado ni tiene contraseña de administrador.

**Paso 4. Configurar la instancia con `mssql-conf`.** `mssql-conf` es la herramienta de configuración de SQL Server en Linux. El subcomando `setup` hace la configuración inicial:

```bash
sudo /opt/mssql/bin/mssql-conf setup
```

El asistente hace varias preguntas, en inglés:

1. **`Choose an edition of SQL Server`**: escribir `2` para **Enterprise Developer**, que es gratuita y tiene todas las funciones, pero no se puede usar en producción. Es la adecuada para un proyecto académico.
2. **`Do you accept the license terms? [Yes/No]`**: escribir `Yes`.
3. **`Choose the language for SQL Server`**: esta pregunta aparece cuando el sistema está configurado en un idioma distinto del inglés. Se recomienda `1` (English), para que los mensajes de error coincidan con los de esta documentación.
4. **`Enter the SQL Server system administrator password`**: escribir `<CLAVE_SA>`. No se ve nada mientras se escribe; es normal.
5. **`Confirm the SQL Server system administrator password`**: repetir la misma contraseña.

Al terminar debe aparecer:

```text
Setup has completed successfully. SQL Server is now starting.
```

**Paso 5. Verificar que el servicio está activo:**

```bash
systemctl status mssql-server --no-pager
```

Debe decir `Active: active (running)`. El servicio queda habilitado (`enabled`), es decir, arranca solo cada vez que se enciende el equipo.

Verificar que SQL Server escucha en el puerto 1433:

```bash
ss -lntp | grep 1433
```

Salida esperada:

```text
LISTEN 0      128          0.0.0.0:1433       0.0.0.0:*
LISTEN 0      128                *:1433             *:*
```

### 4.3 Instalar las herramientas de línea de comandos (sqlcmd)

`sqlcmd` es el cliente de consola de SQL Server. Se usa para restaurar la base y ejecutar los scripts del proyecto. Viene en el paquete `mssql-tools18`, que está en otro repositorio de Microsoft (el repositorio general `prod`):

```bash
curl -fsSL https://packages.microsoft.com/config/ubuntu/22.04/prod.list | sudo tee /etc/apt/sources.list.d/mssql-release.list
sudo apt-get update
sudo ACCEPT_EULA=Y apt-get install -y mssql-tools18 unixodbc-dev
```

`ACCEPT_EULA=Y` acepta de antemano la licencia del driver ODBC, que de otro modo se pregunta en una pantalla interactiva.

Las herramientas se instalan en `/opt/mssql-tools18/bin`, que no está en el `PATH` (la lista de carpetas donde la terminal busca comandos). Para poder escribir solo `sqlcmd`, agregar esa carpeta al `PATH` de forma permanente:

```bash
echo 'export PATH="$PATH:/opt/mssql-tools18/bin"' >> ~/.bashrc
source ~/.bashrc
```

Verificar:

```bash
sqlcmd -? | head -3
```

Salida esperada:

```text
Microsoft (R) SQL Server Command Line Tool
Version 18.6.0002.1 Linux
Copyright (C) 2017 Microsoft Corporation. All rights reserved.
```

**Opciones de `sqlcmd` usadas en esta guía:**

| Opción | Significado |
|---|---|
| `-S localhost` | Servidor al que se conecta |
| `-U sa` | Usuario de SQL Server |
| `-P '<clave>'` | Contraseña. Si se omite, `sqlcmd` la pide sin mostrarla en pantalla |
| `-C` | Confía en el certificado del servidor (ver nota abajo) |
| `-d <base>` | Base de datos en la que se trabaja |
| `-Q "<consulta>"` | Ejecuta una consulta y termina |
| `-i "<archivo>"` | Ejecuta un archivo `.sql` |
| `-v Nombre="valor"` | Define una variable que el script usa como `$(Nombre)` |
| `-b` | Detiene la ejecución si ocurre un error |
| `-W` | Quita los espacios sobrantes de las columnas de salida |

**Por qué siempre se usa `-C`.** La versión 18 de `sqlcmd` cifra la conexión por defecto y exige que el certificado del servidor sea de confianza. SQL Server en Linux se instala con un certificado autofirmado, así que sin `-C` la conexión se rechaza. En un entorno local esto es aceptable; en producción se instalaría un certificado emitido por una autoridad reconocida y no se usaría `-C`.

**Nota de seguridad.** Escribir la contraseña con `-P` deja una copia en el historial de la terminal. Si se prefiere evitarlo, se puede quitar `-P '<clave>'` de cualquier comando y `sqlcmd` la pedirá de forma oculta.

### 4.4 Verificar la conexión a SQL Server

```bash
sqlcmd -S localhost -U sa -P '<CLAVE_SA>' -C -Q "SELECT @@VERSION;"
```

Salida obtenida en este proyecto:

```text
Microsoft SQL Server 2025 (RTM-CU8-GDR) (KB5122769) - 17.0.4085.5 (X64)
	Aug 26 2026 17:29:26
	Copyright (C) 2025 Microsoft Corporation
	Enterprise Developer Edition (64-bit) on Linux (Ubuntu 22.04.5 LTS) <X64>
```

Si aparece `Login failed for user 'sa'`, la contraseña escrita no coincide con la que se definió en el paso 4.2.

### 4.5 Restaurar la base de datos AdventureWorks2025

Se usa la versión **OLTP** de AdventureWorks (el archivo `AdventureWorks2025.bak`), que es la base transaccional con los esquemas `HumanResources`, `Person`, `Production`, `Purchasing` y `Sales`. No se usan las variantes `LT` (demasiado reducida) ni `DW` (almacén de datos).

**Paso 1. Descargar el respaldo en la carpeta de SQL Server.**

SQL Server corre con un usuario del sistema llamado `mssql`, que no tiene permiso para leer la carpeta personal de otros usuarios (por ejemplo `~/Downloads`). Por eso el respaldo se descarga directamente en una carpeta de SQL Server y se le asigna ese usuario como dueño:

```bash
sudo mkdir -p /var/opt/mssql/backup
sudo curl -L -o /var/opt/mssql/backup/AdventureWorks2025.bak https://github.com/Microsoft/sql-server-samples/releases/download/adventureworks/AdventureWorks2025.bak
sudo chown mssql:mssql /var/opt/mssql/backup/AdventureWorks2025.bak
sudo chmod 640 /var/opt/mssql/backup/AdventureWorks2025.bak
```

- `chown mssql:mssql` hace que el usuario `mssql` sea el dueño del archivo.
- `chmod 640` permite que el dueño lo lea y escriba, y que nadie más lo modifique.

El archivo pesa 50 229 248 bytes (unos 48 MB). Para confirmar la descarga:

```bash
sudo ls -l /var/opt/mssql/backup/
```

**Paso 2. Ver los nombres lógicos de los archivos del respaldo.**

Un respaldo guarda, además de los datos, los nombres y las rutas de los archivos físicos de la base. Hay que conocerlos para poder restaurar:

```bash
sqlcmd -S localhost -U sa -P '<CLAVE_SA>' -C -W -Q "RESTORE FILELISTONLY FROM DISK = '/var/opt/mssql/backup/AdventureWorks2025.bak';"
```

La salida tiene muchas columnas; interesan las dos primeras. Este es un extracto de esas dos columnas:

```text
LogicalName         PhysicalName
AdventureWorks      C:\Program Files\Microsoft SQL Server\MSSQL17.MSSQLSERVER\MSSQL\DATA\AdventureWorks2025.mdf
AdventureWorks_log  C:\Program Files\Microsoft SQL Server\MSSQL17.MSSQLSERVER\MSSQL\DATA\AdventureWorks2025_log.ldf
```

Las rutas físicas originales son de Windows (`C:\...`) y no existen en Linux. Por eso, al restaurar, hay que indicar con `MOVE` dónde crear cada archivo.

**Paso 3. Restaurar la base:**

```bash
sqlcmd -S localhost -U sa -P '<CLAVE_SA>' -C -Q "
RESTORE DATABASE AdventureWorks2025
FROM DISK = '/var/opt/mssql/backup/AdventureWorks2025.bak'
WITH
  MOVE 'AdventureWorks'     TO '/var/opt/mssql/data/AdventureWorks2025.mdf',
  MOVE 'AdventureWorks_log' TO '/var/opt/mssql/data/AdventureWorks2025_log.ldf',
  STATS = 10;"
```

- `MOVE 'AdventureWorks' TO ...` crea el archivo de datos (`.mdf`) en la carpeta de datos de SQL Server en Linux.
- `MOVE 'AdventureWorks_log' TO ...` crea el archivo de registro de transacciones (`.ldf`).
- `STATS = 10` muestra el avance cada 10 %.

Salida obtenida:

```text
10 percent processed.
20 percent processed.
...
100 percent processed.
Processed 25512 pages for database 'AdventureWorks2025', file 'AdventureWorks' on file 1.
Processed 2 pages for database 'AdventureWorks2025', file 'AdventureWorks_log' on file 1.
RESTORE DATABASE successfully processed 25514 pages in 0.369 seconds (540.174 MB/sec).
```

**Paso 4. Verificar la restauración:**

```bash
sqlcmd -S localhost -U sa -P '<CLAVE_SA>' -C -W -Q "SELECT name, state_desc, recovery_model_desc FROM sys.databases WHERE name = 'AdventureWorks2025';"
sqlcmd -S localhost -U sa -P '<CLAVE_SA>' -C -W -d AdventureWorks2025 -Q "SELECT COUNT(*) AS Departamentos FROM HumanResources.Department;"
```

Salida obtenida:

```text
name state_desc recovery_model_desc
---- ---------- -------------------
AdventureWorks2025 ONLINE SIMPLE

(1 rows affected)
Departamentos
-------------
16

(1 rows affected)
```

La base debe estar `ONLINE` y la tabla de departamentos debe tener **16** registros.

### 4.6 Instalar Node.js 20

El paquete `nodejs` de los repositorios de Ubuntu 22.04 es una versión antigua. Se usa el repositorio de **NodeSource**, que publica las versiones LTS (de soporte extendido) oficiales:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh
sudo -E bash nodesource_setup.sh
sudo apt-get install -y nodejs
rm nodesource_setup.sh
```

El script `setup_20.x` agrega el repositorio de Node.js 20 y su llave; luego `apt-get` instala Node.js y npm.

Verificar:

```bash
node -v
npm -v
```

Salida obtenida:

```text
v20.20.2
10.8.2
```

### 4.7 Instalar Postman

Postman es la aplicación gráfica con la que se prueban los endpoints. Se instala como paquete snap:

```bash
sudo snap install postman
```

Salida esperada:

```text
postman (v11/stable) 11.71.7 from Postman, Inc. (postman-inc**) installed
```

Se abre desde el menú de aplicaciones o con el comando `postman &`. Al abrirlo por primera vez puede pedir iniciar sesión; se puede crear una cuenta gratuita.

### 4.8 Clonar el repositorio

```bash
cd ~
git clone https://github.com/KeynerCM/Tarea_1_bases2.git
cd Tarea_1_bases2
```

**Todos los comandos de las secciones siguientes se ejecutan desde la carpeta `Tarea_1_bases2`**, salvo que se indique otra.

---

## 5. Configuración

### 5.1 Ejecutar los scripts SQL

Los scripts están en la carpeta `Script sql/`, numerados en el orden en que deben ejecutarse:

| Orden | Archivo | Qué hace |
|---|---|---|
| 1 | `01_schema_api.sql` | Crea el esquema `api` |
| 2 | `02_login_api_user.sql` | Crea el login y el usuario `api_user` y le asigna los permisos |
| 3 | `03_sp_department_select_all.sql` | Crea el SP de consulta de la tabla con paginación |
| 4 | `04_sp_department_select_by_id.sql` | Crea el SP de consulta por identificador |
| 5 | `05_sp_department_insert.sql` | Crea el SP de inserción |
| 6 | `06_sp_department_update.sql` | Crea el SP de actualización |
| 7 | `07_sp_department_delete.sql` | Crea el SP de borrado |
| 8 | `08_sp_employees_by_department.sql` | Crea el SP de la consulta con JOIN |

**Cómo se entrega la contraseña de `api_user`.** El script `02_login_api_user.sql` crea el login con esta línea:

```sql
CREATE LOGIN api_user
    WITH PASSWORD = '$(ApiUserPassword)',
```

`$(ApiUserPassword)` es una **variable de sqlcmd**: antes de enviar el script a SQL Server, `sqlcmd` reemplaza ese texto por el valor que se le pasa con la opción `-v`. De esta forma la contraseña real nunca queda escrita en un archivo del repositorio. Si se ejecuta el script sin `-v ApiUserPassword=...`, `sqlcmd` se detiene sin crear el login y muestra:

```text
'ApiUserPassword' scripting variable not defined.
```

**Opción A: ejecutar los ocho scripts de una vez** (recomendada):

```bash
for f in "Script sql"/0[1-8]_*.sql; do
  echo "=== $f"
  sqlcmd -S localhost -U sa -P '<CLAVE_SA>' -C -b -v ApiUserPassword='<CLAVE_API_USER>' -i "$f" || break
done
```

- El ciclo recorre los archivos `01` a `08` en orden.
- La variable `ApiUserPassword` se pasa a todos los scripts, aunque solo la usa el `02`.
- `-b` junto con `|| break` detiene el ciclo en el primer error.
- La carpeta `Script sql` tiene un espacio en el nombre, por eso siempre va entre comillas.

**Opción B: ejecutar los scripts uno por uno:**

```bash
sqlcmd -S localhost -U sa -P '<CLAVE_SA>' -C -i "Script sql/01_schema_api.sql"
sqlcmd -S localhost -U sa -P '<CLAVE_SA>' -C -v ApiUserPassword='<CLAVE_API_USER>' -i "Script sql/02_login_api_user.sql"
sqlcmd -S localhost -U sa -P '<CLAVE_SA>' -C -i "Script sql/03_sp_department_select_all.sql"
sqlcmd -S localhost -U sa -P '<CLAVE_SA>' -C -i "Script sql/04_sp_department_select_by_id.sql"
sqlcmd -S localhost -U sa -P '<CLAVE_SA>' -C -i "Script sql/05_sp_department_insert.sql"
sqlcmd -S localhost -U sa -P '<CLAVE_SA>' -C -i "Script sql/06_sp_department_update.sql"
sqlcmd -S localhost -U sa -P '<CLAVE_SA>' -C -i "Script sql/07_sp_department_delete.sql"
sqlcmd -S localhost -U sa -P '<CLAVE_SA>' -C -i "Script sql/08_sp_employees_by_department.sql"
```

Los scripts se ejecutan como `sa` porque crear esquemas, logins y procedimientos requiere permisos de administrador. La API, en cambio, nunca usa `sa`.

Salida esperada (resumida):

```text
=== Script sql/01_schema_api.sql
Esquema [api] creado correctamente.
=== Script sql/02_login_api_user.sql
Login [api_user] creado correctamente.
Usuario [api_user] creado en AdventureWorks2025.
Permiso EXECUTE sobre el esquema [api] otorgado a [api_user].
Acceso directo a las tablas denegado explicitamente para [api_user].
=== Script sql/03_sp_department_select_all.sql
Stored Procedure [api].[usp_Department_SelectAll] creado correctamente.
...
=== Script sql/08_sp_employees_by_department.sql
Stored Procedure [api].[usp_EmployeesByDepartment_Select] creado correctamente.
```

**Los scripts se pueden ejecutar más de una vez.** Usan `CREATE OR ALTER PROCEDURE` e `IF NOT EXISTS`, así que volver a ejecutarlos actualiza los procedimientos sin dar error. Una consecuencia: si el login `api_user` ya existe, el script `02` no le cambia la contraseña. Para cambiarla se ejecuta, como `sa`, la sentencia `ALTER LOGIN api_user WITH PASSWORD = '<CLAVE_API_USER>';`.

**Verificar los permisos de `api_user`.** Este paso comprueba el principio de mínimo privilegio. Primero, `api_user` sí puede ejecutar un Stored Procedure:

```bash
sqlcmd -S localhost -U api_user -P '<CLAVE_API_USER>' -C -W -d AdventureWorks2025 -Q "EXEC api.usp_Department_SelectById @DepartmentID = 1;"
```

```text
DepartmentID Name GroupName ModifiedDate
------------ ---- --------- ------------
1 Engineering Research and Development 2008-04-30 00:00:00.000
```

Segundo, `api_user` **no** puede leer la tabla directamente:

```bash
sqlcmd -S localhost -U api_user -P '<CLAVE_API_USER>' -C -d AdventureWorks2025 -Q "SELECT TOP 1 * FROM HumanResources.Department;"
```

```text
Msg 229, Level 14, State 5, Server keynercm, Line 1
The SELECT permission was denied on the object 'Department', database 'AdventureWorks2025', schema 'HumanResources'.
```

Ese error es el resultado correcto. Si el `SELECT` directo funcionara, los permisos estarían mal configurados.

### 5.2 Variables de entorno

La API lee su configuración de un archivo `.env` dentro de la carpeta `codigo/`. Ese archivo contiene la contraseña de `api_user`, por eso **no se sube al repositorio** (está en `.gitignore`). En su lugar se incluye la plantilla `codigo/.env.example`, sin contraseña.

Crear el `.env` a partir de la plantilla y editarlo:

```bash
cd codigo
cp .env.example .env
nano .env
```

En `nano`, completar `DB_PASSWORD` con `<CLAVE_API_USER>`, guardar con `Ctrl+O` y `Enter`, y salir con `Ctrl+X`.

Contenido del archivo:

```ini
# Servidor de la API
PORT=3000
NODE_ENV=development

# Conexion a SQL Server
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=AdventureWorks2025
DB_USER=api_user
DB_PASSWORD=<CLAVE_API_USER>

# Cifrado de la conexion.
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true
```

| Variable | Significado |
|---|---|
| `PORT` | Puerto en el que escucha la API |
| `NODE_ENV` | Entorno de ejecución. Es informativa: la API funciona igual con cualquier valor |
| `DB_SERVER` | Servidor de SQL Server. `localhost` porque corre en el mismo equipo |
| `DB_PORT` | Puerto de SQL Server |
| `DB_NAME` | Base de datos a la que se conecta la API |
| `DB_USER` | Usuario de base de datos. Debe ser `api_user`, nunca `sa` |
| `DB_PASSWORD` | Contraseña de `api_user` definida en el paso 5.1 |
| `DB_ENCRYPT` | `true` cifra la comunicación entre la API y SQL Server |
| `DB_TRUST_SERVER_CERTIFICATE` | `true` acepta el certificado autofirmado de SQL Server |

**Sobre `DB_TRUST_SERVER_CERTIFICATE=true`.** Tiene el mismo propósito que la opción `-C` de `sqlcmd`: SQL Server en Linux usa un certificado autofirmado y el driver no lo acepta si no se le indica. En desarrollo local es seguro porque la API y la base están en el mismo equipo. **En producción debe ser `false`** y el servidor debe tener un certificado emitido por una autoridad reconocida; de lo contrario, un atacante en la red podría hacerse pasar por el servidor.

### 5.3 Instalar las dependencias de Node.js

Desde la carpeta `codigo/`:

```bash
npm install
```

npm lee `package.json` y `package-lock.json` e instala las mismas versiones que se usaron en el proyecto dentro de la carpeta `codigo/node_modules/`:

| Paquete | Versión | Para qué se usa |
|---|---|---|
| `express` | 5.2.1 | Recibir las peticiones HTTP y definir las rutas |
| `mssql` | 12.7.2 | Conectarse a SQL Server y ejecutar los Stored Procedures |
| `dotenv` | 17.4.2 | Cargar las variables del archivo `.env` |

`node_modules/` tampoco se sube al repositorio; se regenera siempre con `npm install`.

---

## 6. Estructura del repositorio

El repositorio respeta las tres carpetas de la plantilla del curso.

```text
Tarea_1_bases2/
├── README.md                          Esta documentación
├── .gitignore                         Excluye .env, node_modules/ y respaldos .bak
│
├── Script sql/                        Scripts de base de datos, en orden de ejecución
│   ├── readme.md
│   ├── 01_schema_api.sql
│   ├── 02_login_api_user.sql
│   ├── 03_sp_department_select_all.sql
│   ├── 04_sp_department_select_by_id.sql
│   ├── 05_sp_department_insert.sql
│   ├── 06_sp_department_update.sql
│   ├── 07_sp_department_delete.sql
│   └── 08_sp_employees_by_department.sql
│
├── codigo/                            Proyecto Node.js de la API
│   ├── Readme.md
│   ├── package.json                   Dependencias y script de arranque
│   ├── package-lock.json              Versiones exactas de las dependencias
│   ├── .env.example                   Plantilla de configuración, sin contraseñas
│   ├── src/
│   │   ├── server.js                  Arranca Express y cierra el pool al detenerse
│   │   ├── routes.js                  Endpoints, validaciones y manejo de errores
│   │   └── db.js                      Pool único de conexiones a SQL Server
│   └── docs/
│       └── coleccion_postman.json     Colección de pruebas para importar en Postman
│
└── proyectos/                         Proyecto empaquetado en ZIP
    └── README.MD
```

**Regla del proyecto:** la palabra `SELECT` solo aparece dentro de `Script sql/`. En `codigo/` no hay SQL; solo se invocan Stored Procedures por su nombre.

---

## 7. Stored Procedures

Todos están en el esquema `api` de `AdventureWorks2025` y siguen las mismas convenciones:

- `SET NOCOUNT ON` al inicio, para no enviar mensajes de "filas afectadas" innecesarios.
- Bloque `BEGIN TRY ... BEGIN CATCH` que relanza el error con `THROW`, para que la API lo reciba y lo traduzca a un código HTTP.
- Encabezado de comentario con propósito, autor, fecha, parámetros y un ejemplo de ejecución.
- `CREATE OR ALTER`, para poder ejecutar los scripts más de una vez.

### Resumen

| Stored Procedure | Operación | Parámetros de entrada | Resultado |
|---|---|---|---|
| `api.usp_Department_SelectAll` | Consulta de tabla | `@Offset INT = 0`, `@Limit INT = 50`, `@Search NVARCHAR(50) = NULL` | Departamentos de la página pedida, con la columna `TotalRegistros` |
| `api.usp_Department_SelectById` | Selección | `@DepartmentID SMALLINT` | 0 o 1 departamento |
| `api.usp_Department_Insert` | Inserción | `@Name NVARCHAR(50)`, `@GroupName NVARCHAR(50)` | Parámetro de salida `@NewDepartmentID SMALLINT OUTPUT` |
| `api.usp_Department_Update` | Actualización | `@DepartmentID SMALLINT`, `@Name NVARCHAR(50)`, `@GroupName NVARCHAR(50)` | Columna `FilasAfectadas` (0 o 1) |
| `api.usp_Department_Delete` | Borrado | `@DepartmentID SMALLINT` | Columna `FilasAfectadas` (0 o 1) |
| `api.usp_EmployeesByDepartment_Select` | Consulta con JOIN | `@DepartmentID SMALLINT = NULL`, `@SoloActivos BIT = 1` | Empleados con departamento, nombre completo, cargo, turno y fechas |

### Detalle

**`api.usp_Department_SelectAll`**: devuelve los departamentos ordenados por identificador, usando `OFFSET ... FETCH NEXT` para paginar. `@Search` filtra por coincidencia parcial en el nombre o en el grupo (`LIKE '%texto%'`). Los parámetros inválidos se corrigen: un `@Offset` negativo pasa a 0 y un `@Limit` menor o igual a 0 pasa a 50; además, `@Limit` tiene un tope de 200 filas.

**`api.usp_Department_SelectById`**: si el identificador no existe devuelve un conjunto vacío, sin error. La API interpreta ese conjunto vacío como `404`.

**`api.usp_Department_Insert`**: inserta el departamento con `ModifiedDate = GETDATE()` y devuelve el identificador generado con `SCOPE_IDENTITY()` en el parámetro de salida.

**`api.usp_Department_Update`**: actualiza el nombre, el grupo y la fecha de modificación, y devuelve cuántas filas cambió. `FilasAfectadas = 0` significa que el departamento no existe; la API responde `404`.

**`api.usp_Department_Delete`**: borra el departamento y devuelve cuántas filas eliminó. Los departamentos que tienen empleados en `HumanResources.EmployeeDepartmentHistory` no se pueden borrar, porque la llave foránea `FK_EmployeeDepartmentHistory_Department_DepartmentID` lo impide (error 547 de SQL Server). El SP captura ese error y lanza uno propio con un mensaje legible.

**`api.usp_EmployeesByDepartment_Select`**: une cinco tablas de dos esquemas:

```text
HumanResources.Department                 (nombre del departamento)
  -> HumanResources.EmployeeDepartmentHistory   (fechas de ingreso y salida, turno)
       -> HumanResources.Employee              (cargo)
            -> Person.Person                   (nombre completo)
       -> HumanResources.Shift                 (nombre del turno)
```

Con `@SoloActivos = 1` muestra solo a los empleados que siguen en el departamento (`EndDate IS NULL`); con `@SoloActivos = 0` incluye también el historial. En toda la base hay 290 asignaciones activas y 296 en total. El cargo que se muestra es el **actual** del empleado, porque AdventureWorks no guarda los cargos anteriores.

### Errores propios

Los SP de escritura convierten dos errores de SQL Server en errores propios, con número y mensaje en español, que la API traduce a `409 Conflict`:

| Número | Lo lanza | Error original de SQL Server | Mensaje |
|---|---|---|---|
| 50409 | Insert y Update | 2601 o 2627: nombre repetido (índice único `AK_Department_Name`) | `Ya existe un departamento con ese nombre.` |
| 50547 | Delete | 547: conflicto con la llave foránea del historial | `No se puede eliminar el departamento porque tiene empleados registrados en su historial.` |

### Ejemplos de ejecución directa

```sql
USE AdventureWorks2025;

EXEC api.usp_Department_SelectAll @Offset = 0, @Limit = 5;
EXEC api.usp_Department_SelectAll @Search = N'Production';
EXEC api.usp_Department_SelectById @DepartmentID = 1;

DECLARE @Id SMALLINT;
EXEC api.usp_Department_Insert @Name = N'Prueba', @GroupName = N'Pruebas', @NewDepartmentID = @Id OUTPUT;
SELECT @Id AS NuevoId;

EXEC api.usp_Department_Update @DepartmentID = @Id, @Name = N'Prueba Modificada', @GroupName = N'Pruebas';
EXEC api.usp_Department_Delete @DepartmentID = @Id;

EXEC api.usp_EmployeesByDepartment_Select @DepartmentID = 8;
EXEC api.usp_EmployeesByDepartment_Select @DepartmentID = 1, @SoloActivos = 0;
```

---

## 8. Servicios web (endpoints)

URL base: `http://localhost:3000/api/v1`

### Contrato

| Método | Ruta | Stored Procedure | Respuesta correcta | Errores posibles |
|---|---|---|---|---|
| `GET` | `/health` | `usp_Department_SelectAll` (como prueba de conexión) | 200 | 503 |
| `GET` | `/departments` | `usp_Department_SelectAll` | 200 | 400 |
| `GET` | `/departments/:id` | `usp_Department_SelectById` | 200 | 400, 404 |
| `POST` | `/departments` | `usp_Department_Insert` | 201 y cabecera `Location` | 400, 409 |
| `PUT` | `/departments/:id` | `usp_Department_Update` | 200 | 400, 404, 409 |
| `DELETE` | `/departments/:id` | `usp_Department_Delete` | 204, sin cuerpo | 400, 404, 409 |
| `GET` | `/departments/:id/employees` | `usp_EmployeesByDepartment_Select` | 200 | 400, 404 |

### Parámetros

| Endpoint | Parámetro | Dónde va | Reglas |
|---|---|---|---|
| `GET /departments` | `offset` | Query string | Entero mayor o igual a 0. Por defecto 0 |
| `GET /departments` | `limit` | Query string | Entero entre 1 y 200. Por defecto 50 |
| `GET /departments` | `search` | Query string | Texto de hasta 50 caracteres. Opcional |
| Rutas con `:id` | `id` | Ruta | Entero entre 1 y 32767 (rango del tipo `SMALLINT`) |
| `POST` y `PUT` | `Name` | Cuerpo JSON | Obligatorio, hasta 50 caracteres, sin contar espacios al inicio y al final |
| `POST` y `PUT` | `GroupName` | Cuerpo JSON | Obligatorio, hasta 50 caracteres |
| `GET /departments/:id/employees` | `activos` | Query string | `true` o `false` (también `1` o `0`). Por defecto `true` |

`POST` y `PUT` necesitan la cabecera `Content-Type: application/json`.

### Formato de respuesta

Todas las respuestas, correctas o con error, tienen la misma forma:

```json
{
  "success": true,
  "data": {},
  "meta": null,
  "error": null
}
```

| Campo | Contenido |
|---|---|
| `success` | `true` si la operación salió bien, `false` si hubo un error |
| `data` | El resultado: un objeto, un arreglo o `null` cuando hay error |
| `meta` | Información adicional, como el total de registros y la paginación. `null` si no aplica |
| `error` | Mensaje en español que explica el error. `null` si no hubo error |

La única excepción es `DELETE` exitoso, que responde `204 No Content` sin cuerpo.

### Códigos HTTP

| Código | Cuándo se devuelve |
|---|---|
| 200 OK | Consulta o actualización correcta |
| 201 Created | Departamento creado. La cabecera `Location` indica su URL |
| 204 No Content | Departamento borrado |
| 400 Bad Request | Datos inválidos: `id` no numérico, nombre vacío o demasiado largo, JSON mal formado, parámetros de paginación fuera de rango |
| 404 Not Found | El departamento no existe, o la ruta no existe |
| 409 Conflict | Nombre repetido, o departamento con historial de empleados que no se puede borrar |
| 500 Internal Server Error | Error no previsto. El detalle se registra en la consola de la API, no se envía al cliente |
| 503 Service Unavailable | SQL Server no está disponible |

### Ejemplos rápidos con curl

```bash
curl http://localhost:3000/api/v1/health
curl "http://localhost:3000/api/v1/departments?offset=0&limit=5"
curl "http://localhost:3000/api/v1/departments?search=Production"
curl http://localhost:3000/api/v1/departments/1
curl -X POST http://localhost:3000/api/v1/departments -H "Content-Type: application/json" -d '{"Name":"Prueba","GroupName":"Pruebas"}'
curl -X PUT http://localhost:3000/api/v1/departments/17 -H "Content-Type: application/json" -d '{"Name":"Prueba 2","GroupName":"Pruebas"}'
curl -X DELETE http://localhost:3000/api/v1/departments/17
curl "http://localhost:3000/api/v1/departments/8/employees"
curl "http://localhost:3000/api/v1/departments/1/employees?activos=false"
```

En los ejemplos de `PUT` y `DELETE`, reemplazar `17` por el identificador que devolvió el `POST`.

---

## 9. Ejecución del proyecto

### Iniciar la API

Con SQL Server activo y el `.env` configurado, desde la carpeta `codigo/`:

```bash
npm start
```

Salida esperada:

```text
> tarea1-api-adventureworks@1.0.0 start
> node src/server.js

API escuchando en http://localhost:3000/api/v1
Conectado a SQL Server, base AdventureWorks2025
```

La terminal queda ocupada mientras la API corre. Para las pruebas se usa Postman u otra terminal.

### Verificar que funciona

```bash
curl http://localhost:3000/api/v1/health
```

```json
{"success":true,"data":{"api":"activa","baseDatos":"conectada"},"meta":null,"error":null}
```

El endpoint `/health` no solo comprueba que la API responde: ejecuta un Stored Procedure real, así que también confirma que `api_user` puede conectarse y tiene el permiso `EXECUTE`.

Si SQL Server está detenido, el mismo endpoint responde `503`:

```json
{"success":false,"data":null,"meta":null,"error":"La base de datos no está disponible."}
```

Cuando SQL Server vuelve a estar activo, la API se reconecta sola, sin reiniciarla.

### Detener la API

Presionar `Ctrl+C` en la terminal donde corre. La API cierra el pool de conexiones antes de terminar:

```text
SIGINT recibido, cerrando la API...
```

---

## 10. Datos de prueba

Las pruebas se hacen con **Postman**, usando la colección incluida en el repositorio.

### Importar la colección

1. Iniciar la API (sección [9](#9-ejecución-del-proyecto)).
2. Abrir Postman.
3. Presionar **Import**, elegir **files** y seleccionar `codigo/docs/coleccion_postman.json`.
4. Aparece la colección **Tarea 1 - API Departamentos (AdventureWorks2025)**, con ocho carpetas numeradas.
5. Ejecutar las peticiones **en orden**, de la carpeta 0 a la 7.

La colección usa dos variables:

| Variable | Valor | Uso |
|---|---|---|
| `baseUrl` | `http://localhost:3000/api/v1` | URL base de todas las peticiones |
| `departmentId` | Se llena sola | La petición de creación (escenario 2) guarda aquí el identificador generado, y los escenarios 3 y 4 lo reutilizan |

Por eso el orden importa: si se ejecuta el escenario 3 sin haber ejecutado antes el 2, `departmentId` está vacío.

También se puede ejecutar la colección completa de una vez: en el menú de la colección (los tres puntos junto a su nombre) elegir **Run collection** y luego **Run**. Son 19 peticiones y todas deben responder con el código esperado.

Las respuestas de esta sección son las que devolvió la API durante las pruebas. El identificador del departamento creado (`28` en estos ejemplos) y las fechas de modificación cambian en cada ejecución, porque SQL Server asigna un número nuevo a cada inserción.

### Escenario 0: estado del servicio

`GET {{baseUrl}}/health` responde `200 OK`:

```json
{
  "success": true,
  "data": {
    "api": "activa",
    "baseDatos": "conectada"
  },
  "meta": null,
  "error": null
}
```

### Escenario 1: estado inicial

**Lista completa.** `GET {{baseUrl}}/departments?offset=0&limit=50` devuelve los 16 departamentos originales de AdventureWorks, con `meta.total = 16`.

**Paginación.** `GET {{baseUrl}}/departments?offset=5&limit=3` salta los primeros 5 y devuelve los 3 siguientes. `meta.total` sigue siendo 16, porque cuenta todos los registros, no solo los de la página:

```json
{
  "success": true,
  "data": [
    {
      "DepartmentID": 6,
      "Name": "Research and Development",
      "GroupName": "Research and Development",
      "ModifiedDate": "2008-04-30T06:00:00.000Z"
    },
    {
      "DepartmentID": 7,
      "Name": "Production",
      "GroupName": "Manufacturing",
      "ModifiedDate": "2008-04-30T06:00:00.000Z"
    },
    {
      "DepartmentID": 8,
      "Name": "Production Control",
      "GroupName": "Manufacturing",
      "ModifiedDate": "2008-04-30T06:00:00.000Z"
    }
  ],
  "meta": {
    "total": 16,
    "offset": 5,
    "limit": 3
  },
  "error": null
}
```

**Filtro por nombre.** `GET {{baseUrl}}/departments?search=Production` devuelve los dos departamentos cuyo nombre contiene "Production":

```json
{
  "success": true,
  "data": [
    {
      "DepartmentID": 7,
      "Name": "Production",
      "GroupName": "Manufacturing",
      "ModifiedDate": "2008-04-30T06:00:00.000Z"
    },
    {
      "DepartmentID": 8,
      "Name": "Production Control",
      "GroupName": "Manufacturing",
      "ModifiedDate": "2008-04-30T06:00:00.000Z"
    }
  ],
  "meta": {
    "total": 2,
    "offset": 0,
    "limit": 50
  },
  "error": null
}
```

**Consulta por identificador.** `GET {{baseUrl}}/departments/1` responde `200 OK`:

```json
{
  "success": true,
  "data": {
    "DepartmentID": 1,
    "Name": "Engineering",
    "GroupName": "Research and Development",
    "ModifiedDate": "2008-04-30T06:00:00.000Z"
  },
  "meta": null,
  "error": null
}
```

### Escenario 2: crear un departamento (INSERT)

`POST {{baseUrl}}/departments` con el cuerpo:

```json
{
  "Name": "Investigación y Desarrollo TEC",
  "GroupName": "Research and Development"
}
```

Responde `201 Created`, con la cabecera `Location: /api/v1/departments/28`, que indica dónde consultar el registro nuevo:

```json
{
  "success": true,
  "data": {
    "DepartmentID": 28,
    "Name": "Investigación y Desarrollo TEC",
    "GroupName": "Research and Development",
    "ModifiedDate": "2026-09-18T03:45:05.850Z"
  },
  "meta": null,
  "error": null
}
```

La consulta `GET {{baseUrl}}/departments/{{departmentId}}` confirma que quedó guardado: responde `200 OK` con el mismo registro.

### Escenario 3: actualizar el departamento (UPDATE)

`PUT {{baseUrl}}/departments/{{departmentId}}` con el cuerpo:

```json
{
  "Name": "I+D TEC Cartago",
  "GroupName": "Research and Development"
}
```

Responde `200 OK` con el registro ya actualizado. Cambian el nombre y la fecha de modificación:

| Campo | Antes | Después |
|---|---|---|
| `Name` | `Investigación y Desarrollo TEC` | `I+D TEC Cartago` |
| `ModifiedDate` | `2026-09-18T03:45:05.850Z` | `2026-09-18T03:45:05.957Z` |

```json
{
  "success": true,
  "data": {
    "DepartmentID": 28,
    "Name": "I+D TEC Cartago",
    "GroupName": "Research and Development",
    "ModifiedDate": "2026-09-18T03:45:05.957Z"
  },
  "meta": null,
  "error": null
}
```

### Escenario 4: borrar el departamento (DELETE exitoso)

`DELETE {{baseUrl}}/departments/{{departmentId}}` responde `204 No Content`, sin cuerpo. Se puede borrar porque es un departamento nuevo, sin empleados en su historial.

Al consultarlo de nuevo, `GET {{baseUrl}}/departments/{{departmentId}}` responde `404 Not Found`:

```json
{
  "success": false,
  "data": null,
  "meta": null,
  "error": "No existe un departamento con id 28."
}
```

### Escenario 5: borrado rechazado por llave foránea

`DELETE {{baseUrl}}/departments/1` intenta borrar **Engineering**, que tiene empleados registrados en `HumanResources.EmployeeDepartmentHistory`. SQL Server rechaza el borrado por la llave foránea, el Stored Procedure convierte el error en uno legible y la API responde `409 Conflict`, no un `500`:

```json
{
  "success": false,
  "data": null,
  "meta": null,
  "error": "No se puede eliminar el departamento porque tiene empleados registrados en su historial."
}
```

El departamento no se modifica: `GET {{baseUrl}}/departments/1` lo sigue devolviendo.

### Escenario 6: consulta con JOIN

**Empleados activos.** `GET {{baseUrl}}/departments/8/employees` devuelve los empleados que trabajan actualmente en **Production Control**, con datos de las tablas `Department`, `EmployeeDepartmentHistory`, `Employee`, `Shift` (esquema `HumanResources`) y `Person` (esquema `Person`):

```json
{
  "success": true,
  "data": [
    {
      "DepartmentID": 8,
      "Departamento": "Production Control",
      "BusinessEntityID": 225,
      "NombreCompleto": "Alan J Brewer",
      "Cargo": "Scheduling Assistant",
      "Turno": "Evening",
      "FechaIngresoDepartamento": "2009-02-13",
      "FechaSalidaDepartamento": null
    },
    {
      "DepartmentID": 8,
      "Departamento": "Production Control",
      "BusinessEntityID": 26,
      "NombreCompleto": "Peter J Krebs",
      "Cargo": "Production Control Manager",
      "Turno": "Day",
      "FechaIngresoDepartamento": "2008-12-01",
      "FechaSalidaDepartamento": null
    },
    {
      "DepartmentID": 8,
      "Departamento": "Production Control",
      "BusinessEntityID": 226,
      "NombreCompleto": "Brian P LaMee",
      "Cargo": "Scheduling Assistant",
      "Turno": "Night",
      "FechaIngresoDepartamento": "2009-03-03",
      "FechaSalidaDepartamento": null
    },
    {
      "DepartmentID": 8,
      "Departamento": "Production Control",
      "BusinessEntityID": 223,
      "NombreCompleto": "Sairaj L Uddin",
      "Cargo": "Scheduling Assistant",
      "Turno": "Day",
      "FechaIngresoDepartamento": "2009-01-26",
      "FechaSalidaDepartamento": null
    },
    {
      "DepartmentID": 8,
      "Departamento": "Production Control",
      "BusinessEntityID": 224,
      "NombreCompleto": "William S Vong",
      "Cargo": "Scheduling Assistant",
      "Turno": "Day",
      "FechaIngresoDepartamento": "2011-09-01",
      "FechaSalidaDepartamento": null
    },
    {
      "DepartmentID": 8,
      "Departamento": "Production Control",
      "BusinessEntityID": 222,
      "NombreCompleto": "A. Scott Wright",
      "Cargo": "Master Scheduler",
      "Turno": "Day",
      "FechaIngresoDepartamento": "2008-12-12",
      "FechaSalidaDepartamento": null
    }
  ],
  "meta": {
    "total": 6,
    "activos": true
  },
  "error": null
}
```

**Incluyendo historial.** `GET {{baseUrl}}/departments/1/employees?activos=false` devuelve para **Engineering** 7 registros en lugar de 6: aparece también Rob Walters, que trabajó en el departamento entre 2007 y 2010. Fragmento de la respuesta:

```json
{
  "DepartmentID": 1,
  "Departamento": "Engineering",
  "BusinessEntityID": 4,
  "NombreCompleto": "Rob Walters",
  "Cargo": "Senior Tool Designer",
  "Turno": "Day",
  "FechaIngresoDepartamento": "2007-12-05",
  "FechaSalidaDepartamento": "2010-05-30"
}
```

```json
"meta": {
  "total": 7,
  "activos": false
}
```

Un departamento que existe pero no tiene empleados (por ejemplo, uno recién creado) responde `200 OK` con `"data": []`, no `404`. El `404` se reserva para departamentos que no existen.

### Escenario 7: validaciones y errores

Ninguno de estos casos produce un `500`: la API detecta el problema y responde con un código y un mensaje que explican qué pasó.

| Caso | Petición | Código | Mensaje |
|---|---|---|---|
| Nombre vacío | `POST /departments` con `"Name": "   "` | 400 | `El campo Name es obligatorio.` |
| Nombre de 51 caracteres | `POST /departments` con `"Name": "AAAA...A"` | 400 | `El campo Name no puede superar los 50 caracteres.` |
| Nombre repetido | `POST /departments` con `"Name": "Engineering"` | 409 | `Ya existe un departamento con ese nombre.` |
| Identificador inexistente | `GET /departments/9999` | 404 | `No existe un departamento con id 9999.` |
| Identificador no numérico | `GET /departments/abc` | 400 | `El id debe ser un número entero entre 1 y 32767.` |
| Actualizar un inexistente | `PUT /departments/9999` | 404 | `No existe un departamento con id 9999.` |

Ejemplo de respuesta completa (identificador no numérico):

```json
{
  "success": false,
  "data": null,
  "meta": null,
  "error": "El id debe ser un número entero entre 1 y 32767."
}
```

Otros casos que la API también controla, aunque no están en la colección:

| Caso | Código | Mensaje |
|---|---|---|
| Cuerpo JSON mal formado | 400 | `El cuerpo de la petición no es un JSON válido.` |
| `limit=0` o `limit=500` | 400 | `limit debe ser un número entero entre 1 y 200.` |
| `offset=-1` | 400 | `offset debe ser un número entero mayor o igual a 0.` |
| `activos=quizas` | 400 | `activos debe ser true o false.` |
| Ruta que no existe | 404 | `Ruta no encontrada: GET /api/v1/...` |
| SQL Server detenido | 503 | `La base de datos no está disponible.` |

---

## 11. Referencias

Referencias del enunciado:

- Creating REST API for reading data from Microsoft SQL Server in web browser: https://tomaztsql.wordpress.com/2021/08/10/creating-rest-api-for-reading-data-from-microsoft-sql-server-in-web-browser/
- How to quickly create a simple REST API for SQL Server database: https://medium.com/voobans-tech-stories/how-to-quickly-create-a-simple-rest-api-for-sql-server-database-7ddb595f751a
- AdventureWorks sample databases: https://github.com/Microsoft/sql-server-samples/releases/tag/adventureworks

Documentación técnica:

- Instalación de SQL Server en Ubuntu: https://learn.microsoft.com/en-us/sql/linux/quickstart-install-connect-ubuntu
- Configuración con mssql-conf: https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-configure-mssql-conf
- Instalación de sqlcmd en Linux: https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-setup-tools
- Ownership chaining en SQL Server: https://learn.microsoft.com/en-us/dotnet/framework/data/adonet/sql/ownership-chaining-in-sql-server
- Paquete mssql para Node.js: https://www.npmjs.com/package/mssql
- Express: https://expressjs.com/
- Distribuciones de Node.js de NodeSource: https://github.com/nodesource/distributions

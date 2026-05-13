

# MS-Users — Sanos y Salvos

Microservicio de gestión de usuarios de la plataforma **Sanos y Salvos**. Gestiona el registro diferenciado de ciudadanos e instituciones, perfiles de usuario con foto en Cloudinary, validación de RUN/RUT chileno, consulta de regiones y comunas, y administración de cuentas con control de roles.

---

## Tecnologías

| Herramienta | Uso |
|---|---|
| Node.js 18+ | Entorno de ejecución |
| Express 4 | Servidor HTTP |
| TypeScript 5 | Tipado estático |
| PostgreSQL 16+ | Persistencia de usuarios, ciudadanos e instituciones |
| TypeORM 0.3 | ORM y sincronización de esquema |
| Multer | Recepción de archivos en memoria |
| Cloudinary | Almacenamiento y gestión de fotos de perfil |
| Axios | Comunicación HTTP con MS-Auth y API del gobierno de Chile |
| jsonwebtoken | Verificación de Access Tokens JWT |
| Swagger / OpenAPI 3.0 | Documentación interactiva de endpoints |

---

## Requisitos previos

- Node.js 18+
- PostgreSQL 16+
- **MS-Auth corriendo** en `http://localhost:3001` (requerido para registro y seed)
- Cuenta en [Cloudinary](https://cloudinary.com) (plan gratuito suficiente)

---

## Instalación

```bash
git clone <url-del-repositorio>
cd ms-users
npm install
```

---

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
PORT=3002

# PostgreSQL para desarrollo local (npm run dev)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password
DB_NAME=ms_users

# PostgreSQL para contenedor (docker compose)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=tu_password
POSTGRES_DB=ms_users

# JWT — debe ser el mismo secret que MS-Auth
JWT_SECRET=tu_secreto_super_seguro_minimo_64_caracteres

# Comunicación interna con MS-Auth
MS_AUTH_URL=http://localhost:3001
INTERNAL_API_KEY=clave_compartida_con_ms_auth

# Solo para Docker Compose (cuando ms-users corre en contenedor)
DOCKER_MS_AUTH_URL=http://host.docker.internal:3001

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Bootstrap del SuperAdmin (se ejecuta automáticamente al iniciar)
AUTO_SEED_SUPERADMIN=true
SEED_SUPERADMIN_RETRIES=30
SEED_SUPERADMIN_DELAY_MS=3000

SUPERADMIN_EMAIL=admin@sanos.cl
SUPERADMIN_PASSWORD=tu_password_seguro
SUPERADMIN_PRIMER_NOMBRE=Nombre
SUPERADMIN_SEGUNDO_NOMBRE=
SUPERADMIN_APELLIDO_PATERNO=Apellido
SUPERADMIN_APELLIDO_MATERNO=
SUPERADMIN_RUN=11.111.111-1
SUPERADMIN_TELEFONO=912345678
SUPERADMIN_REGION=08
SUPERADMIN_COMUNA=Concepción
SUPERADMIN_DIRECCION=Av. Principal 123

NODE_ENV=development
```

> `INTERNAL_API_KEY` debe ser idéntico al configurado en MS-Auth. Genera uno con: `openssl rand -hex 32`

---

## Base de datos

```bash
psql -U postgres
CREATE DATABASE ms_users;
\q
```

TypeORM con `synchronize: true` crea y actualiza las tablas automáticamente al iniciar.

---

## Dependencia con MS-Auth

MS-Users requiere que **MS-Auth esté corriendo** antes de iniciarse (el bootstrap del SuperAdmin realiza llamadas a MS-Auth):

```bash
# Terminal 1
cd ms-auth && npm run dev

# Terminal 2
cd ms-users && npm run dev
```

---

## Levantar el servidor

```bash
# Desarrollo (hot reload)
npm run dev

# Producción
npm run build
npm start
```

Salida esperada:
```
✅ Conexión a PostgreSQL establecida
⚠️  SuperAdmin ya existe, omitiendo...   ← si ya fue creado
✅ SuperAdmin creado exitosamente         ← primer inicio
🚀 MS-Users corriendo en http://localhost:3002
```

---

## Documentación Swagger

```
http://localhost:3002/api/docs
```

---

## Endpoints

### Registro (público)

| Método | Ruta | RF | Descripción |
|---|---|---|---|
| `POST` | `/api/users/register/ciudadano` | RF-05 | Registro de persona natural con RUN |
| `POST` | `/api/users/register/institucion` | RF-05 | Registro de veterinaria o municipalidad con RUT |

### Perfil (autenticado)

| Método | Ruta | RF | Descripción |
|---|---|---|---|
| `GET` | `/api/users/perfil` | RF-06 | Ver perfil propio |
| `PATCH` | `/api/users/perfil` | RF-08 | Actualizar perfil (incluye foto de perfil) |
| `DELETE` | `/api/users/perfil` | RF-10 | Desactivar cuenta propia (soft delete) |

### Ubicación (público)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/users/regiones` | Listado de regiones de Chile |
| `GET` | `/api/users/regiones/:codigoRegion/comunas` | Comunas de una región |

### Administración

| Método | Ruta | RF | Roles permitidos | Descripción |
|---|---|---|---|---|
| `GET` | `/api/users/admin/usuarios` | RF-07 | `administrador`, `superadmin`, `moderador` | Listar usuarios con filtros |
| `GET` | `/api/users/admin/usuarios/:id` | RF-07 | `administrador`, `superadmin`, `moderador` | Ver usuario por ID |
| `PATCH` | `/api/users/admin/usuarios/:id/estado` | RF-10 | `administrador`, `superadmin` | Activar o desactivar cuenta |
| `PATCH` | `/api/users/admin/usuarios/:id/rol` | RF-09 | `administrador`, `superadmin` | Cambiar rol de usuario |
| `PATCH` | `/api/users/admin/usuarios/:id/datos` | RF-08 | `administrador`, `superadmin` | Editar datos de usuario |

---

## Roles del sistema

| Rol | Descripción | Puede ver usuarios | Puede editar/desactivar |
|---|---|---|---|
| `ciudadano` | Persona natural registrada | No | — |
| `veterinaria` | Institución veterinaria | No | — |
| `municipalidad` | Municipalidad | No | — |
| `moderador` | Rol de solo lectura administrativo | Sí | No |
| `administrador` | Administración completa | Sí | Sí |
| `superadmin` | Acceso total, no puede ser desactivado desde su perfil | Sí (todos) | Sí (todos) |

---

## Validaciones en registro y edición

| Campo | Regla |
|---|---|
| `email` | Debe contener `@` |
| `password` | Mínimo 6 caracteres |
| `telefono` | Solo números, `+` opcional al inicio |
| `primer_nombre`, `apellido_paterno` | Solo letras (incluye tildes y ñ), mínimo 3 caracteres |
| `segundo_nombre`, `apellido_materno` | Mismo criterio si se proporcionan |
| `nombre_institucion`, `razon_social` | Solo letras, mínimo 3 caracteres |
| `run` (ciudadano) | Validado con algoritmo módulo 11 chileno; se normaliza a `12345678-9` |
| `rut` (institución) | Misma validación y normalización |

Las mismas validaciones aplican tanto al registrarse como al editar el perfil.

---

## Foto de perfil

- Se recibe como `multipart/form-data` con el campo `foto_perfil`
- Se sube directamente a Cloudinary desde memoria (sin escribir en disco)
- Al actualizar la foto, **la imagen anterior se elimina automáticamente de Cloudinary** antes de subir la nueva
- Solo la URL resultante (`secure_url`) se almacena en PostgreSQL

---

## Modelo de datos

### Tabla `users` (base común)

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | UUID | ✅ | Identificador único en MS-Users |
| `credential_id` | UUID | ✅ | ID de la credencial en MS-Auth |
| `email` | string único | ✅ | Correo del usuario |
| `telefono` | string | ✅ | Teléfono de contacto |
| `foto_perfil` | string (URL) | ❌ | URL de Cloudinary |
| `rol` | enum | ✅ | Ver tabla de roles |
| `tipo` | enum | ✅ | `ciudadano` o `institucion` |
| `region` | string | ✅ | Código de región (ej. `08`) |
| `comuna` | string | ✅ | Nombre de la comuna |
| `is_active` | boolean | ✅ | Estado de la cuenta |
| `created_at` | timestamptz | ✅ | Fecha de creación |
| `updated_at` | timestamptz | ✅ | Última actualización |

### Tabla `ciudadanos`

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | UUID | ✅ | Identificador |
| `user_id` | UUID (FK) | ✅ | Referencia a `users` |
| `primer_nombre` | string | ✅ | — |
| `segundo_nombre` | string | ❌ | — |
| `apellido_paterno` | string | ✅ | — |
| `apellido_materno` | string | ❌ | — |
| `run` | string único | ✅ | Formato normalizado `12345678-9` |
| `direccion` | string | ✅ | Dirección de residencia |

### Tabla `instituciones`

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | UUID | ✅ | Identificador |
| `user_id` | UUID (FK) | ✅ | Referencia a `users` |
| `nombre_institucion` | string | ✅ | Nombre comercial |
| `razon_social` | string | ✅ | Razón social legal |
| `rut` | string único | ✅ | Formato normalizado `76354771-K` |
| `tipo_institucion` | enum | ✅ | `veterinaria` o `municipalidad` |
| `direccion` | string | ✅ | Dirección física |

---

## Ejemplos de uso

### Registro ciudadano

```bash
POST /api/users/register/ciudadano
Content-Type: multipart/form-data

email=ciudadano@sanos.cl
password=123456
telefono=912345678
region=08
comuna=Concepción
direccion=Av. O'Higgins 123
primer_nombre=Felipe
apellido_paterno=Ruiz
run=11.111.111-1
foto_perfil=<archivo imagen (opcional)>
```

### Registro institución

```bash
POST /api/users/register/institucion
Content-Type: multipart/form-data

email=veterinaria@sanos.cl
password=123456
telefono=412345678
region=08
comuna=Concepción
direccion=Av. Los Carrera 456
nombre_institucion=Veterinaria San Jorge
razon_social=San Jorge Ltda.
rut=76.354.771-K
tipo_institucion=veterinaria
foto_perfil=<archivo imagen (opcional)>
```

### Ver perfil

```bash
GET /api/users/perfil
Authorization: Bearer eyJ...
```

### Actualizar perfil (con foto)

```bash
PATCH /api/users/perfil
Authorization: Bearer eyJ...
Content-Type: multipart/form-data

telefono=987654321
direccion=Nueva Calle 789
foto_perfil=<archivo imagen>
```

### Listar usuarios (admin)

```bash
GET /api/users/admin/usuarios?rol=ciudadano&is_active=true
Authorization: Bearer eyJ...
```

### Cambiar rol

```bash
PATCH /api/users/admin/usuarios/:id/rol
Authorization: Bearer eyJ...
Content-Type: application/json

{ "rol": "moderador" }
```

Roles válidos: `ciudadano`, `veterinaria`, `municipalidad`, `moderador`, `administrador`

### Cambiar estado

```bash
PATCH /api/users/admin/usuarios/:id/estado
Authorization: Bearer eyJ...
Content-Type: application/json

{ "is_active": false }
```

---

## Estructura del proyecto

```
ms-users/
├── src/
│   ├── bootstrap/
│   │   └── ensureSuperAdmin.ts     # Crea el superadmin automáticamente al iniciar
│   ├── config/
│   │   ├── cloudinary.ts           # Configuración Cloudinary
│   │   ├── db.ts                   # Conexión PostgreSQL + TypeORM
│   │   └── swagger.ts              # Configuración OpenAPI 3.0
│   ├── controllers/
│   │   └── user.controller.ts      # Handlers HTTP con validaciones
│   ├── factories/
│   │   └── UserFactory.ts          # Patrón Factory para crear ciudadanos/instituciones
│   ├── middlewares/
│   │   ├── errorHandler.ts         # Manejo global de errores
│   │   ├── notFound.ts             # Ruta no encontrada
│   │   ├── requireRole.ts          # Control de acceso por rol
│   │   └── verifyToken.ts          # Verificación JWT
│   ├── models/
│   │   ├── Ciudadano.ts            # Entidad ciudadanos
│   │   ├── Institucion.ts          # Entidad instituciones
│   │   └── User.ts                 # Entidad base de usuarios
│   ├── routes/
│   │   └── user.routes.ts          # Rutas + documentación Swagger inline
│   ├── services/
│   │   ├── auth.service.ts         # Cliente HTTP hacia MS-Auth (interno)
│   │   └── user.service.ts         # Lógica de negocio
│   ├── utils/
│   │   ├── regionComuna.ts         # Consulta a API del gobierno de Chile
│   │   ├── response.ts             # Helpers de respuesta HTTP estandarizada
│   │   ├── validarDigitoVerificador.ts  # Algoritmo módulo 11 para RUN/RUT
│   │   └── validators.ts           # Validaciones de campos (nombre, teléfono, RUN)
│   ├── app.ts                      # Configuración Express y middlewares
│   └── server.ts                   # Punto de entrada, conexión BD y bootstrap
├── .env
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor en modo desarrollo con hot reload |
| `npm run build` | Compila TypeScript a JavaScript en `/dist` |
| `npm start` | Ejecuta la versión compilada |
| `docker compose up --build` | Levanta el servicio con PostgreSQL en Docker |
| `docker compose down` | Detiene los contenedores |
| `docker compose down -v` | Detiene y elimina los volúmenes de datos |

---

## Decisiones técnicas

| Decisión | Motivo |
|---|---|
| **Factory Method para tipos de usuario** | Encapsula la creación de ciudadano/institución con rollback automático si falla MS-Auth |
| **Rollback en registro** | Si MS-Users falla tras crear la credencial en MS-Auth, se llama `DELETE /credentials/:id` para evitar huérfanos |
| **Pre-validación de email único** | MS-Users verifica el email en su propia BD antes de llamar a MS-Auth, evitando credenciales huérfanas |
| **Algoritmo módulo 11 para RUN/RUT** | Valida el dígito verificador chileno tanto en RUN de personas como en RUT de instituciones |
| **Normalización de RUN/RUT** | Independiente del formato ingresado, siempre se guarda como `12345678-9` |
| **Cloudinary con eliminación de foto anterior** | Al actualizar la foto, se elimina la imagen anterior para evitar acumulación de archivos huérfanos |
| **Soft delete** | Las cuentas se desactivan (`is_active = false`) y nunca se eliminan físicamente |
| **credential_id sin FK física** | MS-Users referencia a MS-Auth por ID sin relación de clave foránea real (principio de BD independiente por microservicio) |
| **Sincronización de rol con MS-Auth** | Al cambiar el rol, MS-Users notifica a MS-Auth vía `PATCH /credentials/:id/role` para mantener el JWT actualizado |
| **Moderador de solo lectura** | El rol `moderador` puede consultar usuarios pero no modificar datos, estados ni roles |
| **SuperAdmin no puede desactivarse desde su perfil** | La "zona de peligro" en el frontend se oculta para el superadmin; el backend no tiene restricción adicional porque el superadmin no se desactivaría a sí mismo |
| **Regiones y comunas desde API gobierno** | Datos oficiales de Chile obtenidos de `apis.digital.gob.cl/dpa` |
| **UUID como identificador** | Previene enumeración maliciosa de recursos (IDOR) |

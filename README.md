# MS-Users — Sanos y Salvos

Microservicio de **gestión de usuarios** de la plataforma **Sanos y Salvos**. Es la **fuente de verdad** de todos los datos del usuario: perfil, credenciales (incluida la contraseña), tipo (ciudadano/institución), roles y estado. Cuando algo cambia aquí, se publica un evento al broker para que `ms-auth` actualice su réplica de credenciales.

---

## Responsabilidades

| Sí hace | No hace |
|---|---|
| Registrar ciudadanos e instituciones | Emitir tokens JWT (lo hace ms-auth) |
| Editar perfil del usuario | Validar credenciales para login (lo hace ms-auth) |
| Cambiar contraseña (autenticado) | Refrescar sesiones (lo hace ms-auth) |
| Recuperar contraseña vía OTP por email | — |
| Soft-delete de cuenta | — |
| Administración de usuarios (admin) | — |
| Subir foto de perfil a Cloudinary | — |
| Publicar eventos de sincronización | — |

---

## Tecnologías

| Herramienta | Uso |
|---|---|
| Node.js 20 | Entorno de ejecución |
| Express 5 | Servidor HTTP |
| TypeScript 5 | Tipado estático |
| PostgreSQL 16 | Persistencia |
| TypeORM 0.3 | ORM y sincronización de esquema |
| Bull + Redis | Cola de eventos hacia ms-auth |
| Multer | Recepción de archivos en memoria |
| Cloudinary | Almacenamiento de fotos de perfil |
| Nodemailer | Envío de OTP por correo Gmail |
| jsonwebtoken | Verificación de Access Tokens JWT |
| bcrypt | Hash y verificación de contraseñas |
| Swagger / OpenAPI 3.0 | Documentación interactiva |
| Docker | Contenerización |

---

## Arquitectura

### Patrón de arquitectura

**Arquitectura en capas + Event-Driven (productor)**

```
src/routes/ → src/controllers/ → src/services/ → src/models/
                                        │
                                        ▼
                              src/events/event-emitter (publica al broker)
```

- **Capas**: cada capa solo depende de la inmediatamente inferior.
- **Event-Driven**: tras una operación de escritura, `ms-users` publica un evento al broker. `ms-auth` lo consume asíncronamente para mantener su réplica sincronizada.

### Patrones de diseño

| Patrón | Ubicación | Propósito |
|---|---|---|
| **Repository** (via TypeORM) | `AppDataSource.getRepository(Entidad)` | Encapsular acceso a BD |
| **Factory Method** | `src/factories/UserFactory.ts` | Crear ciudadanos e instituciones uniformemente |
| **Singleton** | `src/config/db.ts`, `src/config/redis.ts`, `src/config/cloudinary.ts`, `src/utils/mailer.ts` | Instancias únicas reutilizables |

### Eventos publicados al broker

| Evento | Cuando se emite | Payload incluye |
|---|---|---|
| `user.registered` | Al crear ciudadano o institución | userId, email, passwordHash, role, perfil |
| `user.updated` | Al editar perfil | userId, campos modificados |
| `user.deleted` | Al desactivar cuenta | userId |
| `user.password.changed` | Al cambiar contraseña (autenticado u OTP) | userId, passwordHash |

> Estos eventos son consumidos por `ms-auth` para actualizar su réplica local.

---

## Requisitos previos

- Node.js 20+
- PostgreSQL 16+
- Redis (broker)
- Cuenta en [Cloudinary](https://cloudinary.com) (plan gratuito suficiente)
- Cuenta Gmail con [contraseña de aplicación](https://myaccount.google.com/apppasswords) habilitada (para OTP)

---

## Variables de entorno

Archivo `.env` en la raíz:

```env
PORT=3002

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ms_users

# Redis broker (cola compartida con ms-auth)
REDIS_BROKER_URL=redis://localhost:6379

# JWT — debe coincidir con ms-auth
JWT_SECRET=tu_secreto_minimo_64_caracteres

# API key interna — debe coincidir con ms-auth
MS_AUTH_URL=http://localhost:3001
INTERNAL_API_KEY=clave_compartida_con_ms_auth

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Gmail (envío de OTP para recuperar contraseña)
GMAIL_USER=tu_correo@gmail.com
GMAIL_APP_PASSWORD=tu_app_password_gmail

NODE_ENV=development
```

> `JWT_SECRET` e `INTERNAL_API_KEY` deben ser **idénticos** a los de `ms-auth`.

---

## Instalación y ejecución

```bash
git clone <url-del-repositorio>
cd ms-users
npm install

# Desarrollo (hot reload)
npm run dev

# Producción
npm run build && npm start
```

La base de datos se crea automáticamente al iniciar si no existe (`ensureDatabase()` en `server.ts`).

### Con Docker

```bash
cd ms-users
docker compose up -d
```

> Requiere que el `broker` esté corriendo previamente.

---

## Documentación interactiva

```
http://localhost:3002/api/docs
```

---

## Endpoints

### Registro público

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/users/register/ciudadano` | Registro de persona natural con RUN |
| `POST` | `/api/users/register/institucion` | Registro de veterinaria o municipalidad con RUT |

### Recuperar contraseña (público)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/users/forgot-password` | Envía OTP de 6 dígitos al correo |
| `PATCH` | `/api/users/reset-password` | Verifica OTP y cambia la contraseña |

### Perfil (autenticado)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/users/perfil` | Ver perfil propio |
| `PATCH` | `/api/users/perfil` | Actualizar perfil (incluye foto) |
| `PATCH` | `/api/users/perfil/password` | Cambiar contraseña (requiere actual) |
| `DELETE` | `/api/users/perfil` | Desactivar cuenta (soft delete) |

### Administración (roles: administrador, superadmin, moderador)

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `GET` | `/api/users/admin/usuarios` | admin, superadmin, moderador | Listar usuarios con filtros |
| `GET` | `/api/users/admin/usuarios/:id` | admin, superadmin, moderador | Ver usuario por ID |
| `PATCH` | `/api/users/admin/usuarios/:id/estado` | admin, superadmin | Activar/desactivar cuenta |
| `PATCH` | `/api/users/admin/usuarios/:id/rol` | admin, superadmin | Cambiar rol |
| `PATCH` | `/api/users/admin/usuarios/:id/datos` | admin, superadmin | Editar datos del usuario |

---

## Postman — Listo para probar

> **URL base:** `http://localhost:3002`

### Setup en Postman

Crea una **environment** con estas variables:

| Variable | Valor inicial |
|---|---|
| `baseUrl` | `http://localhost:3002` |
| `authUrl` | `http://localhost:3001` |
| `accessToken` | _(se completa tras login en ms-auth)_ |
| `userId` | _(se completa cuando lo necesites)_ |

> El login se hace en `ms-auth` (`POST {{authUrl}}/api/auth/login`). Copia el `accessToken` recibido y úsalo en los endpoints autenticados de ms-users.

---

### 1. Registrar ciudadano

```http
POST {{baseUrl}}/api/users/register/ciudadano
Content-Type: application/json
```

```json
{
  "email": "fe.ruizr@duocuc.cl",
  "password": "123456q",
  "telefono": "912345678",
  "region": "08",
  "comuna": "Concepción",
  "primer_nombre": "Felipe",
  "segundo_nombre": "Andrés",
  "apellido_paterno": "Ruiz",
  "apellido_materno": "Rojas",
  "run": "11.111.111-1",
  "direccion": "Av. O'Higgins 123"
}
```

> Si quieres subir foto: usa **Body → form-data** (no raw JSON) con los mismos campos como `text` y agrega `foto_perfil` como `file`.

---

### 2. Registrar institución

```http
POST {{baseUrl}}/api/users/register/institucion
Content-Type: application/json
```

```json
{
  "email": "veterinaria@sanos.cl",
  "password": "123456q",
  "telefono": "912345678",
  "region": "08",
  "comuna": "Concepción",
  "nombre_institucion": "Veterinaria San Jorge",
  "razon_social": "San Jorge Ltda.",
  "rut": "76.354.771-K",
  "tipo_institucion": "veterinaria",
  "direccion": "Av. Los Carrera 123"
}
```

---

### 3. Login (en ms-auth, incluido aquí por completitud del flujo)

```http
POST {{authUrl}}/api/auth/login
Content-Type: application/json
```

```json
{
  "email": "fe.ruizr@duocuc.cl",
  "password": "123456q"
}
```

> Copia el `accessToken` recibido y guárdalo en la environment de Postman.

---

### 4. Ver perfil propio

```http
GET {{baseUrl}}/api/users/perfil
Authorization: Bearer {{accessToken}}
```

_(Sin body)_

---

### 5. Actualizar perfil

```http
PATCH {{baseUrl}}/api/users/perfil
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

```json
{
  "telefono": "987654321",
  "region": "13",
  "comuna": "Santiago",
  "direccion": "Av. Providencia 1234",
  "primer_nombre": "Felipe",
  "apellido_paterno": "Ruiz"
}
```

> Todos los campos son opcionales — envía solo los que quieras cambiar. Para subir nueva foto usa **form-data** con `foto_perfil` como `file`.

---

### 6. Cambiar contraseña (autenticado)

```http
PATCH {{baseUrl}}/api/users/perfil/password
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

```json
{
  "currentPassword": "123456q",
  "newPassword": "nuevaPass123"
}
```

---

### 7. Solicitar OTP para recuperar contraseña

```http
POST {{baseUrl}}/api/users/forgot-password
Content-Type: application/json
```

```json
{
  "email": "fe.ruizr@duocuc.cl"
}
```

> Si el correo existe, llega un código de 6 dígitos válido por **10 minutos**.

---

### 8. Reset password con OTP

```http
PATCH {{baseUrl}}/api/users/reset-password
Content-Type: application/json
```

```json
{
  "email": "fe.ruizr@duocuc.cl",
  "code": "123456",
  "newPassword": "nuevaPass123"
}
```

---

### 9. Desactivar cuenta propia (soft delete)

```http
DELETE {{baseUrl}}/api/users/perfil
Authorization: Bearer {{accessToken}}
```

_(Sin body)_

---

### 10. Admin — Listar usuarios

```http
GET {{baseUrl}}/api/users/admin/usuarios?rol=ciudadano&is_active=true
Authorization: Bearer {{accessToken}}
```

**Query params (opcionales):**

| Param | Valores |
|---|---|
| `rol` | `ciudadano`, `veterinaria`, `municipalidad`, `moderador`, `administrador`, `superadmin` |
| `is_active` | `true`, `false` |

---

### 11. Admin — Ver usuario por ID

```http
GET {{baseUrl}}/api/users/admin/usuarios/{{userId}}
Authorization: Bearer {{accessToken}}
```

---

### 12. Admin — Cambiar estado (activar/desactivar)

```http
PATCH {{baseUrl}}/api/users/admin/usuarios/{{userId}}/estado
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

```json
{
  "is_active": false
}
```

---

### 13. Admin — Cambiar rol

```http
PATCH {{baseUrl}}/api/users/admin/usuarios/{{userId}}/rol
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

```json
{
  "rol": "moderador"
}
```

---

### 14. Admin — Editar datos del usuario

```http
PATCH {{baseUrl}}/api/users/admin/usuarios/{{userId}}/datos
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

```json
{
  "telefono": "987654321",
  "region": "13",
  "comuna": "Santiago",
  "primer_nombre": "Felipe"
}
```

---

## Roles del sistema

| Rol | Descripción |
|---|---|
| `ciudadano` | Persona natural registrada |
| `veterinaria` | Institución veterinaria |
| `municipalidad` | Municipalidad |
| `moderador` | Solo lectura administrativa |
| `administrador` | Administración completa |
| `superadmin` | Acceso total |

---

## Modelo de datos

### Tabla `users` (fuente de verdad)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `credential_id` | UUID único | Mismo UUID replicado a `ms-auth.credentials.id` |
| `email` | string único | Correo del usuario |
| `password_hash` | string | Hash bcrypt — **fuente de verdad** |
| `telefono` | string | Teléfono |
| `foto_perfil` | string (URL) | URL de Cloudinary |
| `rol` | enum | Rol del usuario |
| `tipo` | enum | `ciudadano` / `institucion` |
| `region` | string | Código de región |
| `comuna` | string | Nombre de la comuna |
| `is_active` | boolean | Estado de la cuenta |
| `created_at` | timestamp | — |
| `updated_at` | timestamp | — |

### Tabla `ciudadanos`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | — |
| `user_id` | UUID (FK) | Referencia a `users` |
| `primer_nombre` | string | — |
| `segundo_nombre` | string (opcional) | — |
| `apellido_paterno` | string | — |
| `apellido_materno` | string (opcional) | — |
| `run` | string único | Formato `12345678-9` |
| `direccion` | string | — |

### Tabla `instituciones`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | — |
| `user_id` | UUID (FK) | Referencia a `users` |
| `nombre_institucion` | string | Nombre comercial |
| `razon_social` | string | Razón social legal |
| `rut` | string único | Formato `76354771-K` |
| `tipo_institucion` | enum | `veterinaria` / `municipalidad` |
| `direccion` | string | — |

### Tabla `password_reset_otps`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | — |
| `email` | string | Correo destinatario del OTP |
| `code` | string | Código de 6 dígitos |
| `expires_at` | timestamptz | TTL 10 minutos |
| `used` | boolean | Si ya fue consumido |
| `created_at` | timestamp | — |

---

## Validaciones

| Campo | Regla |
|---|---|
| `email` | Formato válido con dominio y extensión |
| `password` | Mínimo 6 caracteres |
| `telefono` | Solo números, `+` opcional al inicio |
| `primer_nombre`, `apellido_paterno` | Solo letras (incluye tildes y ñ), mínimo 3 caracteres |
| `nombre_institucion`, `razon_social` | Solo letras, mínimo 3 caracteres |
| `run` / `rut` | Validados con algoritmo módulo 11 chileno |

---

## Foto de perfil

- Se recibe como `multipart/form-data` en el campo `foto_perfil`
- Se sube a Cloudinary directamente desde memoria (sin escribir en disco)
- Al actualizar, la foto anterior se elimina automáticamente de Cloudinary
- Solo se persiste la URL (`secure_url`) en PostgreSQL

---

## Estructura del proyecto

```
ms-users/
├── src/
│   ├── config/
│   │   ├── cloudinary.ts           # Configuración Cloudinary (Singleton)
│   │   ├── db.ts                   # Conexión PostgreSQL + TypeORM (Singleton)
│   │   ├── redis.ts                # Cola Bull sobre Redis (Singleton)
│   │   └── swagger.ts              # Configuración OpenAPI 3.0
│   ├── controllers/
│   │   ├── user.controller.ts      # CRUD de usuarios
│   │   └── password.controller.ts  # Cambio y recuperación de contraseña
│   ├── events/
│   │   └── event-emitter.service.ts # Publicación de eventos al broker
│   ├── factories/
│   │   └── UserFactory.ts          # Factory: ciudadanos e instituciones
│   ├── middlewares/
│   │   ├── errorHandler.ts
│   │   ├── notFound.ts
│   │   ├── requireRole.ts          # Control de acceso por rol
│   │   └── verifyToken.ts          # Verificación JWT
│   ├── models/
│   │   ├── Ciudadano.ts
│   │   ├── Institucion.ts
│   │   ├── PasswordResetOtp.ts     # OTP para reset
│   │   └── User.ts                 # Incluye password_hash (fuente de verdad)
│   ├── routes/
│   │   └── user.routes.ts          # Rutas + Swagger inline
│   ├── services/
│   │   ├── password.service.ts     # Cambio y reset de contraseña + OTP
│   │   └── user.service.ts         # CRUD de perfil y admin
│   ├── utils/
│   │   ├── mailer.ts               # Envío de OTP por Gmail (Singleton)
│   │   ├── response.ts             # Helpers HTTP estandarizados
│   │   ├── validarDigitoVerificador.ts  # Algoritmo módulo 11
│   │   └── validators.ts
│   ├── app.ts
│   └── server.ts                   # Entry point — crea BD si no existe
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Hot reload con nodemon + ts-node |
| `npm run build` | Compila TypeScript a `/dist` |
| `npm start` | Ejecuta la versión compilada |
| `docker compose up -d` | Levanta ms-users + PostgreSQL (requiere broker) |
| `docker compose down -v` | Detiene y limpia datos |

---

## Flujo de registro completo

```
1. Cliente → POST /api/users/register/ciudadano
2. ms-users valida campos (email, RUN, password, etc.)
3. ms-users hashea password con bcrypt
4. ms-users guarda User + Ciudadano en su PostgreSQL (con password_hash local)
5. ms-users publica evento user.registered al broker
6. ms-auth consume el evento y crea Credential réplica con el mismo passwordHash
7. Cliente recibe 201 con datos del usuario creado
```

> Si el broker está caído, el registro **igual se persiste** localmente. El evento queda pendiente y `ms-auth` lo procesará cuando recupere conexión (Bull retiene la cola en Redis).

---

## Flujo de cambio de contraseña

```
1. Cliente → PATCH /api/users/perfil/password (Bearer Token)
2. ms-users verifica currentPassword contra password_hash local
3. ms-users hashea la newPassword
4. ms-users actualiza User.password_hash en su PostgreSQL
5. ms-users publica evento user.password.changed al broker
6. ms-auth actualiza Credential.password_hash en su réplica
7. Cliente recibe 200
```

---

## Crear el primer superadmin (con Docker corriendo)

> En v2.0.0 `ms-users` es la **fuente de verdad** del rol. Como no existe ningún admin todavía para usar el endpoint `/admin/usuarios/:id/rol`, hay que actualizar las dos BD manualmente y limpiar la caché de Redis. Ejecuta los pasos **en orden**.

> Requiere los stacks corriendo: `broker` → `ms-auth` → `ms-users` → `frontend`.

### Paso 1 — Registrar el usuario

```bash
curl -X POST http://localhost:3002/api/users/register/ciudadano \
  -H "Content-Type: application/json" \
  -d '{
    "email": "fe.ruizr@duocuc.cl",
    "password": "123456q",
    "telefono": "912345678",
    "region": "08",
    "comuna": "Concepción",
    "primer_nombre": "Felipe",
    "apellido_paterno": "Ruiz",
    "run": "11.111.111-1",
    "direccion": "Av. O'\''Higgins 123"
  }'
```

Espera 1–2 segundos para que el evento `user.registered` se procese en `ms-auth`.

### Paso 2 — Promover a superadmin en ms-users (fuente de verdad)

```bash
docker exec ms-users-db psql -U postgres -d ms_users \
  -c "UPDATE users SET rol='superadmin' WHERE email='fe.ruizr@duocuc.cl';"
```

Debe responder `UPDATE 1`.

### Paso 3 — Sincronizar la réplica en ms-auth

```bash
docker exec ms-auth-db psql -U postgres -d ms_auth \
  -c "UPDATE credentials SET role='superadmin' WHERE email='fe.ruizr@duocuc.cl';"
```

Debe responder `UPDATE 1`.

### Paso 4 — Limpiar la caché Redis de ms-auth

```bash
docker exec ms-auth-redis redis-cli FLUSHDB
```

Debe responder `OK`. Esto fuerza a que el próximo `/me` se reconstruya desde la BD con el rol actualizado.

### Paso 5 — Verificar

Inicia sesión en `http://localhost` con `fe.ruizr@duocuc.cl` / `123456q`. Deberías ver opciones de administración.

> **A futuro:** una vez tengas un superadmin, los siguientes cambios de rol se hacen vía API (`PATCH /api/users/admin/usuarios/:id/rol`), que emite automáticamente el evento `user.updated` al broker y mantiene todo sincronizado sin tocar BD a mano.

> El próximo login funcionará con la nueva contraseña porque `ms-auth` la sincronizó.

---

## Diagnóstico

| Síntoma | Causa probable | Solución |
|---|---|---|
| `El correo ya está registrado` | Email duplicado en PG | Usar otro email o reactivar la cuenta |
| `RUN inválido` | Dígito verificador incorrecto | Validar con módulo 11 antes de enviar |
| `Token requerido` | Falta header `Authorization` | Agregar `Bearer <accessToken>` |
| OTP no llega | GMAIL_APP_PASSWORD incorrecto o spam | Revisar carpeta de spam, regenerar app password |
| Cambio de contraseña no se refleja en login | ms-auth consumer no procesó el evento | Verificar logs de ms-auth: `[consumer] user.password.changed recibido` |

# MS-Users — Sanos y Salvos

Microservicio de gestión de usuarios de la plataforma **Sanos y Salvos**. Gestiona el registro diferenciado de ciudadanos e instituciones, perfiles de usuario con foto en Cloudinary, validación de RUN/RUT chileno y administración de cuentas con control de roles.

---

## Tecnologías

| Herramienta | Uso |
|---|---|
| Node.js 20 | Entorno de ejecución |
| Express 4 | Servidor HTTP |
| TypeScript 5 | Tipado estático |
| PostgreSQL 16 | Persistencia de datos |
| TypeORM 0.3 | ORM y sincronización de esquema |
| Redis + Bull | Cola de eventos hacia ms-auth |
| Multer | Recepción de archivos en memoria |
| Cloudinary | Almacenamiento de fotos de perfil |
| jsonwebtoken | Verificación de Access Tokens JWT |
| bcrypt | Hash de contraseñas |
| Swagger / OpenAPI 3.0 | Documentación interactiva de endpoints |
| Docker | Contenerización del servicio |

---

# Arquitectura

## Arquetipo

### Arquetipo Maven

- La totalidad del proyecto ms-users.

- Microservicio construido con Java + Spring Boot + Maven que expone una API REST con autenticación JWT y gestión de credenciales.

- Aisla la autenticación en su propio proceso y base de datos, permitiendo desplegarlo, escalarlo y mantenerlo independientemente del resto de microservicios.
---

## Patrón de Arquitectura

### Arquitectura en Capas (Layered Architecture)

- src/routes/ → src/controllers/ → src/services/ → src/models/

- Cada capa tiene una responsabilidad única y solo se comunica con la capa inmediatamente inferior. Las rutas reciben la petición HTTP y delegan al controlador. El controlador valida y delega al servicio. El servicio contiene la lógica de negocio y accede a los modelos de TypeORM.

- Facilita el mantenimiento y la lectura del código. Un cambio en la base de datos no afecta al controlador; un cambio en la ruta no afecta al servicio. Las responsabilidades están claramente separadas.

### Arquitectura Orientada a Eventos (Event-Driven Architecture)

- src/events/event-emitter.service.ts y src/config/redis.ts

- Al registrar un usuario, ms-users emite eventos (user.registered, user.updated, user.deleted) hacia una cola Bull sobre Redis. ms-auth consume esa cola de forma asíncrona para crear la credencial de acceso. La cola tiene reintentos automáticos con backoff exponencial (5 intentos, desde 2 s).

- Desacopla ms-users de ms-auth. ms-users no necesita saber nada de ms-auth; solo publica un evento y continúa. Si ms-auth está caído momentáneamente, la cola retiene el evento y lo reintenta cuando vuelva.

## Patrón de Diseño: 

### Repository (via TypeORM)

- src/factories/UserFactory.ts y src/services/user.service.ts, mediante AppDataSource.getRepository(Entidad).

- TypeORM expone un Repository<T> por entidad que encapsula todas las operaciones sobre la base de datos (find, save, delete, update). El código de negocio nunca escribe SQL directamente; interactúa con objetos tipados a través del repositorio.

- Desacopla la lógica de negocio del motor de base de datos. Si en el futuro se cambiara de PostgreSQL a otro motor, solo se modifica la configuración de TypeORM, no la lógica del servicio.

### Factory Method

- src/factories/UserFactory.ts, métodos crearCiudadano() y crearInstitucion().

- UserFactory centraliza toda la lógica de construcción de un usuario: genera el credential_id, hashea la contraseña, crea las entidades relacionadas (User + Ciudadano o User + Institucion), guarda en base de datos y emite el evento de sincronización. Si la emisión del evento falla, ejecuta un rollback eliminando las entidades recién creadas.

- Evita duplicar la lógica de creación en múltiples controladores o servicios. Cualquier cambio en cómo se crea un usuario (nueva validación, nuevo campo) se hace en un único lugar.

### Singleton

- src/config/db.ts (AppDataSource) y src/config/redis.ts (userEventsQueue).

- Ambos son módulos de Node.js exportados como una única instancia. Node.js cachea los módulos en require, por lo que cualquier archivo que importe AppDataSource o userEventsQueue obtiene siempre el mismo objeto.

- Una única conexión a la base de datos y una única instancia de la cola evitan abrir múltiples conexiones simultáneas innecesarias, lo que podría agotar los recursos del servidor de base de datos y de Redis.

---

## Requisitos previos

- Node.js 20+
- PostgreSQL 16+
- Redis
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

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password
DB_NAME=ms_users

REDIS_BROKER_URL=redis://localhost:6379

JWT_SECRET=tu_secreto_minimo_64_caracteres
MS_AUTH_URL=http://localhost:3001
INTERNAL_API_KEY=clave_compartida_con_ms_auth

CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

NODE_ENV=development
```

> `JWT_SECRET` e `INTERNAL_API_KEY` deben ser idénticos a los configurados en ms-auth.

---

## Base de datos

```bash
psql -U postgres
CREATE DATABASE ms_users;
\q
```

TypeORM con `synchronize: true` crea y actualiza las tablas automáticamente al iniciar.

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
🚀 MS-Users corriendo en http://localhost:3002
```

---

## Levantar con Docker

```bash
docker compose up -d
```

No requiere tener Node.js, PostgreSQL ni Redis instalados. La imagen se descarga automáticamente desde Docker Hub (`felruiz/ms-users:latest`).

```bash
# Detener
docker compose down

# Detener y eliminar datos
docker compose down -v
```

---

## Documentación Swagger

```
http://localhost:3002/api/docs
```

---

## Endpoints

### Registro (público)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/users/register/ciudadano` | Registro de persona natural con RUN |
| `POST` | `/api/users/register/institucion` | Registro de veterinaria o municipalidad con RUT |

### Perfil (autenticado)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/users/perfil` | Ver perfil propio |
| `PATCH` | `/api/users/perfil` | Actualizar perfil (incluye foto) |
| `DELETE` | `/api/users/perfil` | Desactivar cuenta propia |

### Administración

| Método | Ruta | Roles permitidos | Descripción |
|---|---|---|---|
| `GET` | `/api/users/admin/usuarios` | `administrador`, `superadmin`, `moderador` | Listar usuarios con filtros |
| `GET` | `/api/users/admin/usuarios/:id` | `administrador`, `superadmin`, `moderador` | Ver usuario por ID |
| `PATCH` | `/api/users/admin/usuarios/:id/estado` | `administrador`, `superadmin` | Activar o desactivar cuenta |
| `PATCH` | `/api/users/admin/usuarios/:id/rol` | `administrador`, `superadmin` | Cambiar rol de usuario |
| `PATCH` | `/api/users/admin/usuarios/:id/datos` | `administrador`, `superadmin` | Editar datos de usuario |

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

### Tabla `users`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único |
| `credential_id` | UUID único | ID de la credencial en ms-auth |
| `email` | string único | Correo del usuario |
| `telefono` | string | Teléfono de contacto |
| `foto_perfil` | string (URL) | URL de Cloudinary |
| `rol` | enum | ciudadano / veterinaria / municipalidad / moderador / administrador / superadmin |
| `tipo` | enum | ciudadano / institucion |
| `region` | string | Código de región |
| `comuna` | string | Nombre de la comuna |
| `is_active` | boolean | Estado de la cuenta |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Última actualización |

### Tabla `ciudadanos`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador |
| `user_id` | UUID (FK) | Referencia a `users` |
| `primer_nombre` | string | — |
| `segundo_nombre` | string (opcional) | — |
| `apellido_paterno` | string | — |
| `apellido_materno` | string (opcional) | — |
| `run` | string único | Formato `12345678-9` |
| `direccion` | string | Dirección de residencia |

### Tabla `instituciones`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador |
| `user_id` | UUID (FK) | Referencia a `users` |
| `nombre_institucion` | string | Nombre comercial |
| `razon_social` | string | Razón social legal |
| `rut` | string único | Formato `76354771-K` |
| `tipo_institucion` | enum | veterinaria / municipalidad |
| `direccion` | string | Dirección física |

---

## Validaciones

| Campo | Regla |
|---|---|
| `email` | Formato válido con dominio y extensión |
| `password` | Mínimo 6 caracteres |
| `telefono` | Solo números, `+` opcional al inicio |
| `primer_nombre`, `apellido_paterno` | Solo letras (incluye tildes y ñ), mínimo 3 caracteres |
| `nombre_institucion`, `razon_social` | Solo letras, mínimo 3 caracteres |
| `run` | Validado con algoritmo módulo 11 chileno |
| `rut` | Misma validación que RUN |

---

## Foto de perfil

- Se recibe como `multipart/form-data` con el campo `foto_perfil`
- Se sube a Cloudinary directamente desde memoria (sin escribir en disco)
- Al actualizar la foto, la imagen anterior se elimina automáticamente de Cloudinary
- Solo la URL (`secure_url`) se almacena en PostgreSQL

---

## Estructura del proyecto

```
ms-users/
├── src/
│   ├── config/
│   │   ├── cloudinary.ts           # Configuración Cloudinary
│   │   ├── db.ts                   # Conexión PostgreSQL + TypeORM (Singleton)
│   │   ├── redis.ts                # Cola Bull sobre Redis (Singleton)
│   │   └── swagger.ts              # Configuración OpenAPI 3.0
│   ├── controllers/
│   │   └── user.controller.ts      # Handlers HTTP
│   ├── events/
│   │   └── event-emitter.service.ts # Emisión de eventos a ms-auth
│   ├── factories/
│   │   └── UserFactory.ts          # Factory Method — crea ciudadanos e instituciones
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
│   │   └── user.service.ts         # Lógica de negocio
│   ├── utils/
│   │   ├── response.ts             # Helpers de respuesta HTTP estandarizada
│   │   ├── validarDigitoVerificador.ts  # Algoritmo módulo 11 para RUN/RUT
│   │   └── validators.ts           # Validaciones de campos
│   ├── app.ts                      # Configuración Express y middlewares
│   └── server.ts                   # Punto de entrada y conexión a la BD
├── .dockerignore
├── .gitattributes
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
| `docker compose up -d` | Levanta el servicio con PostgreSQL en Docker (requiere broker levantado) |
| `docker compose down` | Detiene los contenedores |
| `docker compose down -v` | Detiene y elimina los volúmenes de datos |

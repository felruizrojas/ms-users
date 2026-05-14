import { Router } from 'express';
import multer from 'multer';
import * as UserController from '../controllers/user.controller';
import { verifyToken } from '../middlewares/verifyToken';
import { requireRole } from '../middlewares/requireRole';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /api/users/register/ciudadano:
 *   post:
 *     summary: Registro de ciudadano (RF-05)
 *     tags: [Registro]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [email, password, telefono, region, comuna, primer_nombre, apellido_paterno, run, direccion]
 *             properties:
 *               email:
 *                 type: string
 *                 example: ciudadano@sanos.cl
 *               password:
 *                 type: string
 *                 example: "123456"
 *               telefono:
 *                 type: string
 *                 example: "912345678"
 *               region:
 *                 type: string
 *                 example: "08"
 *               comuna:
 *                 type: string
 *                 example: Concepción
 *               direccion:
 *                 type: string
 *                 example: Av. O'Higgins 123
 *               primer_nombre:
 *                 type: string
 *                 example: Felipe
 *               segundo_nombre:
 *                 type: string
 *                 example: Andrés
 *               apellido_paterno:
 *                 type: string
 *                 example: Ruiz
 *               apellido_materno:
 *                 type: string
 *                 example: Rojas
 *               run:
 *                 type: string
 *                 example: 11.111.111-1
 *               foto_perfil:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Ciudadano registrado exitosamente
 *       400:
 *         description: RUN inválido, correo ya registrado, o campos inválidos
 */
router.post('/register/ciudadano', upload.single('foto_perfil'), UserController.registrarCiudadano);

/**
 * @swagger
 * /api/users/register/institucion:
 *   post:
 *     summary: Registro de institución (RF-05)
 *     tags: [Registro]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [email, password, telefono, region, comuna, nombre_institucion, razon_social, rut, tipo_institucion, direccion]
 *             properties:
 *               email:
 *                 type: string
 *                 example: veterinaria@sanos.cl
 *               password:
 *                 type: string
 *                 example: "123456"
 *               telefono:
 *                 type: string
 *                 example: "912345678"
 *               region:
 *                 type: string
 *                 example: "08"
 *               comuna:
 *                 type: string
 *                 example: Concepción
 *               nombre_institucion:
 *                 type: string
 *                 example: Veterinaria San Jorge
 *               razon_social:
 *                 type: string
 *                 example: San Jorge Ltda.
 *               rut:
 *                 type: string
 *                 example: 76.354.771-K
 *               tipo_institucion:
 *                 type: string
 *                 enum: [municipalidad, veterinaria]
 *                 example: veterinaria
 *               direccion:
 *                 type: string
 *                 example: Av. Los Carrera 123
 *               foto_perfil:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Institución registrada exitosamente
 *       400:
 *         description: RUT inválido o correo ya registrado
 */
router.post('/register/institucion', upload.single('foto_perfil'), UserController.registrarInstitucion);

/**
 * @swagger
 * /api/users/perfil:
 *   get:
 *     summary: Ver perfil propio (RF-06)
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario autenticado
 *       401:
 *         description: Token requerido
 *       404:
 *         description: Usuario no encontrado
 *   patch:
 *     summary: Actualizar perfil (RF-08)
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               telefono:
 *                 type: string
 *               region:
 *                 type: string
 *               comuna:
 *                 type: string
 *               direccion:
 *                 type: string
 *               primer_nombre:
 *                 type: string
 *               segundo_nombre:
 *                 type: string
 *               apellido_paterno:
 *                 type: string
 *               apellido_materno:
 *                 type: string
 *               nombre_institucion:
 *                 type: string
 *               razon_social:
 *                 type: string
 *               foto_perfil:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Perfil actualizado correctamente
 *       400:
 *         description: Datos inválidos (nombre con números, teléfono incorrecto, etc.)
 *       401:
 *         description: Token requerido
 *   delete:
 *     summary: Desactivar cuenta (RF-10)
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cuenta desactivada correctamente
 *       401:
 *         description: Token requerido
 */
router.get('/perfil', verifyToken, UserController.obtenerPerfil);
router.patch('/perfil', verifyToken, upload.single('foto_perfil'), UserController.actualizarPerfil);
router.delete('/perfil', verifyToken, UserController.desactivarCuenta);


/**
 * @swagger
 * /api/users/admin/usuarios:
 *   get:
 *     summary: Listar todos los usuarios — solo administrador
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: rol
 *         schema:
 *           type: string
 *           enum: [ciudadano, veterinaria, municipalidad, moderador, administrador, superadmin]
 *         description: Filtrar por rol
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo/inactivo
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *       401:
 *         description: Token requerido
 */
router.get('/admin/usuarios', verifyToken, requireRole('administrador', 'superadmin', 'moderador'), UserController.listarUsuarios);

/**
 * @swagger
 * /api/users/admin/usuarios/{id}:
 *   get:
 *     summary: Ver usuario por ID — solo administrador
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID del usuario
 *     responses:
 *       200:
 *         description: Datos completos del usuario
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/admin/usuarios/:id', verifyToken, requireRole('administrador', 'superadmin', 'moderador'), UserController.verUsuario);

/**
 * @swagger
 * /api/users/admin/usuarios/{id}/estado:
 *   patch:
 *     summary: Activar o desactivar cuenta — solo administrador
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [is_active]
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Estado actualizado correctamente
 *       404:
 *         description: Usuario no encontrado
 */
router.patch('/admin/usuarios/:id/estado', verifyToken, requireRole('administrador', 'superadmin'), UserController.cambiarEstadoUsuario);

/**
 * @swagger
 * /api/users/admin/usuarios/{id}/rol:
 *   patch:
 *     summary: Cambiar rol de usuario — solo administrador
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rol]
 *             properties:
 *               rol:
 *                 type: string
 *                 enum: [ciudadano, veterinaria, municipalidad, moderador, administrador]
 *                 example: administrador
 *     responses:
 *       200:
 *         description: Rol actualizado correctamente
 *       404:
 *         description: Usuario no encontrado
 */
router.patch('/admin/usuarios/:id/rol', verifyToken, requireRole('administrador', 'superadmin'), UserController.cambiarRolUsuario);

/**
 * @swagger
 * /api/users/admin/usuarios/{id}/datos:
 *   patch:
 *     summary: Editar datos de un usuario — solo administrador
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               telefono:
 *                 type: string
 *               region:
 *                 type: string
 *               comuna:
 *                 type: string
 *               primer_nombre:
 *                 type: string
 *               segundo_nombre:
 *                 type: string
 *               apellido_paterno:
 *                 type: string
 *               apellido_materno:
 *                 type: string
 *               nombre_institucion:
 *                 type: string
 *               razon_social:
 *                 type: string
 *               direccion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Datos actualizados correctamente
 *       404:
 *         description: Usuario no encontrado
 */
router.patch('/admin/usuarios/:id/datos', verifyToken, requireRole('administrador', 'superadmin'), UserController.editarDatosUsuario);

export default router;
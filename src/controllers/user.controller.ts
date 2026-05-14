import { Request, Response } from 'express';
import * as UserService from '../services/user.service';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../middlewares/verifyToken';
import { esNombreValido, esEmailValido, esTelefonoValido, normalizarYValidarRut } from '../utils/validators';

// RF-05 — Registro ciudadano
export const registrarCiudadano = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, telefono, region, comuna, primer_nombre, segundo_nombre, apellido_paterno, apellido_materno, run, direccion } = req.body;

    if (!email || !password || !telefono || !region || !comuna || !primer_nombre || !apellido_paterno || !run || !direccion) {
      errorResponse(res, 'Faltan campos requeridos: email, password, telefono, region, comuna, primer_nombre, apellido_paterno, run, direccion');
      return;
    }
    if (!esEmailValido(email)) { errorResponse(res, 'Email inválido'); return; }
    if (password.length < 6) { errorResponse(res, 'La contraseña debe tener al menos 6 caracteres'); return; }
    if (!esTelefonoValido(telefono)) { errorResponse(res, 'Teléfono inválido: solo números, con + opcional al inicio'); return; }
    if (!esNombreValido(primer_nombre)) { errorResponse(res, 'El primer nombre debe tener al menos 3 letras y no contener números ni símbolos'); return; }
    if (segundo_nombre && !esNombreValido(segundo_nombre)) { errorResponse(res, 'El segundo nombre debe tener al menos 3 letras y no contener números ni símbolos'); return; }
    if (!esNombreValido(apellido_paterno)) { errorResponse(res, 'El apellido paterno debe tener al menos 3 letras y no contener números ni símbolos'); return; }
    if (apellido_materno && !esNombreValido(apellido_materno)) { errorResponse(res, 'El apellido materno debe tener al menos 3 letras y no contener números ni símbolos'); return; }

    const runValidado = normalizarYValidarRut(run);
    if (!runValidado.valido) { errorResponse(res, 'RUN inválido'); return; }

    const data = await UserService.registrarCiudadano(
      { ...req.body, run: runValidado.normalizado },
      req.file
    );
    successResponse(res, data, 201);
  } catch (err: any) {
    errorResponse(res, err.message);
  }
};

// RF-05 — Registro institución
export const registrarInstitucion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, telefono, region, comuna, nombre_institucion, razon_social, rut, tipo_institucion, direccion } = req.body;

    if (!email || !password || !telefono || !region || !comuna || !nombre_institucion || !razon_social || !rut || !tipo_institucion || !direccion) {
      errorResponse(res, 'Faltan campos requeridos: email, password, telefono, region, comuna, nombre_institucion, razon_social, rut, tipo_institucion, direccion');
      return;
    }
    if (!esEmailValido(email)) { errorResponse(res, 'Email inválido'); return; }
    if (password.length < 6) { errorResponse(res, 'La contraseña debe tener al menos 6 caracteres'); return; }
    if (!esTelefonoValido(telefono)) { errorResponse(res, 'Teléfono inválido: solo números, con + opcional al inicio'); return; }
    if (!esNombreValido(nombre_institucion)) { errorResponse(res, 'El nombre de institución debe tener al menos 3 letras y no contener números ni símbolos'); return; }
    if (!esNombreValido(razon_social)) { errorResponse(res, 'La razón social debe tener al menos 3 letras y no contener números ni símbolos'); return; }

    const rutValidado = normalizarYValidarRut(rut);
    if (!rutValidado.valido) { errorResponse(res, 'RUT inválido'); return; }

    const data = await UserService.registrarInstitucion(
      { ...req.body, rut: rutValidado.normalizado },
      req.file
    );
    successResponse(res, data, 201);
  } catch (err: any) {
    errorResponse(res, err.message);
  }
};

// RF-06 — Ver perfil
export const obtenerPerfil = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const data = await UserService.obtenerPerfil(userId);
    successResponse(res, data);
  } catch (err: any) {
    errorResponse(res, err.message, 404);
  }
};

// RF-08 — Actualizar perfil
export const actualizarPerfil = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { telefono, primer_nombre, segundo_nombre, apellido_paterno, apellido_materno, nombre_institucion, razon_social } = req.body;

    if (telefono !== undefined && !esTelefonoValido(telefono)) { errorResponse(res, 'Teléfono inválido: solo números, con + opcional al inicio'); return; }
    if (primer_nombre !== undefined && !esNombreValido(primer_nombre)) { errorResponse(res, 'El primer nombre debe tener al menos 3 letras y no contener números ni símbolos'); return; }
    if (segundo_nombre !== undefined && segundo_nombre !== '' && !esNombreValido(segundo_nombre)) { errorResponse(res, 'El segundo nombre debe tener al menos 3 letras y no contener números ni símbolos'); return; }
    if (apellido_paterno !== undefined && !esNombreValido(apellido_paterno)) { errorResponse(res, 'El apellido paterno debe tener al menos 3 letras y no contener números ni símbolos'); return; }
    if (apellido_materno !== undefined && apellido_materno !== '' && !esNombreValido(apellido_materno)) { errorResponse(res, 'El apellido materno debe tener al menos 3 letras y no contener números ni símbolos'); return; }
    if (nombre_institucion !== undefined && !esNombreValido(nombre_institucion)) { errorResponse(res, 'El nombre de institución debe tener al menos 3 letras y no contener números ni símbolos'); return; }
    if (razon_social !== undefined && !esNombreValido(razon_social)) { errorResponse(res, 'La razón social debe tener al menos 3 letras y no contener números ni símbolos'); return; }

    const userId = req.user!.id;
    const data = await UserService.actualizarPerfil(userId, req.body, req.file);
    successResponse(res, data!);
  } catch (err: any) {
    errorResponse(res, err.message);
  }
};

// RF-10 — Desactivar cuenta
export const desactivarCuenta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    await UserService.desactivarCuenta(userId);
    successResponse(res, { message: 'Cuenta desactivada correctamente' });
  } catch (err: any) {
    errorResponse(res, err.message);
  }
};

// Admin — Listar usuarios
export const listarUsuarios = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rol, is_active } = req.query;
    const data = await UserService.listarUsuarios(
      { rol: rol as string, is_active: is_active !== undefined ? is_active === 'true' : undefined },
      req.user!.role,
    );
    successResponse(res, data);
  } catch (err: any) {
    errorResponse(res, err.message);
  }
};

// Admin — Ver usuario
export const verUsuario = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const data = await UserService.verUsuario(id, req.user!.role);
    successResponse(res, data);
  } catch (err: any) {
    errorResponse(res, err.message, err.status ?? 404);
  }
};

// Admin — Cambiar estado
export const cambiarEstadoUsuario = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { is_active } = req.body;
    const data = await UserService.cambiarEstadoUsuario(id, is_active, req.user!.role);
    successResponse(res, data);
  } catch (err: any) {
    errorResponse(res, err.message, err.status ?? 400);
  }
};

// Admin — Cambiar rol
export const cambiarRolUsuario = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { rol } = req.body;
    const data = await UserService.cambiarRolUsuario(id, rol, req.user!.role);
    successResponse(res, data);
  } catch (err: any) {
    errorResponse(res, err.message, err.status ?? 400);
  }
};

// Admin — Editar datos
export const editarDatosUsuario = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { telefono, primer_nombre, segundo_nombre, apellido_paterno, apellido_materno, nombre_institucion, razon_social } = req.body;

    if (telefono !== undefined && !esTelefonoValido(telefono)) { errorResponse(res, 'Teléfono inválido: solo números, con + opcional al inicio'); return; }
    if (primer_nombre !== undefined && !esNombreValido(primer_nombre)) { errorResponse(res, 'El primer nombre debe tener al menos 3 letras y no contener números ni símbolos'); return; }
    if (segundo_nombre !== undefined && segundo_nombre !== '' && !esNombreValido(segundo_nombre)) { errorResponse(res, 'El segundo nombre debe tener al menos 3 letras y no contener números ni símbolos'); return; }
    if (apellido_paterno !== undefined && !esNombreValido(apellido_paterno)) { errorResponse(res, 'El apellido paterno debe tener al menos 3 letras y no contener números ni símbolos'); return; }
    if (apellido_materno !== undefined && apellido_materno !== '' && !esNombreValido(apellido_materno)) { errorResponse(res, 'El apellido materno debe tener al menos 3 letras y no contener números ni símbolos'); return; }
    if (nombre_institucion !== undefined && !esNombreValido(nombre_institucion)) { errorResponse(res, 'El nombre de institución debe tener al menos 3 letras y no contener números ni símbolos'); return; }
    if (razon_social !== undefined && !esNombreValido(razon_social)) { errorResponse(res, 'La razón social debe tener al menos 3 letras y no contener números ni símbolos'); return; }

    const id = req.params.id as string;
    const data = await UserService.editarDatosUsuario(id, req.body, req.user!.role);
    successResponse(res, data);
  } catch (err: any) {
    errorResponse(res, err.message, err.status ?? 400);
  }
};
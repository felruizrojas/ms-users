import { AppDataSource } from '../config/db';
import { User, RolUsuario } from '../models/User';
import { Ciudadano } from '../models/Ciudadano';
import { Institucion, TipoInstitucion } from '../models/Institucion';
import { UserFactory } from '../factories/UserFactory';
import cloudinary from '../config/cloudinary';
import { emitUserUpdated, emitUserDeleted } from '../events/event-emitter.service';

const userRepo = () => AppDataSource.getRepository(User);

// RF-05 — Registro ciudadano
export const registrarCiudadano = async (datos: any, archivo?: Express.Multer.File) => {
  let foto_perfil: string | undefined;

  if (archivo) {
    const resultado = await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'sanos-salvos/perfiles' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!.secure_url);
        }
      );
      stream.end(archivo.buffer);
    });
    foto_perfil = resultado;
  }

  return UserFactory.crearCiudadano({ ...datos, foto_perfil });
};

// RF-05 — Registro institución
export const registrarInstitucion = async (datos: any, archivo?: Express.Multer.File) => {
  let foto_perfil: string | undefined;

  if (archivo) {
    const resultado = await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'sanos-salvos/perfiles' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!.secure_url);
        }
      );
      stream.end(archivo.buffer);
    });
    foto_perfil = resultado;
  }

  return UserFactory.crearInstitucion({ ...datos, foto_perfil, tipo_institucion: datos.tipo_institucion as TipoInstitucion });
};

// RF-06 — Ver perfil
export const obtenerPerfil = async (credentialId: string) => {
  const user = await userRepo().findOne({
    where: { credential_id: credentialId, is_active: true },
    relations: ['ciudadano', 'institucion'],
  });
  if (!user) throw new Error('Usuario no encontrado');
  return user;
};

// RF-08 — Actualizar datos
export const actualizarPerfil = async (credentialId: string, datos: any, archivo?: Express.Multer.File) => {
  const user = await userRepo().findOne({ where: { credential_id: credentialId }, relations: ['ciudadano', 'institucion'] });
  if (!user) throw new Error('Usuario no encontrado');

  const { telefono, region, comuna, primer_nombre, segundo_nombre, apellido_paterno, apellido_materno, direccion, nombre_institucion, razon_social } = datos;

  const datosUser: Partial<User> = {};
  if (telefono !== undefined) datosUser.telefono = telefono;
  if (region !== undefined) datosUser.region = region;
  if (comuna !== undefined) datosUser.comuna = comuna;

  if (archivo) {
    if (user.foto_perfil) {
      const match = user.foto_perfil.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
      if (match) await cloudinary.uploader.destroy(match[1]).catch(() => {});
    }
    const foto_perfil = await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'sanos-salvos/perfiles' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!.secure_url);
        }
      );
      stream.end(archivo.buffer);
    });
    datosUser.foto_perfil = foto_perfil;
  }

  if (Object.keys(datosUser).length > 0) {
    await userRepo().update({ credential_id: credentialId }, datosUser);
  }

  if (user.tipo === 'ciudadano' && user.ciudadano) {
    const datosCiudadano: Partial<Ciudadano> = {};
    if (primer_nombre !== undefined) datosCiudadano.primer_nombre = primer_nombre;
    if (segundo_nombre !== undefined) datosCiudadano.segundo_nombre = segundo_nombre;
    if (apellido_paterno !== undefined) datosCiudadano.apellido_paterno = apellido_paterno;
    if (apellido_materno !== undefined) datosCiudadano.apellido_materno = apellido_materno;
    if (direccion !== undefined) datosCiudadano.direccion = direccion;
    if (Object.keys(datosCiudadano).length > 0) {
      await AppDataSource.getRepository(Ciudadano).update({ id: user.ciudadano.id }, datosCiudadano);
    }
  }

  if (user.tipo === 'institucion' && user.institucion) {
    const datosInstitucion: Partial<Institucion> = {};
    if (nombre_institucion !== undefined) datosInstitucion.nombre_institucion = nombre_institucion;
    if (razon_social !== undefined) datosInstitucion.razon_social = razon_social;
    if (direccion !== undefined) datosInstitucion.direccion = direccion;
    if (Object.keys(datosInstitucion).length > 0) {
      await AppDataSource.getRepository(Institucion).update({ id: user.institucion.id }, datosInstitucion);
    }
  }

  // Sincronizar nombre/avatar cacheados en ms-auth vía evento
  const updatedUser = await userRepo().findOne({ where: { credential_id: credentialId }, relations: ['ciudadano', 'institucion'] });
  if (updatedUser) {
    const eventData: Parameters<typeof emitUserUpdated>[0] = { userId: credentialId };
    if (datosUser.foto_perfil) eventData.avatarUrl = datosUser.foto_perfil;
    if (updatedUser.tipo === 'ciudadano' && updatedUser.ciudadano) {
      const c = updatedUser.ciudadano;
      eventData.name = `${c.primer_nombre} ${c.apellido_paterno}`.trim();
    }
    if (updatedUser.tipo === 'institucion' && updatedUser.institucion) {
      eventData.name = updatedUser.institucion.nombre_institucion;
    }
    await emitUserUpdated(eventData);
  }

  return updatedUser;
};

// RF-10 — Soft delete de cuenta propia
export const desactivarCuenta = async (credentialId: string) => {
  await userRepo().update({ credential_id: credentialId }, { is_active: false });
  // Notificar a ms-auth para que invalide la credencial en su BD local
  await emitUserDeleted(credentialId);
};

// Admin — Listar usuarios
export const listarUsuarios = async (filtros?: { rol?: string; is_active?: boolean }, callerRole?: string) => {
  const where: any = {};
  if (filtros?.rol) where.rol = filtros.rol;
  if (filtros?.is_active !== undefined) where.is_active = filtros.is_active;

  const users = await userRepo().find({
    where,
    relations: ['ciudadano', 'institucion'],
    order: { created_at: 'DESC' },
  });

  if (callerRole !== 'superadmin') {
    return users.filter(u => u.rol !== RolUsuario.SUPERADMIN);
  }
  return users;
};

// Admin — Ver usuario
export const verUsuario = async (userId: string, callerRole?: string) => {
  const user = await userRepo().findOne({
    where: { id: userId },
    relations: ['ciudadano', 'institucion'],
  });
  if (!user) throw new Error('Usuario no encontrado');
  if (callerRole !== undefined && callerRole !== 'superadmin' && user.rol === RolUsuario.SUPERADMIN) {
    const err: any = new Error('Acceso denegado');
    err.status = 403;
    throw err;
  }
  return user;
};

// Admin — Cambiar estado (activo/inactivo)
export const cambiarEstadoUsuario = async (userId: string, is_active: boolean, callerRole?: string) => {
  const user = await verUsuario(userId, callerRole);
  await userRepo().update({ id: userId }, { is_active });
  await emitUserUpdated({
    userId: user.credential_id,
    status: is_active ? 'active' : 'inactive',
  });
  return verUsuario(userId);
};

// Admin — Cambiar rol
export const cambiarRolUsuario = async (userId: string, rol: string, callerRole?: string) => {
  const user = await verUsuario(userId, callerRole);
  await userRepo().update({ id: userId }, { rol: rol as RolUsuario });
  await emitUserUpdated({
    userId: user.credential_id,
    role: rol,
  });
  return verUsuario(userId);
};

// Admin — Editar datos
export const editarDatosUsuario = async (userId: string, datos: any, callerRole?: string) => {
  const user = await verUsuario(userId, callerRole);

  const { telefono, region, comuna, primer_nombre, segundo_nombre, apellido_paterno, apellido_materno, direccion, nombre_institucion, razon_social } = datos;

  const datosUser: Partial<User> = {};
  if (telefono !== undefined) datosUser.telefono = telefono;
  if (region !== undefined) datosUser.region = region;
  if (comuna !== undefined) datosUser.comuna = comuna;
  if (Object.keys(datosUser).length > 0) {
    await userRepo().update({ id: userId }, datosUser);
  }

  if (user.tipo === 'ciudadano' && user.ciudadano) {
    const datosCiudadano: Partial<Ciudadano> = {};
    if (primer_nombre !== undefined) datosCiudadano.primer_nombre = primer_nombre;
    if (segundo_nombre !== undefined) datosCiudadano.segundo_nombre = segundo_nombre;
    if (apellido_paterno !== undefined) datosCiudadano.apellido_paterno = apellido_paterno;
    if (apellido_materno !== undefined) datosCiudadano.apellido_materno = apellido_materno;
    if (direccion !== undefined) datosCiudadano.direccion = direccion;
    if (Object.keys(datosCiudadano).length > 0) {
      await AppDataSource.getRepository(Ciudadano).update({ id: user.ciudadano.id }, datosCiudadano);
    }
  }

  if (user.tipo === 'institucion' && user.institucion) {
    const datosInstitucion: Partial<Institucion> = {};
    if (nombre_institucion !== undefined) datosInstitucion.nombre_institucion = nombre_institucion;
    if (razon_social !== undefined) datosInstitucion.razon_social = razon_social;
    if (direccion !== undefined) datosInstitucion.direccion = direccion;
    if (Object.keys(datosInstitucion).length > 0) {
      await AppDataSource.getRepository(Institucion).update({ id: user.institucion.id }, datosInstitucion);
    }
  }

  const updated = await verUsuario(userId);
  const eventData: Parameters<typeof emitUserUpdated>[0] = { userId: user.credential_id };
  if (updated.tipo === 'ciudadano' && updated.ciudadano) {
    const c = updated.ciudadano;
    eventData.name = `${c.primer_nombre} ${c.apellido_paterno}`.trim();
  }
  if (updated.tipo === 'institucion' && updated.institucion) {
    eventData.name = updated.institucion.nombre_institucion;
  }
  await emitUserUpdated(eventData);

  return updated;
};

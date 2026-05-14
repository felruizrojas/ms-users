import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/db';
import { User, RolUsuario, TipoUsuario } from '../models/User';
import { Ciudadano } from '../models/Ciudadano';
import { Institucion, TipoInstitucion } from '../models/Institucion';
import { validarDigitoVerificador } from '../utils/validarDigitoVerificador';
import { emitUserRegistered } from '../events/event-emitter.service';

const userRepo = () => AppDataSource.getRepository(User);
const ciudadanoRepo = () => AppDataSource.getRepository(Ciudadano);
const institucionRepo = () => AppDataSource.getRepository(Institucion);

// Factory Method — crea el tipo correcto según el tipo de registro
export const UserFactory = {

  async crearCiudadano(datos: {
    email: string;
    password: string;
    telefono: string;
    region: string;
    comuna: string;
    primer_nombre: string;
    segundo_nombre?: string;
    apellido_paterno: string;
    apellido_materno?: string;
    run: string;
    direccion: string;
    foto_perfil?: string;
  }) {
    if (!validarDigitoVerificador(datos.run)) throw new Error('RUN inválido');

    const credentialId = uuidv4();
    const passwordHash = await bcrypt.hash(datos.password, 10);

    const user = userRepo().create({
      credential_id: credentialId,
      email: datos.email.toLowerCase(),
      telefono: datos.telefono,
      region: datos.region,
      comuna: datos.comuna,
      foto_perfil: datos.foto_perfil,
      rol: RolUsuario.CIUDADANO,
      tipo: TipoUsuario.CIUDADANO,
    });

    try {
      await userRepo().save(user);
    } catch (e: any) {
      if (e.code === '23505') throw new Error('El correo ya está registrado');
      throw e;
    }

    const ciudadano = ciudadanoRepo().create({
      user,
      primer_nombre: datos.primer_nombre,
      segundo_nombre: datos.segundo_nombre,
      apellido_paterno: datos.apellido_paterno,
      apellido_materno: datos.apellido_materno,
      run: datos.run,
      direccion: datos.direccion,
    });
    await ciudadanoRepo().save(ciudadano);

    const name = `${datos.primer_nombre} ${datos.apellido_paterno}`.trim();
    try {
      await emitUserRegistered({
        userId: credentialId,
        email: datos.email,
        passwordHash,
        role: RolUsuario.CIUDADANO,
        permissions: [],
        name,
        avatarUrl: datos.foto_perfil,
        tipo: 'ciudadano',
        telefono: datos.telefono,
        region: datos.region,
        comuna: datos.comuna,
        primer_nombre: datos.primer_nombre,
        segundo_nombre: datos.segundo_nombre,
        apellido_paterno: datos.apellido_paterno,
        apellido_materno: datos.apellido_materno,
        run: datos.run,
        direccion: datos.direccion,
      });
    } catch (eventErr) {
      // Si el evento falla ms-auth no crea la credencial — revertir para mantener consistencia
      await ciudadanoRepo().delete({ id: ciudadano.id });
      await userRepo().delete({ id: user.id });
      throw new Error('Error al sincronizar con el servicio de autenticación. Intenta nuevamente.');
    }

    return { user, ciudadano };
  },

  async crearInstitucion(datos: {
    email: string;
    password: string;
    telefono: string;
    region: string;
    comuna: string;
    nombre_institucion: string;
    razon_social: string;
    rut: string;
    tipo_institucion: TipoInstitucion;
    direccion: string;
    foto_perfil?: string;
  }) {
    if (!validarDigitoVerificador(datos.rut)) throw new Error('RUT inválido');

    if (datos.tipo_institucion !== TipoInstitucion.VETERINARIA && datos.tipo_institucion !== TipoInstitucion.MUNICIPALIDAD) {
      throw new Error('Tipo de institución inválido');
    }

    const rol = datos.tipo_institucion === TipoInstitucion.VETERINARIA
      ? RolUsuario.VETERINARIA
      : RolUsuario.MUNICIPALIDAD;

    const credentialId = uuidv4();
    const passwordHash = await bcrypt.hash(datos.password, 10);

    const user = userRepo().create({
      credential_id: credentialId,
      email: datos.email.toLowerCase(),
      telefono: datos.telefono,
      region: datos.region,
      comuna: datos.comuna,
      foto_perfil: datos.foto_perfil,
      rol,
      tipo: TipoUsuario.INSTITUCION,
    });

    try {
      await userRepo().save(user);
    } catch (e: any) {
      if (e.code === '23505') throw new Error('El correo ya está registrado');
      throw e;
    }

    const institucion = institucionRepo().create({
      user,
      nombre_institucion: datos.nombre_institucion,
      razon_social: datos.razon_social,
      rut: datos.rut,
      tipo_institucion: datos.tipo_institucion,
      direccion: datos.direccion,
    });
    await institucionRepo().save(institucion);

    try {
      await emitUserRegistered({
        userId: credentialId,
        email: datos.email,
        passwordHash,
        role: rol,
        permissions: [],
        name: datos.nombre_institucion,
        avatarUrl: datos.foto_perfil,
        tipo: 'institucion',
        telefono: datos.telefono,
        region: datos.region,
        comuna: datos.comuna,
        razon_social: datos.razon_social,
        rut: datos.rut,
        tipo_institucion: datos.tipo_institucion,
        direccion: datos.direccion,
      });
    } catch (eventErr) {
      await institucionRepo().delete({ id: institucion.id });
      await userRepo().delete({ id: user.id });
      throw new Error('Error al sincronizar con el servicio de autenticación. Intenta nuevamente.');
    }

    return { user, institucion };
  },
};

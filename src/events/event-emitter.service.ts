import { userEventsQueue } from '../config/redis';

export interface UserRegisteredPayload {
  event: 'user.registered';
  userId: string;
  email: string;
  passwordHash: string;
  role: string;
  permissions: string[];
  name: string;
  avatarUrl?: string;
  tipo: 'ciudadano' | 'institucion';
  telefono: string;
  region: string;
  comuna: string;
  // Ciudadano
  primer_nombre?: string;
  segundo_nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  run?: string;
  direccion?: string;
  // Institución
  razon_social?: string;
  rut?: string;
  tipo_institucion?: string;
  timestamp: Date;
}

export interface UserUpdatedPayload {
  event: 'user.updated';
  userId: string;
  email?: string;
  role?: string;
  permissions?: string[];
  name?: string;
  avatarUrl?: string;
  status?: 'active' | 'inactive';
  telefono?: string;
  region?: string;
  comuna?: string;
  primer_nombre?: string;
  segundo_nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  direccion?: string;
  razon_social?: string;
  timestamp?: Date;
}

export interface UserDeletedPayload {
  event: 'user.deleted';
  userId: string;
  timestamp: Date;
}

export interface UserPasswordChangedPayload {
  event: 'user.password.changed';
  userId: string;
  passwordHash: string;
  timestamp: Date;
}

export const emitUserRegistered = async (data: Omit<UserRegisteredPayload, 'event' | 'timestamp'>): Promise<void> => {
  const payload: UserRegisteredPayload = { ...data, event: 'user.registered', timestamp: new Date() };
  try {
    await userEventsQueue.add('user.registered', payload);
    console.log(`[event-emitter] user.registered emitido para userId=${data.userId}`);
  } catch (err: any) {
    console.error(`[event-emitter] Falló emisión user.registered para userId=${data.userId}: ${err.message}`);
    // No relanzar: la operación local (BD de ms-users) ya fue exitosa.
    // El evento se perderá si Redis no está disponible; en producción Redis debe ser HA.
  }
};

export const emitUserUpdated = async (data: Omit<UserUpdatedPayload, 'event' | 'timestamp'>): Promise<void> => {
  const payload: UserUpdatedPayload = { ...data, event: 'user.updated', timestamp: new Date() };
  try {
    await userEventsQueue.add('user.updated', payload);
    console.log(`[event-emitter] user.updated emitido para userId=${data.userId}`);
  } catch (err: any) {
    console.error(`[event-emitter] Falló emisión user.updated para userId=${data.userId}: ${err.message}`);
  }
};

export const emitUserDeleted = async (userId: string): Promise<void> => {
  const payload: UserDeletedPayload = { userId, event: 'user.deleted', timestamp: new Date() };
  try {
    await userEventsQueue.add('user.deleted', payload);
    console.log(`[event-emitter] user.deleted emitido para userId=${userId}`);
  } catch (err: any) {
    console.error(`[event-emitter] Falló emisión user.deleted para userId=${userId}: ${err.message}`);
  }
};

export const emitUserPasswordChanged = async (userId: string, passwordHash: string): Promise<void> => {
  const payload: UserPasswordChangedPayload = {
    userId,
    passwordHash,
    event: 'user.password.changed',
    timestamp: new Date(),
  };
  try {
    await userEventsQueue.add('user.password.changed', payload);
    console.log(`[event-emitter] user.password.changed emitido para userId=${userId}`);
  } catch (err: any) {
    console.error(`[event-emitter] Falló emisión user.password.changed para userId=${userId}: ${err.message}`);
  }
};

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
  timestamp: Date;
}

export interface UserDeletedPayload {
  event: 'user.deleted';
  userId: string;
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

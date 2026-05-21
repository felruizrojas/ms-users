import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/db';
import { User } from '../models/User';
import { PasswordResetOtp } from '../models/PasswordResetOtp';
import { sendOtpEmail } from '../utils/mailer';
import { emitUserPasswordChanged } from '../events/event-emitter.service';

const userRepo = () => AppDataSource.getRepository(User);
const otpRepo = () => AppDataSource.getRepository(PasswordResetOtp);

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutos

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Cambiar contraseña del usuario autenticado
export const changePassword = async (
  credentialId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> => {
  const user = await userRepo().findOne({ where: { credential_id: credentialId, is_active: true } });
  if (!user) throw new Error('Usuario no encontrado');

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw Object.assign(new Error('La contraseña actual es incorrecta'), { status: 400 });

  const password_hash = await bcrypt.hash(newPassword, 10);
  await userRepo().update({ credential_id: credentialId }, { password_hash });

  // Sincronizar la réplica en ms-auth vía broker
  await emitUserPasswordChanged(credentialId, password_hash);

  return { message: 'Contraseña actualizada correctamente' };
};

// Paso 1 — Solicitar OTP (respuesta genérica por seguridad)
export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  email = email.toLowerCase();
  const user = await userRepo().findOne({ where: { email, is_active: true } });

  if (user) {
    await otpRepo().delete({ email });
    const otp = otpRepo().create({
      email,
      code: generateOtpCode(),
      expires_at: new Date(Date.now() + OTP_TTL_MS),
      used: false,
    });
    await otpRepo().save(otp);
    await sendOtpEmail(email, otp.code);
  }

  return { message: 'Si el correo está registrado, recibirás un código de verificación' };
};

// Paso 2 — Verificar OTP y cambiar contraseña
export const resetPassword = async (
  email: string,
  code: string,
  newPassword: string,
): Promise<{ message: string }> => {
  email = email.toLowerCase();

  const otp = await otpRepo().findOne({ where: { email, code, used: false } });
  if (!otp) throw Object.assign(new Error('Código inválido'), { status: 400 });

  if (otp.expires_at <= new Date()) {
    await otpRepo().delete({ id: otp.id });
    throw Object.assign(new Error('Código expirado'), { status: 400 });
  }

  await otpRepo().delete({ id: otp.id });

  const user = await userRepo().findOne({ where: { email, is_active: true } });
  if (!user) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });

  const password_hash = await bcrypt.hash(newPassword, 10);
  await userRepo().update({ email }, { password_hash });

  // Sincronizar la réplica en ms-auth vía broker
  await emitUserPasswordChanged(user.credential_id, password_hash);

  return { message: 'Contraseña actualizada correctamente' };
};

import { Request, Response } from 'express';
import * as PasswordService from '../services/password.service';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../middlewares/verifyToken';

// PATCH /perfil/password — Cambiar contraseña del usuario autenticado
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      errorResponse(res, 'Contraseña actual y nueva contraseña requeridas');
      return;
    }
    if (newPassword.length < 6) {
      errorResponse(res, 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    const data = await PasswordService.changePassword(req.user!.id, currentPassword, newPassword);
    successResponse(res, data);
  } catch (err: any) {
    errorResponse(res, err.message, err.status ?? 400);
  }
};

// POST /forgot-password — Solicitar OTP
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      errorResponse(res, 'Email requerido');
      return;
    }
    const data = await PasswordService.forgotPassword(email);
    successResponse(res, data);
  } catch (err: any) {
    errorResponse(res, err.message, err.status ?? 400);
  }
};

// PATCH /reset-password — Verificar OTP y cambiar contraseña
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      errorResponse(res, 'Email, código y nueva contraseña requeridos');
      return;
    }
    if (newPassword.length < 6) {
      errorResponse(res, 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    const data = await PasswordService.resetPassword(email, code, newPassword);
    successResponse(res, data);
  } catch (err: any) {
    errorResponse(res, err.message, err.status ?? 400);
  }
};

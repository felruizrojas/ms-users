import { Response, NextFunction } from 'express';
import { AuthRequest } from './verifyToken';

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ ok: false, message: 'No tienes permisos para realizar esta acción' });
      return;
    }
    next();
  };
};

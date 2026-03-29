import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type Role = 'general_manager' | 'local_manager' | 'nutritionist' | 'technician';

export type AuthenticatedRequest = Request & {
  auth: {
    professionalId: string;
    hospitalId: string;
    role: string;
    registrationNumber: string;
  };
};

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('[security] JWT_SECRET environment variable is required.');
  }
  return secret;
};

/**
 * Middleware que exige um token JWT válido no header Authorization.
 * Popula req.auth com os dados do token verificado.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.header('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Autenticação necessária' });
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      professionalId: string;
      hospitalId: string;
      role: string;
      registrationNumber: string;
    };

    (req as AuthenticatedRequest).auth = {
      professionalId: decoded.professionalId,
      hospitalId: decoded.hospitalId,
      role: decoded.role,
      registrationNumber: decoded.registrationNumber,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
      return;
    }
    res.status(401).json({ error: 'Token inválido' });
  }
}

/**
 * Middleware que exige que o usuário autenticado tenha um dos papéis especificados.
 * Deve ser usado APÓS requireAuth.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = (req as AuthenticatedRequest).auth;
    if (!auth) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }
    if (!roles.includes(auth.role as Role)) {
      res.status(403).json({ error: 'Permissão insuficiente' });
      return;
    }
    next();
  };
}

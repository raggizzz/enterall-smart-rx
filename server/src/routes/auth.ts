import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import prisma from '../lib/prisma';
import { loginSchema, validateBody } from '../lib/schemas';
import { getRequiredEnv } from '../lib/env';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 10,                 // máx 10 tentativas por IP
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
});

const getJwtSecret = (): string => {
  return getRequiredEnv('JWT_SECRET', '[security] JWT_SECRET environment variable is required. Set it in your .env file.');
};

const getRefreshJwtSecret = (): string => {
  return process.env.JWT_REFRESH_SECRET?.trim() || getJwtSecret();
};

const ACCESS_TOKEN_TTL = '24h';
const REFRESH_TOKEN_TTL = '30d';

type AuthProfessional = {
  id: string;
  name: string;
  role: string;
  hospitalId: string | null;
  registrationNumber: string;
};

const getActiveHospital = async (hospitalId: string) => prisma.hospital.findFirst({
  where: {
    id: hospitalId,
    isActive: true,
  },
  select: { id: true, name: true },
});

const findProfessionalForHospital = async (
  professionalId: string,
  registrationNumber: string,
  role: string,
  hospitalId: string,
) => {
  if (role === 'general_manager') {
    return prisma.professional.findFirst({
      where: {
        id: professionalId,
        registrationNumber,
        role,
        isActive: true,
      },
    });
  }

  return prisma.professional.findFirst({
    where: {
      id: professionalId,
      hospitalId,
      registrationNumber,
      role,
      isActive: true,
    },
  });
};

const buildTokenPayload = (professional: AuthProfessional, hospitalId: string) => ({
  professionalId: professional.id,
  hospitalId,
  role: professional.role,
  registrationNumber: professional.registrationNumber,
});

const buildAuthResponse = (professional: AuthProfessional, hospitalId: string) => {
  const payload = buildTokenPayload(professional, hospitalId);
  const accessToken = jwt.sign(
    { ...payload, tokenType: 'access' },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_TTL },
  );
  const refreshToken = jwt.sign(
    { ...payload, tokenType: 'refresh' },
    getRefreshJwtSecret(),
    { expiresIn: REFRESH_TOKEN_TTL },
  );

  return {
    user: {
      id: professional.id,
      name: professional.name,
      role: professional.role,
      hospitalId,
      registrationNumber: professional.registrationNumber,
    },
    session: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  };
};

router.post('/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
    try {
        const { hospitalId, identifier, password, role } = req.body || {};

        if (!hospitalId || !identifier || !password || !role) {
            res.status(400).json({ error: 'Missing credentials' });
            return;
        }

        const hospital = await getActiveHospital(hospitalId);
        if (!hospital) {
            res.status(404).json({ error: 'Hospital not found' });
            return;
        }

        const professional = await prisma.professional.findFirst({
            where: {
                registrationNumber: identifier,
                role,
                isActive: true,
                ...(role === 'general_manager' ? {} : { hospitalId }),
            },
        });

        if (!professional) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        if (!professional.passwordHash) {
            res.status(403).json({ error: 'Password not configured' });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, professional.passwordHash);
        if (!isPasswordValid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        res.json(buildAuthResponse(professional, hospitalId));
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

router.post('/refresh', async (req, res) => {
    try {
        const refreshToken =
            typeof req.body?.refresh_token === 'string'
                ? req.body.refresh_token
                : typeof req.body?.refreshToken === 'string'
                    ? req.body.refreshToken
                    : '';

        if (!refreshToken) {
            res.status(400).json({ error: 'Refresh token is required' });
            return;
        }

        const decoded = jwt.verify(refreshToken, getRefreshJwtSecret()) as {
            professionalId: string;
            hospitalId: string;
            role: string;
            registrationNumber: string;
            tokenType?: string;
        };

        if (decoded.tokenType !== 'refresh') {
            res.status(401).json({ error: 'Invalid refresh token' });
            return;
        }

        const hospital = await getActiveHospital(decoded.hospitalId);
        if (!hospital) {
            res.status(401).json({ error: 'Session refresh denied' });
            return;
        }

        const professional = await findProfessionalForHospital(
            decoded.professionalId,
            decoded.registrationNumber,
            decoded.role,
            decoded.hospitalId,
        );

        if (!professional) {
            res.status(401).json({ error: 'Session refresh denied' });
            return;
        }

        res.json(buildAuthResponse(professional, decoded.hospitalId));
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Refresh session expired. Please log in again.' });
            return;
        }

        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

router.post('/switch-hospital', async (req, res) => {
    try {
        const authorization = req.header('authorization');
        if (!authorization?.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Autenticação necessária' });
            return;
        }

        const token = authorization.slice('Bearer '.length).trim();
        const decoded = jwt.verify(token, getJwtSecret()) as {
            professionalId: string;
            hospitalId: string;
            role: string;
            registrationNumber: string;
            tokenType?: string;
        };

        if (decoded.tokenType !== 'access') {
            res.status(401).json({ error: 'Token inválido' });
            return;
        }

        if (decoded.role !== 'general_manager') {
            res.status(403).json({ error: 'Permissão insuficiente' });
            return;
        }

        const hospitalId =
            typeof req.body?.hospitalId === 'string'
                ? req.body.hospitalId.trim()
                : '';

        if (!hospitalId) {
            res.status(400).json({ error: 'Hospital scope is required' });
            return;
        }

        const hospital = await getActiveHospital(hospitalId);
        if (!hospital) {
            res.status(404).json({ error: 'Hospital not found' });
            return;
        }

        const professional = await findProfessionalForHospital(
            decoded.professionalId,
            decoded.registrationNumber,
            decoded.role,
            hospitalId,
        );

        if (!professional) {
            res.status(401).json({ error: 'Hospital switch denied' });
            return;
        }

        res.json(buildAuthResponse(professional, hospitalId));
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
            return;
        }

        res.status(401).json({ error: 'Token inválido' });
    }
});

export default router;

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import prisma from '../lib/prisma';
import { loginSchema, validateBody } from '../lib/schemas';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 10,                 // máx 10 tentativas por IP
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
});

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('[security] JWT_SECRET environment variable is required. Set it in your .env file.');
  }
  return secret;
};

router.post('/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
    try {
        const { hospitalId, identifier, password, role } = req.body || {};

        if (!hospitalId || !identifier || !password || !role) {
            res.status(400).json({ error: 'Missing credentials' });
            return;
        }

        const professional = await prisma.professional.findFirst({
            where: {
                hospitalId,
                registrationNumber: identifier,
                role,
                isActive: true,
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

        const token = jwt.sign(
            {
                professionalId: professional.id,
                hospitalId,
                role: professional.role,
                registrationNumber: professional.registrationNumber,
            },
            getJwtSecret(),
            { expiresIn: '24h' },
        );

        res.json({
            user: {
                id: professional.id,
                name: professional.name,
                role: professional.role,
                hospitalId,
                registrationNumber: professional.registrationNumber,
            },
            session: { access_token: token },
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

export default router;

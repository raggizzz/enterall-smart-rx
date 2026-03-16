import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'clinical-secret-key-super-secure';

router.post('/login', async (req, res) => {
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
            JWT_SECRET,
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

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './lib/prisma';
import {
    databaseHealth,
    getMetrics,
    getMetricsContentType,
    httpRequestBytesTotal,
    httpRequestDurationSeconds,
    httpRequestsTotal,
    httpResponseBytesTotal,
    refreshApplicationMetrics,
} from './lib/metrics';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import prescriptionRoutes from './routes/prescriptions';
import formulaRoutes from './routes/formulas';
import evolutionRoutes from './routes/evolutions';
import wardRoutes from './routes/wards';
import hospitalRoutes from './routes/hospitals';
import settingRoutes from './routes/settings';
import moduleRoutes from './routes/modules';
import supplyRoutes from './routes/supplies';
import professionalRoutes from './routes/professionals';
import clinicRoutes from './routes/clinics';
import rolePermissionRoutes from './routes/role-permissions';
import appToolRoutes from './routes/app-tools';

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    if (req.path === '/metrics') {
        next();
        return;
    }

    const startedAt = process.hrtime.bigint();
    const requestBytes = Number(req.get('content-length') || 0);
    res.on('finish', () => {
        const route = req.route?.path
            ? `${req.baseUrl || ''}${req.route.path}`
            : req.path;
        const statusCode = String(res.statusCode);
        const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
        const responseBytes = Number(res.getHeader('content-length') || 0);

        httpRequestsTotal.inc({
            method: req.method,
            route,
            status_code: statusCode,
        });
        httpRequestBytesTotal.inc({
            method: req.method,
            route,
            status_code: statusCode,
        }, Number.isFinite(requestBytes) ? requestBytes : 0);
        httpResponseBytesTotal.inc({
            method: req.method,
            route,
            status_code: statusCode,
        }, Number.isFinite(responseBytes) ? responseBytes : 0);
        httpRequestDurationSeconds.observe({
            method: req.method,
            route,
            status_code: statusCode,
        }, durationSeconds);
    });
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/formulas', formulaRoutes);
app.use('/api/evolutions', evolutionRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/supplies', supplyRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/role-permissions', rolePermissionRoutes);
app.use('/api/app-tools', appToolRoutes);

// Basic health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'EnterAll Smart RX Local Backend Running' });
});

app.get('/health/live', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/health/ready', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        databaseHealth.set(1);
        res.json({ status: 'ready', database: 'ok' });
    } catch (error) {
        databaseHealth.set(0);
        res.status(503).json({ status: 'not_ready', database: 'error' });
    }
});

app.get('/metrics', async (req, res) => {
    try {
        try {
            await prisma.$queryRaw`SELECT 1`;
            databaseHealth.set(1);
            await refreshApplicationMetrics(prisma);
        } catch {
            databaseHealth.set(0);
        }

        res.set('Content-Type', getMetricsContentType());
        res.end(await getMetrics());
    } catch (error) {
        res.status(500).end('metrics_error');
    }
});

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});

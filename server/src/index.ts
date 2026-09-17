import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { prisma } from './config/prisma';

import auditRoutes from './routes/auditRoutes';
import authRoutes from './routes/authRoutes';
import floorRoutes from './routes/floorRoutes';
import garageRoutes from './routes/garageRoutes';
import ratePolicyRoutes from './routes/ratePolicyRoutes';
import reportRoutes from './routes/reportRoutes';
import spotRoutes from './routes/spotRoutes';
import ticketRoutes from './routes/ticketRoutes';
import vehicleRoutes from './routes/vehicleRoutes';

export const app = express();
const port = Number(process.env.PORT || 5000);

const validateEnvironment = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
  if (!process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'change_me_in_production')) {
    throw new Error('JWT_SECRET must be configured. Production must use a non-default value.');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.');
};

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.disable('x-powered-by');

app.use('/api/auth', authRoutes);
app.use('/api/garages', garageRoutes);
app.use('/api/floors', floorRoutes);
app.use('/api/spots', spotRoutes);
app.use('/api/rate-policies', ratePolicyRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'parking-garage-server' });
});

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof SyntaxError) {
    res.status(400).json({ message: 'Malformed JSON request body.' });
    return;
  }
  console.error(error);
  res.status(500).json({ message: 'Internal server error.' });
});

const startServer = async () => {
  validateEnvironment();
  await prisma.$connect();
  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down.`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
};

void startServer().catch(async (error) => {
  console.error('Server startup failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});

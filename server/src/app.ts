import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { registerSocketHandlers } from './sockets/index.js';
import { TimerService } from './services/timer.service.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import contestRoutes from './routes/contest.routes.js';
import submissionRoutes from './routes/submission.routes.js';
import teamRoutes from './routes/team.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import violationRoutes from './routes/violation.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  },
});

// Middleware stack
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows monaco editor CDN and inline workers
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'CODEBREAK API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/rounds', contestRoutes);
app.use('/api', contestRoutes);
app.use('/api', submissionRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/violations', violationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Initialize Real-time Sockets & Authoritative Server Timer
registerSocketHandlers(io);
TimerService.initialize(io);

// Start HTTP & Socket server
if (process.env.NODE_ENV !== 'test') {
  const PORT = parseInt(env.PORT, 10) || 5000;
  server.listen(PORT, () => {
    logger.info(`⚡ CODEBREAK server running on port ${PORT}`, 'ServerInit', {
      port: PORT,
      nodeEnv: env.NODE_ENV,
      clientUrl: env.CLIENT_URL,
    });
  });
}

export { app, server, io };

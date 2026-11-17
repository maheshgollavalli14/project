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
import leaderboardRoutes from './routes/leaderboard.routes.js';
import violationRoutes from './routes/violation.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();
const server = http.createServer(app);

// Allowed production & development origins
const VERIFIED_PRODUCTION_ORIGIN = 'https://client-rho-eosin.vercel.app';

const ALLOWED_ORIGINS = [
  VERIFIED_PRODUCTION_ORIGIN,
  env.CLIENT_URL,
].filter(Boolean);

const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
];

/**
 * Validates whether an incoming HTTP/WebSocket Origin header is permitted.
 */
export function isOriginAllowed(origin?: string): boolean {
  // Allow non-browser requests (server-to-server, curl, health checks, tools)
  if (!origin) return true;

  // Explicit match against verified production origin or configured CLIENT_URL
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  // Allow Vercel preview and deployment URLs (*.vercel.app)
  if (/^https:\/\/([a-zA-Z0-9-]+\.)*vercel\.app$/.test(origin)) return true;

  // Allow local development origins
  if (DEV_ORIGINS.includes(origin)) return true;

  return false;
}

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      // Echo the exact origin when credentials: true
      callback(null, origin || true);
    } else {
      logger.warn(`Blocked by CORS: origin ${origin}`, 'CORS');
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cookie',
  ],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours preflight cache
  optionsSuccessStatus: 204,
};

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, origin || true);
      } else {
        callback(new Error('Origin not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  },
});

// Middleware stack
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows monaco editor CDN and inline workers
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS middleware & preflight handling
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Health Check & Root
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'CODEBREAK API',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
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
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`⚡ CODEBREAK server running on port ${PORT}`, 'ServerInit', {
      port: PORT,
      nodeEnv: env.NODE_ENV,
      clientUrl: env.CLIENT_URL,
    });
  });
}

export { app, server, io };

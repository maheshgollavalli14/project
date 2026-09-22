import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

export const executionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 runs per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Code execution rate limit exceeded. Please wait a moment before running again.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { env } from '../config/env.js';
import { Role } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  sessionId?: string;
}

const COOKIE_NAME = 'cb_access_token';

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '24h',
  });
}

export const generateToken = signToken;

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyTokenIgnoringExpiration(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET, { ignoreExpiration: true }) as TokenPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string): void {
  const isSecure = env.COOKIE_SECURE;
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  const isSecure = env.COOKIE_SECURE;
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    path: '/',
  });
}

export { COOKIE_NAME };

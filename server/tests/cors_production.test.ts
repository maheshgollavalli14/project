import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, isOriginAllowed } from '../src/app.js';

describe('CORS Configuration and Production Origin Validation', () => {
  const verifiedProductionOrigin = 'https://client-rho-eosin.vercel.app';
  const previewVercelOrigin = 'https://client-git-main-maheshgollavalli14.vercel.app';
  const renderOrigin = 'https://codebreak-backend.onrender.com';
  const localDevOrigin = 'http://localhost:5173';
  const disallowedOrigin = 'https://evil-attacker.example.com';

  it('validates allowed and disallowed origins correctly via isOriginAllowed', () => {
    expect(isOriginAllowed(verifiedProductionOrigin)).toBe(true);
    expect(isOriginAllowed(previewVercelOrigin)).toBe(true);
    expect(isOriginAllowed(renderOrigin)).toBe(true);
    expect(isOriginAllowed(localDevOrigin)).toBe(true);
    expect(isOriginAllowed(undefined)).toBe(true); // server-to-server / curl
    expect(isOriginAllowed(disallowedOrigin)).toBe(false);
  });

  it('handles OPTIONS preflight for /api/auth/login from verified Vercel origin', async () => {
    const res = await request(app)
      .options('/api/auth/login')
      .set('Origin', verifiedProductionOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(verifiedProductionOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['access-control-allow-methods']).toContain('POST');
    expect(res.headers['access-control-allow-headers']).toContain('Content-Type');
  });

  it('handles OPTIONS preflight for /api/auth/me from verified Vercel origin', async () => {
    const res = await request(app)
      .options('/api/auth/me')
      .set('Origin', verifiedProductionOrigin)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Authorization');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(verifiedProductionOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('handles OPTIONS preflight from Vercel preview deployments', async () => {
    const res = await request(app)
      .options('/api/auth/login')
      .set('Origin', previewVercelOrigin)
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(previewVercelOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('sets CORS response headers on GET /health when requested from Vercel origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', verifiedProductionOrigin);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('HEALTHY');
    expect(res.headers['access-control-allow-origin']).toBe(verifiedProductionOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('sets CORS response headers on root / when requested from Vercel origin', async () => {
    const res = await request(app)
      .get('/')
      .set('Origin', verifiedProductionOrigin);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('HEALTHY');
    expect(res.headers['access-control-allow-origin']).toBe(verifiedProductionOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('rejects CORS for disallowed origin on preflight OPTIONS', async () => {
    const res = await request(app)
      .options('/api/auth/login')
      .set('Origin', disallowedOrigin)
      .set('Access-Control-Request-Method', 'POST');

    // CORS middleware either returns error (500) or does not include Access-Control-Allow-Origin
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

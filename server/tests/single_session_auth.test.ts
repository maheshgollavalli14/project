import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import bcrypt from 'bcryptjs';
import { Role, ViolationType, Severity } from '@prisma/client';

describe('CODEBREAK Single-Session Authentication & Concurrent Login Prevention Suite', () => {
  const testParticipantAEmail = 'single_session_test_a@codebreak.dev';
  const testParticipantBEmail = 'single_session_test_b@codebreak.dev';
  const testAdminEmail = 'single_session_admin@codebreak.dev';
  const testPassword = 'Password@123';

  let participantAId: string;
  let participantBId: string;
  let adminId: string;

  beforeAll(async () => {
    // Clean up any test users
    await prisma.violation.deleteMany({
      where: {
        user: {
          email: { in: [testParticipantAEmail, testParticipantBEmail, testAdminEmail] },
        },
      },
    });
    await prisma.auditLog.deleteMany({
      where: {
        actorEmail: { in: [testParticipantAEmail, testParticipantBEmail, testAdminEmail] },
      },
    });
    await prisma.userSession.deleteMany({
      where: {
        user: {
          email: { in: [testParticipantAEmail, testParticipantBEmail, testAdminEmail] },
        },
      },
    });
    await prisma.profile.deleteMany({
      where: {
        user: {
          email: { in: [testParticipantAEmail, testParticipantBEmail, testAdminEmail] },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: [testParticipantAEmail, testParticipantBEmail, testAdminEmail] },
      },
    });

    const passwordHash = await bcrypt.hash(testPassword, 10);

    // Create Participant A
    const userA = await prisma.user.create({
      data: {
        email: testParticipantAEmail,
        passwordHash,
        role: Role.PARTICIPANT,
        profile: {
          create: {
            fullName: 'Test Participant A',
            college: 'Tech Institute A',
            phone: '1234567890',
            participantId: 'CB-TEST-A1',
          },
        },
      },
    });
    participantAId = userA.id;

    // Create Participant B
    const userB = await prisma.user.create({
      data: {
        email: testParticipantBEmail,
        passwordHash,
        role: Role.PARTICIPANT,
        profile: {
          create: {
            fullName: 'Test Participant B',
            college: 'Tech Institute B',
            phone: '1234567891',
            participantId: 'CB-TEST-B1',
          },
        },
      },
    });
    participantBId = userB.id;

    // Create Admin
    const admin = await prisma.user.create({
      data: {
        email: testAdminEmail,
        passwordHash,
        role: Role.ADMIN,
        profile: {
          create: {
            fullName: 'Test Admin',
            college: 'Admin Dept',
            phone: '1234567892',
            participantId: 'CB-TEST-ADM',
          },
        },
      },
    });
    adminId = admin.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.violation.deleteMany({
      where: {
        user: {
          email: { in: [testParticipantAEmail, testParticipantBEmail, testAdminEmail] },
        },
      },
    });
    await prisma.auditLog.deleteMany({
      where: {
        actorEmail: { in: [testParticipantAEmail, testParticipantBEmail, testAdminEmail] },
      },
    });
    await prisma.userSession.deleteMany({
      where: {
        user: {
          email: { in: [testParticipantAEmail, testParticipantBEmail, testAdminEmail] },
        },
      },
    });
    await prisma.profile.deleteMany({
      where: {
        user: {
          email: { in: [testParticipantAEmail, testParticipantBEmail, testAdminEmail] },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: [testParticipantAEmail, testParticipantBEmail, testAdminEmail] },
      },
    });
  });

  it('1. Participant logs in on Browser A -> active session created in database', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BrowserA')
      .send({
        email: testParticipantAEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.sessionId).toBeDefined();

    // Verify session in database
    const sessionInDb = await prisma.userSession.findUnique({
      where: { id: res.body.data.sessionId },
    });
    expect(sessionInDb).not.toBeNull();
    expect(sessionInDb?.userId).toBe(participantAId);
    expect(sessionInDb?.isActive).toBe(true);
    expect(sessionInDb?.revokedAt).toBeNull();
    expect(new Date(sessionInDb!.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('2. Concurrent login attempt on Browser B with same credentials -> REJECTED with 409 & exact message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X) BrowserB')
      .send({
        email: testParticipantAEmail,
        password: testPassword,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ACCOUNT_ALREADY_ACTIVE');
    expect(res.body.message).toBe('This account is already logged in on another device or browser.');

    // Verify that NO second active session was created
    const activeSessions = await prisma.userSession.findMany({
      where: {
        userId: participantAId,
        isActive: true,
      },
    });
    expect(activeSessions.length).toBe(1);
  });

  it('3. Rejected concurrent login logs anti-cheat MULTIPLE_LOGIN violation of CRITICAL severity in DB', async () => {
    const violations = await prisma.violation.findMany({
      where: {
        userId: participantAId,
        type: ViolationType.MULTIPLE_LOGIN,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(violations.length).toBeGreaterThanOrEqual(1);
    const latestViolation = violations[0];
    expect(latestViolation.severity).toBe(Severity.CRITICAL);

    const metadata = JSON.parse(latestViolation.metadata || '{}');
    expect(metadata.reason).toBe('Concurrent login attempt detected while active session exists');
    expect(metadata.userAgent).toContain('BrowserB');
    expect(metadata.existingSessionId).toBeDefined();

    // Verify AuditLog
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        actorId: participantAId,
        action: 'CONCURRENT_LOGIN_BLOCKED',
      },
    });
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
  });

  it('4. Browser A existing session remains active and uninterrupted', async () => {
    // Get the active session token for Browser A
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testParticipantAEmail, password: testPassword });
    // This second attempt should still be rejected!
    expect(loginRes.status).toBe(409);

    // Retrieve Browser A's session from DB to sign or use
    const session = await prisma.userSession.findFirst({
      where: { userId: participantAId, isActive: true },
    });
    expect(session).not.toBeNull();

    // Now test a protected endpoint using Browser A's session token
    // Let's perform a login when no session exists, or use the token from test 1
    // Let's verify through /api/auth/me
    const { signToken } = await import('../src/utils/jwt.js');
    const tokenBrowserA = signToken({
      userId: participantAId,
      email: testParticipantAEmail,
      role: Role.PARTICIPANT,
      sessionId: session!.id,
    });

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenBrowserA}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe(testParticipantAEmail);
  });

  it('5. Browser A explicitly logs out -> session is invalidated -> Browser B can now log in', async () => {
    const session = await prisma.userSession.findFirst({
      where: { userId: participantAId, isActive: true },
    });
    expect(session).not.toBeNull();

    const { signToken } = await import('../src/utils/jwt.js');
    const tokenBrowserA = signToken({
      userId: participantAId,
      email: testParticipantAEmail,
      role: Role.PARTICIPANT,
      sessionId: session!.id,
    });

    // Browser A calls logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${tokenBrowserA}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Verify session in DB is now inactive and revoked
    const updatedSession = await prisma.userSession.findUnique({
      where: { id: session!.id },
    });
    expect(updatedSession?.isActive).toBe(false);
    expect(updatedSession?.revokedAt).not.toBeNull();

    // Browser A's token should now be rejected on protected routes
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenBrowserA}`);
    expect(meRes.status).toBe(401);
    expect(meRes.body.code).toBe('SESSION_INVALID');

    // Now Browser B logs in with the same credentials -> MUST SUCCEED
    const loginBrowserB = await request(app)
      .post('/api/auth/login')
      .set('User-Agent', 'BrowserB-SecondAttempt')
      .send({
        email: testParticipantAEmail,
        password: testPassword,
      });

    expect(loginBrowserB.status).toBe(200);
    expect(loginBrowserB.body.success).toBe(true);
    expect(loginBrowserB.body.data.sessionId).toBeDefined();
    expect(loginBrowserB.body.data.sessionId).not.toBe(session!.id);
  });

  it('6. Expired session allows new login', async () => {
    // Manually mark Participant A's active session as expired in the past
    await prisma.userSession.updateMany({
      where: { userId: participantAId },
      data: {
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
    });

    // Login should succeed because previous session is expired
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testParticipantAEmail,
        password: testPassword,
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
  });

  it('7. Multiple independent participant accounts can log in concurrently without conflict', async () => {
    // Participant A already has an active session from test 6.
    // Now Participant B logs in -> should succeed without conflict!
    const loginBRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testParticipantBEmail,
        password: testPassword,
      });

    expect(loginBRes.status).toBe(200);
    expect(loginBRes.body.success).toBe(true);

    // Both Participant A and Participant B have active sessions
    const sessionA = await prisma.userSession.findFirst({
      where: { userId: participantAId, isActive: true, expiresAt: { gt: new Date() } },
    });
    const sessionB = await prisma.userSession.findFirst({
      where: { userId: participantBId, isActive: true, expiresAt: { gt: new Date() } },
    });

    expect(sessionA).not.toBeNull();
    expect(sessionB).not.toBeNull();
    expect(sessionA?.id).not.toBe(sessionB?.id);
  });

  it('8. Admin accounts also have single-session protection with concurrent session blocking', async () => {
    // First admin login
    const admin1 = await request(app)
      .post('/api/auth/login')
      .send({
        email: testAdminEmail,
        password: testPassword,
      });
    expect(admin1.status).toBe(200);

    // Second admin login attempt -> blocked with 409 ACCOUNT_ALREADY_ACTIVE
    const admin2 = await request(app)
      .post('/api/auth/login')
      .send({
        email: testAdminEmail,
        password: testPassword,
      });
    expect(admin2.status).toBe(409);
    expect(admin2.body.code).toBe('ACCOUNT_ALREADY_ACTIVE');
    expect(admin2.body.message).toBe('This account is already logged in on another device or browser.');
  });

  it('9. Logout with body { sessionId, userId } (no Authorization header) invalidates session and allows immediate re-login', async () => {
    // Clean any lingering sessions for Participant A
    await prisma.userSession.updateMany({
      where: { userId: participantAId, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    });

    // 1. Participant A logs in on Device A
    const loginA = await request(app)
      .post('/api/auth/login')
      .send({
        email: testParticipantAEmail,
        password: testPassword,
      });
    expect(loginA.status).toBe(200);
    const sessionIdA = loginA.body.data.sessionId;
    expect(sessionIdA).toBeDefined();

    // 2. Device B attempt is blocked
    const loginBBlocked = await request(app)
      .post('/api/auth/login')
      .send({
        email: testParticipantAEmail,
        password: testPassword,
      });
    expect(loginBBlocked.status).toBe(409);

    // 3. Device A calls logout passing only body { sessionId, userId }
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .send({
        sessionId: sessionIdA,
        userId: participantAId,
      });
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Verify DB session is inactive and revoked
    const sessionInDb = await prisma.userSession.findUnique({
      where: { id: sessionIdA },
    });
    expect(sessionInDb?.isActive).toBe(false);
    expect(sessionInDb?.revokedAt).not.toBeNull();

    // 4. Device A can immediately log in again
    const reLoginA = await request(app)
      .post('/api/auth/login')
      .send({
        email: testParticipantAEmail,
        password: testPassword,
      });
    expect(reLoginA.status).toBe(200);
    expect(reLoginA.body.data.sessionId).toBeDefined();
    expect(reLoginA.body.data.sessionId).not.toBe(sessionIdA);
  });

  it('10. Full lifecycle: Device A login -> Device B blocked -> Device A cookie logout -> Device B succeeds -> Device A blocked', async () => {
    // Clean any lingering sessions for Participant A
    await prisma.userSession.updateMany({
      where: { userId: participantAId, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    });

    // Step 1: Device A logs in
    const loginA = await request(app)
      .post('/api/auth/login')
      .send({
        email: testParticipantAEmail,
        password: testPassword,
      });
    expect(loginA.status).toBe(200);
    const sessionCookieA = loginA.headers['set-cookie'];
    const sessionIdA = loginA.body.data.sessionId;

    // Step 2: Device B tries to log in -> REJECTED 409
    const loginBAttempt1 = await request(app)
      .post('/api/auth/login')
      .send({
        email: testParticipantAEmail,
        password: testPassword,
      });
    expect(loginBAttempt1.status).toBe(409);
    expect(loginBAttempt1.body.code).toBe('ACCOUNT_ALREADY_ACTIVE');

    // Step 3: Device A logs out with cookie and body
    const logoutA = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', sessionCookieA)
      .send({ sessionId: sessionIdA, userId: participantAId });
    expect(logoutA.status).toBe(200);

    // Verify session A is inactive
    const sessionAInDb = await prisma.userSession.findUnique({ where: { id: sessionIdA } });
    expect(sessionAInDb?.isActive).toBe(false);
    expect(sessionAInDb?.revokedAt).not.toBeNull();

    // Step 4: Device B now logs in -> SUCCEEDS
    const loginBAttempt2 = await request(app)
      .post('/api/auth/login')
      .send({
        email: testParticipantAEmail,
        password: testPassword,
      });
    expect(loginBAttempt2.status).toBe(200);
    const sessionIdB = loginBAttempt2.body.data.sessionId;
    expect(sessionIdB).toBeDefined();
    expect(sessionIdB).not.toBe(sessionIdA);

    // Step 5: Device A tries to log in now while Device B is active -> REJECTED 409
    const loginAAttempt2 = await request(app)
      .post('/api/auth/login')
      .send({
        email: testParticipantAEmail,
        password: testPassword,
      });
    expect(loginAAttempt2.status).toBe(409);
    expect(loginAAttempt2.body.code).toBe('ACCOUNT_ALREADY_ACTIVE');
  });
});

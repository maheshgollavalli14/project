import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import bcrypt from 'bcryptjs';
import { Role, ParticipantRoundStatus } from '@prisma/client';

describe('CODEBREAK Permanent Round Submission Locking Test Suite', () => {
  const testParticipantEmail = 'round_lock_tester@codebreak.dev';
  const testAdminEmail = 'round_lock_admin@codebreak.dev';
  const testPassword = 'Password@123';

  let participantToken: string;
  let participantUserId: string;
  let adminToken: string;
  let adminUserId: string;

  let contestId: string;
  let round1Id: string;
  let round2Id: string;
  let round1QuestionId: string;
  let round2QuestionId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.savedCode.deleteMany({
      where: { user: { email: { in: [testParticipantEmail, testAdminEmail] } } },
    });
    await prisma.submission.deleteMany({
      where: { user: { email: { in: [testParticipantEmail, testAdminEmail] } } },
    });
    await prisma.participantRoundProgress.deleteMany({
      where: { user: { email: { in: [testParticipantEmail, testAdminEmail] } } },
    });
    await prisma.auditLog.deleteMany({
      where: { actorEmail: { in: [testParticipantEmail, testAdminEmail] } },
    });
    await prisma.userSession.deleteMany({
      where: { user: { email: { in: [testParticipantEmail, testAdminEmail] } } },
    });
    await prisma.profile.deleteMany({
      where: { user: { email: { in: [testParticipantEmail, testAdminEmail] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testParticipantEmail, testAdminEmail] } },
    });

    const passwordHash = await bcrypt.hash(testPassword, 10);

    // Create participant
    const partUser = await prisma.user.create({
      data: {
        email: testParticipantEmail,
        passwordHash,
        role: Role.PARTICIPANT,
        profile: {
          create: {
            fullName: 'Lock Test Participant',
            college: 'Coding University',
            phone: '9988776655',
            participantId: 'CB-LOCK-01',
          },
        },
      },
    });
    participantUserId = partUser.id;

    // Create admin
    const adminUser = await prisma.user.create({
      data: {
        email: testAdminEmail,
        passwordHash,
        role: Role.ADMIN,
        profile: {
          create: {
            fullName: 'Lock Test Admin',
            college: 'CODEBREAK HQ',
            phone: '9988776656',
            participantId: 'CB-LOCK-ADM',
          },
        },
      },
    });
    adminUserId = adminUser.id;

    // Set up or find active contest with active Round 1 and Round 2
    let contest = await prisma.contest.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: { questions: true },
        },
      },
    });

    if (!contest || contest.rounds.length < 2) {
      contest = await prisma.contest.create({
        data: {
          title: 'Lock Verification Contest',
          description: 'Testing final round locking',
          status: 'ACTIVE',
          rounds: {
            create: [
              {
                roundNumber: 1,
                title: 'Test Round 1',
                type: 'MCQ_OUTPUT_CODING',
                status: 'ACTIVE',
                startTime: new Date(Date.now() - 3600000),
                endTime: new Date(Date.now() + 7200000),
                durationMinutes: 45,
                questions: {
                  create: [
                    {
                      orderNumber: 1,
                      title: 'Q1 Round 1',
                      description: 'Sample MCQ',
                      type: 'MCQ',
                      points: 10,
                      options: {
                        create: [
                          { text: 'Option A', isCorrect: true, orderNumber: 1 },
                          { text: 'Option B', isCorrect: false, orderNumber: 2 },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                roundNumber: 2,
                title: 'Test Round 2',
                type: 'DEBUGGING_JUMBLED',
                status: 'ACTIVE',
                startTime: new Date(Date.now() - 3600000),
                endTime: new Date(Date.now() + 7200000),
                durationMinutes: 45,
                questions: {
                  create: [
                    {
                      orderNumber: 1,
                      title: 'Q1 Round 2',
                      description: 'Sample Debugging',
                      type: 'DEBUGGING',
                      points: 20,
                    },
                  ],
                },
              },
            ],
          },
        },
        include: {
          rounds: {
            orderBy: { roundNumber: 'asc' },
            include: { questions: true },
          },
        },
      });
    }

    contestId = contest.id;
    const r1 = contest.rounds.find((r) => r.roundNumber === 1)!;
    const r2 = contest.rounds.find((r) => r.roundNumber === 2)!;

    round1Id = r1.id;
    round2Id = r2.id;

    // Ensure rounds are ACTIVE
    await prisma.contestRound.update({
      where: { id: round1Id },
      data: { status: 'ACTIVE', startTime: new Date(Date.now() - 3600000), endTime: new Date(Date.now() + 7200000) },
    });
    await prisma.contestRound.update({
      where: { id: round2Id },
      data: { status: 'ACTIVE', startTime: new Date(Date.now() - 3600000), endTime: new Date(Date.now() + 7200000) },
    });

    // Ensure questions exist
    let q1 = await prisma.question.findFirst({ where: { roundId: round1Id } });
    if (!q1) {
      q1 = await prisma.question.create({
        data: {
          roundId: round1Id,
          orderNumber: 1,
          title: 'Q1 in R1',
          description: 'Sample Q',
          type: 'MCQ',
          points: 10,
        },
      });
    }
    round1QuestionId = q1.id;

    let q2 = await prisma.question.findFirst({ where: { roundId: round2Id } });
    if (!q2) {
      q2 = await prisma.question.create({
        data: {
          roundId: round2Id,
          orderNumber: 1,
          title: 'Q1 in R2',
          description: 'Sample Q2',
          type: 'DEBUGGING',
          points: 20,
        },
      });
    }
    round2QuestionId = q2.id;

    // Log in participant
    const partLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testParticipantEmail, password: testPassword });
    expect(partLogin.status).toBe(200);
    participantToken = partLogin.body.data.token;

    // Log in admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testAdminEmail, password: testPassword });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.token;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.savedCode.deleteMany({
      where: { user: { email: { in: [testParticipantEmail, testAdminEmail] } } },
    });
    await prisma.submission.deleteMany({
      where: { user: { email: { in: [testParticipantEmail, testAdminEmail] } } },
    });
    await prisma.participantRoundProgress.deleteMany({
      where: { user: { email: { in: [testParticipantEmail, testAdminEmail] } } },
    });
    await prisma.auditLog.deleteMany({
      where: { actorEmail: { in: [testParticipantEmail, testAdminEmail] } },
    });
    await prisma.userSession.deleteMany({
      where: { user: { email: { in: [testParticipantEmail, testAdminEmail] } } },
    });
    await prisma.profile.deleteMany({
      where: { user: { email: { in: [testParticipantEmail, testAdminEmail] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testParticipantEmail, testAdminEmail] } },
    });
  });

  it('1. Participant starts Round 1 -> can access round and questions', async () => {
    const res = await request(app)
      .get(`/api/rounds/${round1Id}`)
      .set('Authorization', `Bearer ${participantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.round.questions).toBeDefined();
    expect(res.body.data.round.questions.length).toBeGreaterThan(0);
    expect(res.body.data.round.isFinalized).toBe(false);
    expect(res.body.data.round.isLocked).toBe(false);

    // Verify DB progress state is IN_PROGRESS
    const progress = await prisma.participantRoundProgress.findUnique({
      where: {
        userId_roundId: {
          userId: participantUserId,
          roundId: round1Id,
        },
      },
    });
    expect(progress?.status).toBe(ParticipantRoundStatus.IN_PROGRESS);
    expect(progress?.startedAt).not.toBeNull();
  });

  it('2. Participant submits Round 1 -> Round 1 becomes locked in DB and response', async () => {
    const res = await request(app)
      .post(`/api/rounds/${round1Id}/finalize`)
      .set('Authorization', `Bearer ${participantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SUBMITTED');
    expect(res.body.data.isLocked).toBe(true);

    // Verify in DB that status is SUBMITTED
    const progress = await prisma.participantRoundProgress.findUnique({
      where: {
        userId_roundId: {
          userId: participantUserId,
          roundId: round1Id,
        },
      },
    });
    expect(progress?.status).toBe(ParticipantRoundStatus.SUBMITTED);
    expect(progress?.submittedAt).not.toBeNull();
    expect(progress?.lockedAt).not.toBeNull();
  });

  it('3. Browser refresh simulation -> accessing Round 1 returns 403 ROUND_LOCKED and hides questions', async () => {
    const res = await request(app)
      .get(`/api/rounds/${round1Id}`)
      .set('Authorization', `Bearer ${participantToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ROUND_LOCKED');
    expect(res.body.message).toBe('This round has already been submitted and is locked.');
    expect(res.body.isLocked).toBe(true);
    expect(res.body.data).toBeUndefined(); // NEVER exposes questions!
  });

  it('4. Logout & re-login -> Round 1 remains permanently locked', async () => {
    // 1. Participant logs out
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${participantToken}`);
    expect(logoutRes.status).toBe(200);

    // 2. Re-login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testParticipantEmail, password: testPassword });
    expect(loginRes.status).toBe(200);
    const newParticipantToken = loginRes.body.data.token;
    participantToken = newParticipantToken;

    // 3. Try to access Round 1 again
    const roundRes = await request(app)
      .get(`/api/rounds/${round1Id}`)
      .set('Authorization', `Bearer ${participantToken}`);

    expect(roundRes.status).toBe(403);
    expect(roundRes.body.code).toBe('ROUND_LOCKED');
  });

  it('5. Directly enter Round 1 URL / direct GET -> access rejected', async () => {
    const res = await request(app)
      .get(`/api/rounds/${round1Id}`)
      .set('Authorization', `Bearer ${participantToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ROUND_LOCKED');
  });

  it('6. Attempt API request to save code/answer on Round 1 question -> rejected with 403', async () => {
    const res = await request(app)
      .post(`/api/questions/${round1QuestionId}/save`)
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ code: 'print("cheat attempt")' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ROUND_LOCKED');
    expect(res.body.message).toBe('This round has already been submitted and is locked.');
  });

  it('7. Attempt API request to submit answer / code on Round 1 question -> rejected with 403', async () => {
    const res = await request(app)
      .post(`/api/questions/${round1QuestionId}/submit`)
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ code: 'print("cheat attempt")' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ROUND_LOCKED');
  });

  it('8. Attempt to submit Round 1 again (/finalize) -> rejected with 409 ROUND_ALREADY_SUBMITTED', async () => {
    const res = await request(app)
      .post(`/api/rounds/${round1Id}/finalize`)
      .set('Authorization', `Bearer ${participantToken}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ROUND_ALREADY_SUBMITTED');
    expect(res.body.message).toBe('This round has already been submitted and is locked.');
  });

  it('9. Round 2, which is active, remains fully accessible to the participant', async () => {
    const res = await request(app)
      .get(`/api/rounds/${round2Id}`)
      .set('Authorization', `Bearer ${participantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.round.questions).toBeDefined();
    expect(res.body.data.round.isLocked).toBe(false);

    // Can save answer in Round 2
    const saveRes = await request(app)
      .post(`/api/questions/${round2QuestionId}/save`)
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ code: 'def solve(): pass' });
    expect(saveRes.status).toBe(200);
  });

  it('10. Admin can still view Round 1 and all questions/results', async () => {
    const res = await request(app)
      .get(`/api/rounds/${round1Id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.round.questions.length).toBeGreaterThan(0);

    // Verify contest current endpoint reports Round 1 as locked for the participant
    const currentRes = await request(app)
      .get('/api/contests/current')
      .set('Authorization', `Bearer ${participantToken}`);

    expect(currentRes.status).toBe(200);
    const r1 = currentRes.body.data.contest.rounds.find((r: any) => r.id === round1Id);
    expect(r1.isLocked).toBe(true);
    expect(r1.isFinalized).toBe(true);
    expect(r1.participantStatus).toBe('SUBMITTED');
    expect(r1.isArenaOpen).toBe(false);
  });
});

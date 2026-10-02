import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import bcrypt from 'bcryptjs';
import { Role, ParticipantRoundStatus } from '@prisma/client';

describe('CODEBREAK Fullscreen Violation Policy & Automatic Submission Test Suite', () => {
  const testParticipantEmail = 'fullscreen_test_participant@codebreak.dev';
  const testAdminEmail = 'fullscreen_test_admin@codebreak.dev';
  const testPassword = 'Password@123';

  let participantToken: string;
  let participantUserId: string;
  let adminToken: string;
  let adminUserId: string;

  let contestId: string;
  let round1Id: string;
  let round2Id: string;
  let round1QuestionId: string;
  let round1Question2Id: string;
  let round2Question1Id: string;
  let round2Question2Id: string;
  let correctOptionId: string;

  beforeAll(async () => {
    // 1. Clean up test records
    await prisma.violation.deleteMany({
      where: { user: { email: { in: [testParticipantEmail, testAdminEmail] } } },
    });
    await prisma.savedCode.deleteMany({
      where: { user: { email: { in: [testParticipantEmail, testAdminEmail] } } },
    });
    await prisma.submission.deleteMany({
      where: { user: { email: { in: [testParticipantEmail, testAdminEmail] } } },
    });
    await prisma.score.deleteMany({
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
            fullName: 'Fullscreen Policy Participant',
            college: 'CODEBREAK Academy',
            phone: '9876543210',
            participantId: 'CB-FS-01',
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
            fullName: 'Fullscreen Policy Admin',
            college: 'CODEBREAK HQ',
            phone: '9876543211',
            participantId: 'CB-FS-ADM',
          },
        },
      },
    });
    adminUserId = adminUser.id;

    // Ensure contest with 2 active rounds exists
    let contest = await prisma.contest.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: { questions: { include: { options: true, testCases: true } } },
        },
      },
    });

    if (!contest || contest.rounds.length < 2) {
      contest = await prisma.contest.create({
        data: {
          title: 'Fullscreen Verification Contest',
          description: 'Testing fullscreen violation rules',
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
                      title: 'Q1 MCQ',
                      description: 'Sample MCQ',
                      type: 'MCQ',
                      points: 10,
                      options: {
                        create: [
                          { text: 'Correct A', isCorrect: true, orderNumber: 1 },
                          { text: 'Wrong B', isCorrect: false, orderNumber: 2 },
                        ],
                      },
                    },
                    {
                      orderNumber: 2,
                      title: 'Q2 Code',
                      description: 'Sample Coding',
                      type: 'CODING',
                      points: 20,
                      testCases: {
                        create: [
                          { input: '5', expectedOutput: '25', isPublic: true },
                          { input: '6', expectedOutput: '36', isPublic: false },
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
            include: { questions: { include: { options: true, testCases: true } } },
          },
        },
      });
    }

    contestId = contest.id;
    const r1 = contest.rounds.find((r) => r.roundNumber === 1)!;
    const r2 = contest.rounds.find((r) => r.roundNumber === 2)!;
    round1Id = r1.id;
    round2Id = r2.id;

    await prisma.contestRound.update({
      where: { id: round1Id },
      data: { status: 'ACTIVE', startTime: new Date(Date.now() - 3600000), endTime: new Date(Date.now() + 7200000) },
    });
    await prisma.contestRound.update({
      where: { id: round2Id },
      data: { status: 'ACTIVE', startTime: new Date(Date.now() - 3600000), endTime: new Date(Date.now() + 7200000) },
    });

    const r1Questions = await prisma.question.findMany({
      where: { roundId: round1Id },
      include: { options: true },
      orderBy: { orderNumber: 'asc' },
    });

    round1QuestionId = r1Questions[0].id;
    correctOptionId = r1Questions[0].options.find((o) => o.isCorrect)?.id || r1Questions[0].options[0]?.id;

    if (r1Questions.length > 1) {
      round1Question2Id = r1Questions[1].id;
    } else {
      const q2 = await prisma.question.create({
        data: {
          roundId: round1Id,
          orderNumber: 2,
          title: 'Q2 Code',
          description: 'Sample Coding',
          type: 'CODING',
          points: 20,
        },
      });
      round1Question2Id = q2.id;
    }

    // Setup Round 2 questions: Q1 to be modified, Q2 to remain unmodified starter code
    let r2Questions = await prisma.question.findMany({
      where: { roundId: round2Id },
      orderBy: { orderNumber: 'asc' },
    });

    if (r2Questions.length > 0) {
      await prisma.question.update({
        where: { id: r2Questions[0].id },
        data: {
          initialCode: 'def fix_me():\n    return False\n',
        },
      });
      round2Question1Id = r2Questions[0].id;
    } else {
      const q1 = await prisma.question.create({
        data: {
          roundId: round2Id,
          orderNumber: 1,
          title: 'Q1 Round 2',
          description: 'Sample Debugging',
          type: 'DEBUGGING',
          points: 20,
          initialCode: 'def fix_me():\n    return False\n',
        },
      });
      round2Question1Id = q1.id;
    }

    if (r2Questions.length > 1) {
      await prisma.question.update({
        where: { id: r2Questions[1].id },
        data: {
          initialCode: 'def untouched():\n    return 0\n',
        },
      });
      round2Question2Id = r2Questions[1].id;
    } else {
      const q2 = await prisma.question.create({
        data: {
          roundId: round2Id,
          orderNumber: 2,
          title: 'Q2 Round 2',
          description: 'Untouched Debugging',
          type: 'DEBUGGING',
          points: 20,
          initialCode: 'def untouched():\n    return 0\n',
        },
      });
      round2Question2Id = q2.id;
    }

    // Login participant
    const partLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testParticipantEmail, password: testPassword });
    expect(partLogin.status).toBe(200);
    participantToken = partLogin.body.data.token;

    // Login admin
    const admLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testAdminEmail, password: testPassword });
    expect(admLogin.status).toBe(200);
    adminToken = admLogin.body.data.token;
  });

  afterAll(async () => {
    await prisma.violation.deleteMany({
      where: { user: { email: { in: [testParticipantEmail, testAdminEmail] } } },
    });
    await prisma.savedCode.deleteMany({
      where: { user: { email: { in: [testParticipantEmail, testAdminEmail] } } },
    });
    await prisma.submission.deleteMany({
      where: { user: { email: { in: [testParticipantEmail, testAdminEmail] } } },
    });
    await prisma.score.deleteMany({
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

  it('1. Participant enters active Round 1 with 0 fullscreen exits', async () => {
    const res = await request(app)
      .get(`/api/rounds/${round1Id}`)
      .set('Authorization', `Bearer ${participantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.round.fullscreenExitCount).toBe(0);
    expect(res.body.data.round.isLocked).toBe(false);
    expect(res.body.data.round.isFinalized).toBe(false);
  });

  it('2. 1st fullscreen exit -> records violation #1, warningNumber: 1, round remains active', async () => {
    const res = await request(app)
      .post('/api/violations')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({
        contestId,
        roundId: round1Id,
        type: 'FULLSCREEN_EXIT',
        metadata: { message: 'Participant exited fullscreen mode' },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('FULLSCREEN_EXIT');
    expect(res.body.data.fullscreenExitCount).toBe(1);
    expect(res.body.data.warningNumber).toBe(1);
    expect(res.body.data.maxWarnings).toBe(2);
    expect(res.body.data.isAutoSubmitted).toBe(false);
    expect(res.body.data.isLocked).toBe(false);

    // Verify round is still active and unlocked
    const roundCheck = await request(app)
      .get(`/api/rounds/${round1Id}`)
      .set('Authorization', `Bearer ${participantToken}`);
    expect(roundCheck.status).toBe(200);
    expect(roundCheck.body.data.round.fullscreenExitCount).toBe(1);
    expect(roundCheck.body.data.round.isLocked).toBe(false);
  });

  it('3. Double-counting protection: rapid 2nd exit within 3s deduplicated (count remains 1)', async () => {
    const res = await request(app)
      .post('/api/violations')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({
        contestId,
        roundId: round1Id,
        type: 'FULLSCREEN_EXIT',
        metadata: { message: 'Duplicate browser event' },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fullscreenExitCount).toBe(1);
    expect(res.body.data.warningNumber).toBe(1);
    expect(res.body.data.isAutoSubmitted).toBe(false);
    expect(res.body.data.isLocked).toBe(false);
  });

  it('4. Participant answers question and saves draft state in workspace', async () => {
    // Save MCQ answer in draft
    const saveRes = await request(app)
      .post(`/api/questions/${round1QuestionId}/save`)
      .set('Authorization', `Bearer ${participantToken}`)
      .send({
        selectedOptionId: correctOptionId,
        markedForReview: false,
      });

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.success).toBe(true);
  });

  it('5. 2nd fullscreen exit -> records violation #2, warningNumber: 2, round remains active', async () => {
    // Update the timestamp of the first violation back in time so debounce window has passed
    await prisma.violation.updateMany({
      where: {
        userId: participantUserId,
        roundId: round1Id,
        type: 'FULLSCREEN_EXIT',
      },
      data: {
        createdAt: new Date(Date.now() - 5000),
      },
    });

    const res = await request(app)
      .post('/api/violations')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({
        contestId,
        roundId: round1Id,
        type: 'FULLSCREEN_EXIT',
        metadata: { message: 'Second fullscreen exit' },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fullscreenExitCount).toBe(2);
    expect(res.body.data.warningNumber).toBe(2);
    expect(res.body.data.maxWarnings).toBe(2);
    expect(res.body.data.isAutoSubmitted).toBe(false);
    expect(res.body.data.isLocked).toBe(false);

    // Verify round is still accessible
    const roundCheck = await request(app)
      .get(`/api/rounds/${round1Id}`)
      .set('Authorization', `Bearer ${participantToken}`);
    expect(roundCheck.status).toBe(200);
    expect(roundCheck.body.data.round.fullscreenExitCount).toBe(2);
    expect(roundCheck.body.data.round.isLocked).toBe(false);
  });

  it('6. 3rd fullscreen exit -> records violation #3, triggers automatic submission and permanent lock', async () => {
    // Shift timestamps back so debounce allows 3rd exit
    await prisma.violation.updateMany({
      where: {
        userId: participantUserId,
        roundId: round1Id,
        type: 'FULLSCREEN_EXIT',
      },
      data: {
        createdAt: new Date(Date.now() - 5000),
      },
    });

    const res = await request(app)
      .post('/api/violations')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({
        contestId,
        roundId: round1Id,
        type: 'FULLSCREEN_EXIT',
        metadata: { message: 'Third and final fullscreen exit' },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Your round has been automatically submitted and locked.');
    expect(res.body.data.fullscreenExitCount).toBe(3);
    expect(res.body.data.warningNumber).toBe(3);
    expect(res.body.data.isAutoSubmitted).toBe(true);
    expect(res.body.data.isLocked).toBe(true);

    // Verify ParticipantRoundProgress is SUBMITTED and locked
    const progress = await prisma.participantRoundProgress.findUnique({
      where: {
        userId_roundId: {
          userId: participantUserId,
          roundId: round1Id,
        },
      },
    });
    expect(progress?.status).toBe(ParticipantRoundStatus.SUBMITTED);
    expect(progress?.lockedAt).not.toBeNull();
    expect(progress?.submittedAt).not.toBeNull();

    // Verify draft MCQ answer was auto-evaluated into a Submission record
    const sub = await prisma.submission.findFirst({
      where: {
        userId: participantUserId,
        questionId: round1QuestionId,
        roundId: round1Id,
      },
    });
    expect(sub).not.toBeNull();
    expect(sub?.status).toBe('ACCEPTED');
    expect(sub?.score).toBeGreaterThan(0);
  });

  it('7. Participant is permanently locked out of Round 1 across all actions and endpoints', async () => {
    // A. Cannot get round questions
    const roundRes = await request(app)
      .get(`/api/rounds/${round1Id}`)
      .set('Authorization', `Bearer ${participantToken}`);
    expect(roundRes.status).toBe(403);
    expect(roundRes.body.code).toBe('ROUND_LOCKED');
    expect(roundRes.body.isLocked).toBe(true);
    expect(roundRes.body.fullscreenExitCount).toBe(3);

    // B. Cannot save new drafts
    const saveRes = await request(app)
      .post(`/api/questions/${round1QuestionId}/save`)
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ selectedOptionId: correctOptionId });
    expect(saveRes.status).toBe(403);
    expect(saveRes.body.code).toBe('ROUND_LOCKED');

    // C. Cannot submit solutions
    const submitRes = await request(app)
      .post(`/api/questions/${round1QuestionId}/submit`)
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ selectedOptionId: correctOptionId });
    expect(submitRes.status).toBe(403);
    expect(submitRes.body.code).toBe('ROUND_LOCKED');

    // D. Cannot re-finalize
    const finalizeRes = await request(app)
      .post(`/api/rounds/${round1Id}/finalize`)
      .set('Authorization', `Bearer ${participantToken}`);
    expect(finalizeRes.status).toBe(409);
    expect(finalizeRes.body.code).toBe('ROUND_ALREADY_SUBMITTED');
  });

  it('8. Persistence: Logout and login does not reset exit count or locked state', async () => {
    // Explicitly logout first (single-session protection requirement)
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${participantToken}`);
    expect(logoutRes.status).toBe(200);

    // Log in again to get fresh session token
    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testParticipantEmail, password: testPassword });
    expect(newLogin.status).toBe(200);
    const freshToken = newLogin.body.data.token;
    participantToken = freshToken;

    // Direct access to round remains locked
    const roundRes = await request(app)
      .get(`/api/rounds/${round1Id}`)
      .set('Authorization', `Bearer ${freshToken}`);
    expect(roundRes.status).toBe(403);
    expect(roundRes.body.code).toBe('ROUND_LOCKED');
    expect(roundRes.body.fullscreenExitCount).toBe(3);
  });

  it('9. Round Isolation: Round 2 has independent fullscreen exit count and remains accessible', async () => {
    const r2Res = await request(app)
      .get(`/api/rounds/${round2Id}`)
      .set('Authorization', `Bearer ${participantToken}`);

    expect(r2Res.status).toBe(200);
    expect(r2Res.body.success).toBe(true);
    expect(r2Res.body.data.round.fullscreenExitCount).toBe(0);
    expect(r2Res.body.data.round.isLocked).toBe(false);
  });

  it('10. Admin can inspect audit logs and violation records', async () => {
    const auditRes = await prisma.auditLog.findFirst({
      where: {
        actorId: participantUserId,
        action: 'AUTO_SUBMIT_FULLSCREEN_VIOLATION',
      },
    });
    expect(auditRes).not.toBeNull();
    expect(auditRes?.entityId).toBe(round1Id);

    const violations = await prisma.violation.findMany({
      where: {
        userId: participantUserId,
        roundId: round1Id,
        type: 'FULLSCREEN_EXIT',
      },
    });
    expect(violations.length).toBe(3);
  });

  it('11. Round 2: 1st fullscreen exit starts 10-second countdown with authoritative deadline', async () => {
    const res = await request(app)
      .post('/api/violations')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({
        contestId,
        roundId: round2Id,
        type: 'FULLSCREEN_EXIT',
        metadata: { message: 'Round 2 exit 1' },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fullscreenExitCount).toBe(1);
    expect(res.body.data.warningNumber).toBe(1);
    expect(res.body.data.isAutoSubmitted).toBe(false);
    expect(res.body.data.isLocked).toBe(false);
    expect(res.body.data.countdownSeconds).toBe(10);
    expect(res.body.data.deadline).toBeDefined();

    // Verify round is still active
    const r2Check = await request(app)
      .get(`/api/rounds/${round2Id}`)
      .set('Authorization', `Bearer ${participantToken}`);
    expect(r2Check.status).toBe(200);
    expect(r2Check.body.data.round.fullscreenExitCount).toBe(1);
    expect(r2Check.body.data.round.isLocked).toBe(false);
  });

  it('12. Round 2: Return to fullscreen within 10s cancels countdown, preserves violation count #1', async () => {
    const returnRes = await request(app)
      .post('/api/violations/fullscreen-return')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ roundId: round2Id, contestId });

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.success).toBe(true);
    expect(returnRes.body.data.resumed).toBe(true);
    expect(returnRes.body.data.isAutoSubmitted).toBe(false);
    expect(returnRes.body.data.fullscreenExitCount).toBe(1);

    // Verify Round 2 remains unlocked
    const r2Check = await request(app)
      .get(`/api/rounds/${round2Id}`)
      .set('Authorization', `Bearer ${participantToken}`);
    expect(r2Check.status).toBe(200);
    expect(r2Check.body.data.round.fullscreenExitCount).toBe(1);
    expect(r2Check.body.data.round.isLocked).toBe(false);
  });

  it('13. Participant saves modified answer for Q1 in Round 2, leaving Q2 unmodified starter code', async () => {
    // Q1: Participant modified starter code
    const saveQ1 = await request(app)
      .post(`/api/questions/${round2Question1Id}/save`)
      .set('Authorization', `Bearer ${participantToken}`)
      .send({
        code: 'def fix_me():\n    return True\n',
        language: 'python',
      });
    expect(saveQ1.status).toBe(200);

    // Q2: Saved code contains unmodified starter code (e.g. participant opened it and autosaved)
    const saveQ2 = await request(app)
      .post(`/api/questions/${round2Question2Id}/save`)
      .set('Authorization', `Bearer ${participantToken}`)
      .send({
        code: 'def untouched():\n    return 0\n',
        language: 'python',
      });
    expect(saveQ2.status).toBe(200);
  });

  it('14. Round 2: 2nd fullscreen exit + 10s timeout -> auto-submits, preserves modified Q1, skips untouched Q2', async () => {
    // Shift timestamps back so debounce allows 2nd exit
    await prisma.violation.updateMany({
      where: {
        userId: participantUserId,
        roundId: round2Id,
        type: 'FULLSCREEN_EXIT',
      },
      data: {
        createdAt: new Date(Date.now() - 5000),
      },
    });

    const exitRes = await request(app)
      .post('/api/violations')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({
        contestId,
        roundId: round2Id,
        type: 'FULLSCREEN_EXIT',
        metadata: { message: 'Round 2 exit 2' },
      });

    expect(exitRes.status).toBe(201);
    expect(exitRes.body.data.fullscreenExitCount).toBe(2);
    expect(exitRes.body.data.warningNumber).toBe(2);
    expect(exitRes.body.data.isAutoSubmitted).toBe(false);

    // 10s timeout triggers auto final submit
    const timeoutRes = await request(app)
      .post('/api/violations/fullscreen-timeout')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ roundId: round2Id, contestId });

    expect(timeoutRes.status).toBe(200);
    expect(timeoutRes.body.success).toBe(true);
    expect(timeoutRes.body.data.isAutoSubmitted).toBe(true);
    expect(timeoutRes.body.data.isLocked).toBe(true);

    // Verify ParticipantRoundProgress is SUBMITTED and locked
    const progress = await prisma.participantRoundProgress.findUnique({
      where: {
        userId_roundId: {
          userId: participantUserId,
          roundId: round2Id,
        },
      },
    });
    expect(progress?.status).toBe('SUBMITTED');
    expect(progress?.lockedAt).not.toBeNull();

    // Verify modified Q1 was auto-submitted
    const subQ1 = await prisma.submission.findFirst({
      where: {
        userId: participantUserId,
        questionId: round2Question1Id,
        roundId: round2Id,
      },
    });
    expect(subQ1).not.toBeNull();

    // Verify untouched Q2 was NOT submitted (unanswered/unattempted)
    const subQ2 = await prisma.submission.findFirst({
      where: {
        userId: participantUserId,
        questionId: round2Question2Id,
        roundId: round2Id,
      },
    });
    expect(subQ2).toBeNull();
  });

  it('15. Attempting to return after timeout or access locked Round 2 is rejected', async () => {
    // Calling fullscreen-return after timeout returns 403 ROUND_LOCKED
    const returnRes = await request(app)
      .post('/api/violations/fullscreen-return')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ roundId: round2Id, contestId });

    expect(returnRes.status).toBe(403);
    expect(returnRes.body.data.isLocked).toBe(true);
    expect(returnRes.body.data.isAutoSubmitted).toBe(true);

    // Accessing Round 2 details returns 403 ROUND_LOCKED
    const r2Check = await request(app)
      .get(`/api/rounds/${round2Id}`)
      .set('Authorization', `Bearer ${participantToken}`);
    expect(r2Check.status).toBe(403);
    expect(r2Check.body.code).toBe('ROUND_LOCKED');
  });
});

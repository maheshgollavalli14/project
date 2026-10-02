import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';

describe('Round Templates Seeding & Final Submit Integration Suite', () => {
  let adminToken: string;
  let participantToken: string;
  let round1Id: string;
  let round2Id: string;
  let round3Id: string;
  let outputPredictionQuestionId: string;

  beforeAll(async () => {
    // Clear sessions for test users
    await prisma.userSession.deleteMany({
      where: { user: { email: { in: ['admin@codebreak.dev', 'alex.chen@mit.edu'] } } },
    });
    await prisma.participantRoundProgress.deleteMany({
      where: { user: { email: 'alex.chen@mit.edu' } },
    });
    await prisma.auditLog.deleteMany({
      where: { actorEmail: 'alex.chen@mit.edu' },
    });

    // 1. Authenticate Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@codebreak.dev', password: 'Admin@CodeBreak2026' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;

    // 2. Authenticate Solo Participant
    const partRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alex.chen@mit.edu', password: 'Password@123' });
    expect(partRes.status).toBe(200);
    participantToken = partRes.body.data.token;

    // Get rounds
    const contest = await prisma.contest.findFirst({
      include: { rounds: true },
    });
    expect(contest).toBeDefined();

    const r1 = contest!.rounds.find((r) => r.roundNumber === 1);
    const r2 = contest!.rounds.find((r) => r.roundNumber === 2);
    const r3 = contest!.rounds.find((r) => r.roundNumber === 3);

    round1Id = r1!.id;
    round2Id = r2!.id;
    round3Id = r3!.id;

    // Make Round 1 active
    await prisma.contestRound.update({
      where: { id: round1Id },
      data: {
        status: 'ACTIVE',
        startTime: new Date(Date.now() - 5 * 60 * 1000),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
  });

  it('1. Admin seeds Round 1 Template Pack (25 MCQ Bits + 2 Output Predictions = 27 questions)', async () => {
    const res = await request(app)
      .post('/api/admin/questions/seed-template')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roundNumber: 1, clearExisting: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.createdCount).toBe(27);

    // Verify in DB
    const questions = await prisma.question.findMany({
      where: { roundId: round1Id },
      include: { options: true },
      orderBy: { orderNumber: 'asc' },
    });
    expect(questions.length).toBe(27);

    const mcqs = questions.filter((q) => q.type === 'MCQ');
    const outputs = questions.filter((q) => q.type === 'OUTPUT_PREDICTION');

    expect(mcqs.length).toBe(25);
    expect(outputs.length).toBe(2);

    // Verify MCQ has 4 options each
    for (const mcq of mcqs) {
      expect(mcq.options.length).toBe(4);
      const correct = mcq.options.filter((o) => o.isCorrect);
      expect(correct.length).toBe(1);
    }

    // Save one output prediction ID for testing written submission
    outputPredictionQuestionId = outputs[0].id;
    expect(outputs[0].expectedOutput).toBe('[4, 4, 4]');
  });

  it('2. Admin seeds Round 2 Template Pack (4 Jumbled & Buggy Problems)', async () => {
    const res = await request(app)
      .post('/api/admin/questions/seed-template')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roundNumber: 2, clearExisting: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.createdCount).toBe(4);

    const questions = await prisma.question.findMany({
      where: { roundId: round2Id },
      include: { testCases: true },
    });
    expect(questions.length).toBe(4);
    for (const q of questions) {
      expect(['JUMBLED', 'DEBUGGING']).toContain(q.type);
      expect(q.testCases.length).toBeGreaterThanOrEqual(2);
      expect(q.initialCode).toBeTruthy();
    }
  });

  it('3. Admin seeds Round 3 Template Pack (3 Grand Finale Algorithmic Scenarios)', async () => {
    const res = await request(app)
      .post('/api/admin/questions/seed-template')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roundNumber: 3, clearExisting: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.createdCount).toBe(3);

    const questions = await prisma.question.findMany({
      where: { roundId: round3Id },
      include: { testCases: true },
    });
    expect(questions.length).toBe(3);
    for (const q of questions) {
      expect(q.type).toBe('CODING');
      expect(q.testCases.length).toBeGreaterThanOrEqual(3);
      expect(q.description).toContain('### Problem Scenario');
    }
  });

  it('4. Participant submits written output prediction to Round 1 problem -> ACCEPTED in DB, SUBMITTED to participant', async () => {
    const res = await request(app)
      .post(`/api/questions/${outputPredictionQuestionId}/submit`)
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ code: '[4, 4, 4]' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SUBMITTED');

    // Authoritative internal evaluation in DB
    const sub = await prisma.submission.findFirst({
      where: { id: res.body.data.submissionId },
    });
    expect(sub?.status).toBe('ACCEPTED');
    expect(sub?.score).toBe(15);
  });

  it('5. Participant submits incorrect written output -> WRONG_ANSWER in DB, SUBMITTED to participant', async () => {
    const res = await request(app)
      .post(`/api/questions/${outputPredictionQuestionId}/submit`)
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ code: '[0, 2, 4]' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SUBMITTED');

    // Authoritative internal evaluation in DB
    const sub = await prisma.submission.findFirst({
      where: { id: res.body.data.submissionId },
    });
    expect(sub?.status).toBe('WRONG_ANSWER');
    expect(sub?.score).toBe(0);
  });

  it('6. Participant clicks Final Submit -> Round finalized and locks released', async () => {
    const res = await request(app)
      .post(`/api/rounds/${round1Id}/finalize`)
      .set('Authorization', `Bearer ${participantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('submitted successfully');
  });
});

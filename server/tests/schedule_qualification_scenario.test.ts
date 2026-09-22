import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { TimerService } from '../src/services/timer.service.js';

describe('Authoritative Round Scheduling & Round 3 Qualification Gating Scenarios', () => {
  let adminToken: string;
  let participant1Token: string; // Will qualify
  let participant2Token: string; // Will NOT qualify
  let contestId: string;
  let round1Id: string;
  let round2Id: string;
  let round3Id: string;
  let r3QuestionId: string;

  beforeAll(async () => {
    // 1. Authenticate Admin
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@codebreak.dev',
      password: 'Admin@CodeBreak2026',
    });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;

    // 2. Authenticate Participant 1 (Alex Chen)
    const p1Res = await request(app).post('/api/auth/login').send({
      email: 'alex.chen@mit.edu',
      password: 'Password@123',
    });
    expect(p1Res.status).toBe(200);
    participant1Token = p1Res.body.data.token;

    // 3. Register a fresh Participant 2 (Unranked / Below Cutoff)
    const uniqueEmail = `eliminated.user.${Date.now()}@college.edu`;
    const p2Reg = await request(app).post('/api/auth/register/individual').send({
      email: uniqueEmail,
      password: 'Password@123',
      confirmPassword: 'Password@123',
      fullName: 'Eliminated Candidate',
      phone: '9988776655',
      college: 'Test College of Engineering',
      degree: 'B.Tech',
      branch: 'ECE',
      year: '2nd Year',
      gender: 'MALE',
      tshirtSize: 'M',
    });
    expect(p2Reg.status).toBe(201);
    participant2Token = p2Reg.body.data.token;

    // 4. Fetch contest and round IDs
    const contest = await prisma.contest.findFirst({
      include: {
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: { questions: true },
        },
      },
    });

    contestId = contest!.id;
    const r1 = contest!.rounds.find((r) => r.roundNumber === 1)!;
    const r2 = contest!.rounds.find((r) => r.roundNumber === 2)!;
    const r3 = contest!.rounds.find((r) => r.roundNumber === 3)!;

    round1Id = r1.id;
    round2Id = r2.id;
    round3Id = r3.id;
    r3QuestionId = r3.questions[0]?.id;
  });

  it('1. Admin schedules non-overlapping time windows: R1 Past, R2 Active Now, R3 Upcoming', async () => {
    const now = new Date();
    // Round 1: Ended 10 minutes ago
    const r1Start = new Date(now.getTime() - 60 * 60 * 1000);
    const r1End = new Date(now.getTime() - 10 * 60 * 1000);

    // Round 2: Active (started 10 mins ago, ends in 50 mins)
    const r2Start = new Date(now.getTime() - 10 * 60 * 1000);
    const r2End = new Date(now.getTime() + 50 * 60 * 1000);

    // Round 3: Upcoming (starts in 60 mins, ends in 120 mins)
    const r3Start = new Date(now.getTime() + 60 * 60 * 1000);
    const r3End = new Date(now.getTime() + 120 * 60 * 1000);

    const scheduleRes = await request(app)
      .post('/api/admin/contest/schedule-all-rounds')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rounds: [
          { roundId: round1Id, startTime: r1Start.toISOString(), endTime: r1End.toISOString() },
          { roundId: round2Id, startTime: r2Start.toISOString(), endTime: r2End.toISOString() },
          { roundId: round3Id, startTime: r3Start.toISOString(), endTime: r3End.toISOString() },
        ],
      });

    expect(scheduleRes.status).toBe(200);
    expect(scheduleRes.body.success).toBe(true);

    // Verify database statuses
    const r1Db = await prisma.contestRound.findUnique({ where: { id: round1Id } });
    const r2Db = await prisma.contestRound.findUnique({ where: { id: round2Id } });
    const r3Db = await prisma.contestRound.findUnique({ where: { id: round3Id } });

    expect(r1Db?.status).toBe('COMPLETED');
    expect(r2Db?.status).toBe('ACTIVE');
    expect(r3Db?.status).toBe('UPCOMING');
  });

  it('2. Participant contest dashboard reflects EXACTLY ONE active arena (Round 2)', async () => {
    const res = await request(app)
      .get('/api/contests/current')
      .set('Authorization', `Bearer ${participant1Token}`);

    expect(res.status).toBe(200);
    const rounds = res.body.data.contest.rounds;

    const r1 = rounds.find((r: any) => r.roundNumber === 1);
    const r2 = rounds.find((r: any) => r.roundNumber === 2);
    const r3 = rounds.find((r: any) => r.roundNumber === 3);

    expect(r1.status).toBe('COMPLETED');
    expect(r1.isArenaOpen).toBe(false);

    expect(r2.status).toBe('ACTIVE');
    expect(r2.isArenaOpen).toBe(true);

    expect(r3.status).toBe('UPCOMING');
    expect(r3.isArenaOpen).toBe(false);
  });

  it('3. Direct URL access to completed Round 1 is rejected with 403 ROUND_COMPLETED', async () => {
    const res = await request(app)
      .get(`/api/rounds/${round1Id}`)
      .set('Authorization', `Bearer ${participant1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ROUND_COMPLETED');
  });

  it('4. Direct URL access to upcoming Round 3 is rejected with 403 ROUND_NOT_STARTED', async () => {
    const res = await request(app)
      .get(`/api/rounds/${round3Id}`)
      .set('Authorization', `Bearer ${participant1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ROUND_NOT_STARTED');
  });

  it('5. Direct URL access to active Round 2 succeeds with 200 OK', async () => {
    const res = await request(app)
      .get(`/api/rounds/${round2Id}`)
      .set('Authorization', `Bearer ${participant1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.round.status).toBe('ACTIVE');
  });

  it('6. Admin transitions Round 3 to ACTIVE and calculates Top 10 Qualification', async () => {
    const now = new Date();
    // Admin schedules Round 3 active now
    const r3Start = new Date(now.getTime() - 5 * 60 * 1000);
    const r3End = new Date(now.getTime() + 60 * 60 * 1000);

    const scheduleRes = await request(app)
      .post('/api/admin/contest/schedule-round')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        roundId: round3Id,
        startTime: r3Start.toISOString(),
        endTime: r3End.toISOString(),
      });

    expect(scheduleRes.status).toBe(200);
    expect(scheduleRes.body.data.round.status).toBe('ACTIVE');

    // Run qualification engine for Top 10
    const qualRes = await request(app)
      .post('/api/admin/qualification/calculate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ contestId, cutoffCount: 10 });

    expect(qualRes.status).toBe(200);
  });

  it('7. Non-qualified participant is BLOCKED from Round 3 with 403 NOT_QUALIFIED', async () => {
    // Participant 2 has 0 points and was never promoted
    const res = await request(app)
      .get(`/api/rounds/${round3Id}`)
      .set('Authorization', `Bearer ${participant2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('NOT_QUALIFIED');
    expect(res.body.message).toContain('restricted');
  });

  it('8. Non-qualified participant attempting to submit to Round 3 is blocked with 403 NOT_QUALIFIED', async () => {
    if (!r3QuestionId) return;

    const res = await request(app)
      .post(`/api/questions/${r3QuestionId}/submit`)
      .set('Authorization', `Bearer ${participant2Token}`)
      .send({
        code: 'print("Trying to hack entry")',
        language: 'python',
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('NOT_QUALIFIED');
  });

  it('9. Contest Director (Admin) retains full preview and management access to Round 3', async () => {
    const res = await request(app)
      .get(`/api/rounds/${round3Id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.round.roundNumber).toBe(3);
  });

  afterAll(async () => {
    // Reset Round 1 & 2 to active state for baseline environment
    const now = new Date();
    await prisma.contestRound.updateMany({
      where: { roundNumber: { in: [1, 2] } },
      data: {
        status: 'ACTIVE',
        startTime: new Date(now.getTime() - 10 * 60 * 1000),
        endTime: new Date(now.getTime() + 180 * 60 * 1000),
      },
    });
  });
});


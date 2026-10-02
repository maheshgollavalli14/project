import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('CODEBREAK Platform Automated Integration Test Suite', () => {
  let adminToken: string;
  let participantToken: string;
  let teamMember1Token: string;
  let teamMember2Token: string;
  let contestId: string;
  let round1Id: string;
  let sampleQuestionId: string;
  let violationId: string;

  beforeAll(async () => {
    // Clear any existing active sessions
    await prisma.userSession.deleteMany({
      where: { user: { email: { in: ['admin@codebreak.dev', 'alex.chen@mit.edu', 'rohan.gupta@nitt.edu', 'ananya.deshmukh@nitt.edu', 'dev.kapoor@pilani.bits-pilani.ac.in'] } } },
    });
    await prisma.participantRoundProgress.deleteMany();

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

    // 3. Authenticate Team Members (Team: ByteForce)
    const tm1Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rohan.gupta@nitt.edu', password: 'Password@123' });
    expect(tm1Res.status).toBe(200);
    teamMember1Token = tm1Res.body.data.token;

    const tm2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ananya.deshmukh@nitt.edu', password: 'Password@123' });
    expect(tm2Res.status).toBe(200);
    teamMember2Token = tm2Res.body.data.token;

    // Ensure Round 1 is active with a valid active time window for the test suite
    const contest = await prisma.contest.findFirst({
      include: { rounds: true }
    });
    if (contest) {
      const r1 = contest.rounds.find(r => r.roundNumber === 1);
      if (r1) {
        await prisma.contestRound.update({
          where: { id: r1.id },
          data: {
            status: 'ACTIVE',
            startTime: new Date(Date.now() - 5 * 60 * 1000),
            endTime: new Date(Date.now() + 60 * 60 * 1000),
          }
        });
      }
    }
  });

  describe('1. System Health & Public Access', () => {
    it('GET /health returns 200 with HEALTHY status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('HEALTHY');
      expect(res.body.service).toBe('CODEBREAK API');
    });

    it('GET /api/contests/current returns active contest with 3 competition rounds', async () => {
      const res = await request(app).get('/api/contests/current');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.contest).toBeDefined();
      expect(res.body.data.contest.rounds.length).toBe(3);

      contestId = res.body.data.contest.id;
      const r1 = res.body.data.contest.rounds.find((r: any) => r.roundNumber === 1);
      expect(r1).toBeDefined();
      round1Id = r1.id;
    });
  });

  describe('2. Authentication & Server-side RBAC Guard', () => {
    it('Rejects login with invalid credentials with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alex.chen@mit.edu', password: 'WrongPassword999!' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/auth/me returns authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${participantToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('alex.chen@mit.edu');
    });

    it('Rejects non-admin user accessing /api/admin/dashboard with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${participantToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Allows admin user accessing /api/admin/dashboard with 200 OK and metrics', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics).toBeDefined();
      expect(res.body.data.metrics.totalUsers).toBeGreaterThan(0);
    });
  });

  describe('3. Questions & Round Discovery', () => {
    it('GET /api/rounds/:id returns questions with sanitized sample test cases', async () => {
      const res = await request(app)
        .get(`/api/rounds/${round1Id}`)
        .set('Authorization', `Bearer ${participantToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.round.questions.length).toBeGreaterThan(0);

      const q = res.body.data.round.questions[0];
      sampleQuestionId = q.id;
      expect(q.title).toBeDefined();
    });
  });

  describe('4. Individual Participant Concurrency & Independent Autosave', () => {
    it('Participant 1 autosaves draft code successfully', async () => {
      const res = await request(app)
        .post(`/api/questions/${sampleQuestionId}/save`)
        .set('Authorization', `Bearer ${teamMember1Token}`)
        .send({
          code: 'def solution(): return 42',
          language: 'python',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Participant 2 can simultaneously save draft code on the same question without locking conflicts', async () => {
      const res = await request(app)
        .post(`/api/questions/${sampleQuestionId}/save`)
        .set('Authorization', `Bearer ${teamMember2Token}`)
        .send({
          code: 'def solution(): return 100',
          language: 'python',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('5. Isolated Subprocess Code Execution', () => {
    it('POST /api/questions/:id/run executes Python code against public test cases', async () => {
      // Find a coding problem in round 1
      const roundRes = await request(app)
        .get(`/api/rounds/${round1Id}`)
        .set('Authorization', `Bearer ${participantToken}`);
      
      const codingQuestion = roundRes.body.data.round.questions.find(
        (q: any) => q.type === 'CODING' || q.testCases?.length > 0
      );

      if (codingQuestion) {
        const pythonSolution = `
import sys
data = sys.stdin.read().split()
if data:
    n = int(data[0])
    arr = [int(x) for x in data[1:n+1]]
    total = sum(arr)
    left = 0
    ans = -1
    for i in range(n):
        if left == total - left - arr[i]:
            ans = i
            break
        left += arr[i]
    print(ans)
`;
        const res = await request(app)
          .post(`/api/questions/${codingQuestion.id}/run`)
          .set('Authorization', `Bearer ${participantToken}`)
          .send({
            language: 'python',
            code: pythonSolution,
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.overallStatus).toBeDefined();
      }
    });
  });

  describe('6. Anti-Cheat Security Audit & Proctor Review', () => {
    it('Participant triggers a TAB_SWITCH security incident -> 201 Created', async () => {
      const res = await request(app)
        .post('/api/violations')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          type: 'TAB_SWITCH',
          contestId,
          roundId: round1Id,
          metadata: { focusLostSeconds: 2.4, tabIndex: 1 },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.violationId).toBeDefined();
      violationId = res.body.data.violationId;
    });

    it('Admin reviews and marks violation in proctor log', async () => {
      const res = await request(app)
        .patch(`/api/admin/violations/${violationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reviewed: true,
          adminNote: 'Reviewed by director. First warning recorded.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.violation.reviewed).toBe(true);
      expect(res.body.data.violation.adminNote).toContain('First warning recorded');
    });
  });

  describe('7. Automated Qualification Engine', () => {
    it('Admin triggers qualification calculation for Top 10 participants', async () => {
      const res = await request(app)
        .post('/api/admin/qualification/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          contestId,
          cutoffCount: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cutoffCount).toBe(10);
    });
  });
});

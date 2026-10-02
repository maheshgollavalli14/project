import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { generateToken } from '../src/utils/jwt.js';
import { Role, RoundStatus, QuestionType } from '@prisma/client';
import { TimerService } from '../src/services/timer.service.js';

describe('CODEBREAK Anti-Cheating, Security & Contest Integrity Test Suite', () => {
  let adminToken: string;
  let soloUserToken: string;
  let soloUser2Token: string;

  let soloUserId: string;
  let soloUser2Id: string;

  let contestId: string;
  let round1Id: string;
  let q1Id: string;
  let q2Id: string;
  let q3Id: string;

  beforeAll(async () => {
    // 1. Setup or find Contest & Round
    let contest = await prisma.contest.findFirst({
      include: {
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: {
            questions: {
              include: { testCases: true },
            },
          },
        },
      },
    });

    if (!contest || contest.rounds.length === 0) {
      contest = await prisma.contest.create({
        data: {
          title: 'Integrity Verification Contest',
          description: 'Anti-cheat test contest',
          status: 'ACTIVE',
          rounds: {
            create: {
              roundNumber: 1,
              title: 'Integrity Round 1',
              type: 'FINAL_CODING',
              status: 'ACTIVE',
              startTime: new Date(Date.now() - 3600000),
              endTime: new Date(Date.now() + 7200000),
            },
          },
        },
        include: {
          rounds: {
            include: { questions: { include: { testCases: true } } },
          },
        },
      });
    }

    contestId = contest.id;
    const r1 = contest.rounds.find((r: any) => r.roundNumber === 1) || contest.rounds[0];
    round1Id = r1.id;

    // Ensure round is active
    await prisma.contestRound.update({
      where: { id: round1Id },
      data: {
        status: RoundStatus.ACTIVE,
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() + 7200000),
      },
    });

    // Ensure 3 questions exist in this round for Question Isolation tests
    let questions = r1.questions;
    if (questions.length < 3) {
      const q1 = await prisma.question.create({
        data: {
          roundId: round1Id,
          orderNumber: 1,
          title: 'Problem 1 - Syntax & Logic',
          description: 'First test question',
          type: QuestionType.CODING,
          initialCode: '// Initial Template Q1',
          testCases: {
            create: [
              { input: '1', expectedOutput: 'Question 1', isPublic: true },
              { input: '2', expectedOutput: 'Hidden Output Q1', isPublic: false },
            ],
          },
        },
      });

      const q2 = await prisma.question.create({
        data: {
          roundId: round1Id,
          orderNumber: 2,
          title: 'Problem 2 - Data Structures',
          description: 'Second test question',
          type: QuestionType.CODING,
          initialCode: '// Initial Template Q2',
          testCases: {
            create: [
              { input: '10', expectedOutput: 'Question 2', isPublic: true },
              { input: '20', expectedOutput: 'Hidden Output Q2', isPublic: false },
            ],
          },
        },
      });

      const q3 = await prisma.question.create({
        data: {
          roundId: round1Id,
          orderNumber: 3,
          title: 'Problem 3 - Optimization',
          description: 'Third test question',
          type: QuestionType.CODING,
          initialCode: '// Initial Template Q3',
          testCases: {
            create: [
              { input: '100', expectedOutput: 'Question 3', isPublic: true },
              { input: '200', expectedOutput: 'Hidden Output Q3', isPublic: false },
            ],
          },
        },
      });

      questions = [q1, q2, q3];
    }

    q1Id = questions[0].id;
    q2Id = questions[1].id;
    q3Id = questions[2].id;

    // 2. Setup Solo Participant
    let soloUser = await prisma.user.findUnique({
      where: { email: 'solo.integrity@codebreak.dev' },
    });
    if (!soloUser) {
      soloUser = await prisma.user.create({
        data: {
          email: 'solo.integrity@codebreak.dev',
          passwordHash: 'dummy',
          role: Role.PARTICIPANT,
          isActive: true,
          profile: {
            create: {
              fullName: 'Solo Integrity Tester',
              college: 'Test College',
              phone: '1111111111',
              participantId: 'CB-TST-SOLO',
            },
          },
        },
      });
    }
    soloUserId = soloUser.id;
    await prisma.violation.deleteMany({ where: { userId: soloUserId } });
    const s1 = await prisma.userSession.create({
      data: { userId: soloUserId, expiresAt: new Date(Date.now() + 86400000) },
    });
    soloUserToken = generateToken({
      userId: soloUserId,
      email: soloUser.email,
      role: Role.PARTICIPANT,
      sessionId: s1.id,
    });

    // 3. Setup Second Solo Participant for isolation testing
    let soloUser2 = await prisma.user.findUnique({
      where: { email: 'solo2.integrity@codebreak.dev' },
    });
    if (!soloUser2) {
      soloUser2 = await prisma.user.create({
        data: {
          email: 'solo2.integrity@codebreak.dev',
          passwordHash: 'dummy',
          role: Role.PARTICIPANT,
          isActive: true,
          profile: {
            create: {
              fullName: 'Second Solo Competitor',
              college: 'Test University',
              phone: '2222222222',
              participantId: 'CB-TST-SOLO2',
            },
          },
        },
      });
    }
    soloUser2Id = soloUser2.id;
    const s2 = await prisma.userSession.create({
      data: { userId: soloUser2Id, expiresAt: new Date(Date.now() + 86400000) },
    });
    soloUser2Token = generateToken({
      userId: soloUser2Id,
      email: soloUser2.email,
      role: Role.PARTICIPANT,
      sessionId: s2.id,
    });

    // 4. Setup Admin Token
    let adminUser = await prisma.user.findUnique({
      where: { email: 'admin.integrity@codebreak.dev' },
    });

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: 'admin.integrity@codebreak.dev',
          passwordHash: 'dummy',
          role: Role.ADMIN,
          profile: {
            create: {
              fullName: 'Admin Integrity Tester',
              college: 'Admin HQ',
              phone: '9999999999',
              participantId: 'CB-ADM-INT-001',
            },
          },
        },
      });
    }

    const sAdmin = await prisma.userSession.create({
      data: { userId: adminUser.id, expiresAt: new Date(Date.now() + 86400000) },
    });
    adminToken = generateToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: Role.ADMIN,
      sessionId: sAdmin.id,
    });
  });

  // =========================================================================
  // CRITICAL ACCEPTANCE TEST 31: Question-Specific Code Isolation
  // =========================================================================
  describe('Critical Acceptance Test 31: Question-Specific Code Isolation', () => {
    const q1Code = '#include <stdio.h>\nint main() {\n    printf("Question 1");\n    return 0;\n}';
    const q2Code = 'def solution():\n    return "Question 2 Unique Algorithm"';

    it('Step 1: Save code for Question 1', async () => {
      const res = await request(app)
        .post(`/api/questions/${q1Id}/save`)
        .set('Authorization', `Bearer ${soloUserToken}`)
        .send({
          code: q1Code,
          language: 'cpp',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.saved.code).toBe(q1Code);
    });

    it('Step 2: Move to Question 2 -> Question 2 must NOT display Question 1 code', async () => {
      // Clear Q2 state first to simulate fresh question
      await prisma.savedCode.deleteMany({
        where: { userId: soloUserId, questionId: q2Id },
      });

      const res = await request(app)
        .get(`/api/rounds/${round1Id}`)
        .set('Authorization', `Bearer ${soloUserToken}`);

      expect(res.status).toBe(200);
      const q2 = res.body.data.round.questions.find((q: any) => q.id === q2Id);
      expect(q2).toBeDefined();
      // Must NOT contain Question 1's code!
      expect(q2.savedState?.code).not.toBe(q1Code);
    });

    it('Step 3: Save different code in Question 2', async () => {
      const res = await request(app)
        .post(`/api/questions/${q2Id}/save`)
        .set('Authorization', `Bearer ${soloUserToken}`)
        .send({
          code: q2Code,
          language: 'python',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.saved.code).toBe(q2Code);
    });

    it('Step 4: Move to Question 3 -> Question 3 must NOT display Q1 or Q2 code', async () => {
      await prisma.savedCode.deleteMany({
        where: { userId: soloUserId, questionId: q3Id },
      });

      const res = await request(app)
        .get(`/api/rounds/${round1Id}`)
        .set('Authorization', `Bearer ${soloUserToken}`);

      const q3 = res.body.data.round.questions.find((q: any) => q.id === q3Id);
      expect(q3).toBeDefined();
      expect(q3.savedState?.code).not.toBe(q1Code);
      expect(q3.savedState?.code).not.toBe(q2Code);
    });

    it('Step 5: Return to Question 1 -> must show only Question 1 saved code', async () => {
      const res = await request(app)
        .get(`/api/rounds/${round1Id}`)
        .set('Authorization', `Bearer ${soloUserToken}`);

      const q1 = res.body.data.round.questions.find((q: any) => q.id === q1Id);
      expect(q1.savedState?.code).toBe(q1Code);
    });

    it('Step 6: Return to Question 2 -> must show only Question 2 saved code', async () => {
      const res = await request(app)
        .get(`/api/rounds/${round1Id}`)
        .set('Authorization', `Bearer ${soloUserToken}`);

      const q2 = res.body.data.round.questions.find((q: any) => q.id === q2Id);
      expect(q2.savedState?.code).toBe(q2Code);
    });

    it('Step 7: Reload / Reconnect simulation -> code for all questions remains isolated', async () => {
      const res = await request(app)
        .get(`/api/rounds/${round1Id}`)
        .set('Authorization', `Bearer ${soloUserToken}`);

      const questionsMap = new Map(res.body.data.round.questions.map((q: any) => [q.id, q]));

      expect(questionsMap.get(q1Id).savedState?.code).toBe(q1Code);
      expect(questionsMap.get(q2Id).savedState?.code).toBe(q2Code);
      expect(questionsMap.get(q3Id).savedState?.code).not.toBe(q1Code);
    });
  });

  // =========================================================================
  // INDIVIDUAL ACCEPTANCE TEST 32: Participant Isolation & Independent Progress
  // =========================================================================
  describe('Individual Acceptance Test 32: Participant Isolation & Independent Progress', () => {
    it('Step 1: Participant 1 saves draft code on Question 1', async () => {
      const res = await request(app)
        .post(`/api/questions/${q1Id}/save`)
        .set('Authorization', `Bearer ${soloUserToken}`)
        .send({
          code: 'print("Participant 1 Work")',
          language: 'python',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Step 2: Participant 2 opens Question 1 -> Receives independent state without collision', async () => {
      const res = await request(app)
        .get(`/api/rounds/${round1Id}`)
        .set('Authorization', `Bearer ${soloUser2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const q1 = res.body.data.round.questions.find((q: any) => q.id === q1Id);
      expect(q1?.savedState?.code).not.toBe('print("Participant 1 Work")');
    });

    it('Step 3: Participant 2 can work on Question 1 concurrently with no locks', async () => {
      const res = await request(app)
        .post(`/api/questions/${q1Id}/save`)
        .set('Authorization', `Bearer ${soloUser2Token}`)
        .send({
          code: 'print("Participant 2 Work")',
          language: 'python',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Step 4: Participant 1 submits Question 1 independently', async () => {
      const res = await request(app)
        .post(`/api/questions/${q1Id}/submit`)
        .set('Authorization', `Bearer ${soloUserToken}`)
        .send({
          code: 'print("Question 1")',
          language: 'python',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUBMITTED');
    });

    it('Step 5: Participant 2 submits Question 1 independently with separate score', async () => {
      const res = await request(app)
        .post(`/api/questions/${q1Id}/submit`)
        .set('Authorization', `Bearer ${soloUser2Token}`)
        .send({
          code: 'print("Question 1")',
          language: 'python',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUBMITTED');
    });
  });

  // =========================================================================
  // TIMER ACCEPTANCE TEST 33: Authoritative Server-Side Timer
  // =========================================================================
  describe('Timer Acceptance Test 33: Authoritative Server-Side Timer', () => {
    it('Calculates remaining seconds strictly from server clock', async () => {
      const futureTime = new Date(Date.now() + 180000); // 3 minutes ahead
      const remaining = TimerService.getRemainingSeconds(futureTime);
      expect(remaining).toBeGreaterThan(170);
      expect(remaining).toBeLessThanOrEqual(180);
    });

    it('Returns 0 seconds when round endTime has passed', async () => {
      const pastTime = new Date(Date.now() - 10000);
      const remaining = TimerService.getRemainingSeconds(pastTime);
      expect(remaining).toBe(0);
    });

    it('Rejects submissions after round expiration', async () => {
      // Temporarily mark round completed/expired
      await prisma.contestRound.update({
        where: { id: round1Id },
        data: {
          status: RoundStatus.COMPLETED,
          endTime: new Date(Date.now() - 5000),
        },
      });

      const res = await request(app)
        .post(`/api/questions/${q1Id}/submit`)
        .set('Authorization', `Bearer ${soloUserToken}`)
        .send({
          code: 'print("Late submission")',
          language: 'python',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ROUND_CLOSED');

      // Restore active round
      await prisma.contestRound.update({
        where: { id: round1Id },
        data: {
          status: RoundStatus.ACTIVE,
          endTime: new Date(Date.now() + 7200000),
        },
      });
    });
  });

  // =========================================================================
  // VIOLATION LOGGING TEST SUITE: All 12 Supported Violation Types
  // =========================================================================
  describe('Anti-Cheating Violation System: All 12 Violation Types', () => {
    const violationTypes = [
      { type: 'FULLSCREEN_EXIT', expectedSeverity: 'MEDIUM' },
      { type: 'TAB_SWITCH', expectedSeverity: 'MEDIUM' },
      { type: 'WINDOW_BLUR', expectedSeverity: 'LOW' },
      { type: 'COPY', expectedSeverity: 'LOW' },
      { type: 'PASTE', expectedSeverity: 'MEDIUM' },
      { type: 'CUT', expectedSeverity: 'MEDIUM' },
      { type: 'CONTEXT_MENU', expectedSeverity: 'LOW' },
      { type: 'SUSPICIOUS_KEYBOARD_SHORTCUT', expectedSeverity: 'HIGH' },
      { type: 'NAVIGATION_ATTEMPT', expectedSeverity: 'MEDIUM' },
      { type: 'MULTIPLE_LOGIN', expectedSeverity: 'CRITICAL' },
      { type: 'INVALID_SUBMISSION_ATTEMPT', expectedSeverity: 'HIGH' },
      { type: 'OTHER_SUSPICIOUS_ACTIVITY', expectedSeverity: 'HIGH' },
    ];

    it.each(violationTypes)('Logs violation of type $type with severity $expectedSeverity', async ({ type, expectedSeverity }) => {
      const res = await request(app)
        .post('/api/violations')
        .set('Authorization', `Bearer ${soloUserToken}`)
        .send({
          contestId,
          roundId: round1Id,
          questionId: q1Id,
          type,
          metadata: { testRunner: 'vitest', trigger: type },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.severity).toBe(expectedSeverity);
      expect(res.body.data.violationId).toBeDefined();
    });

    it('Admin can filter violations by type, severity, and review status', async () => {
      const res = await request(app)
        .get('/api/admin/violations?type=MULTIPLE_LOGIN&severity=CRITICAL')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.violations.length).toBeGreaterThan(0);
      expect(res.body.data.violations[0].type).toBe('MULTIPLE_LOGIN');
    });

    it('Admin can review a violation and attach an audit note', async () => {
      const violation = await prisma.violation.findFirst({
        where: { contestId, type: 'MULTIPLE_LOGIN' },
      });
      expect(violation).toBeDefined();

      const res = await request(app)
        .patch(`/api/admin/violations/${violation!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reviewed: true,
          adminNote: 'Reviewed by Proctor Jenkins. Verified false positive.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.violation.reviewed).toBe(true);
      expect(res.body.data.violation.adminNote).toContain('Proctor Jenkins');
    });
  });

  // =========================================================================
  // HIDDEN TEST CASE SECURITY (Requirement 20)
  // =========================================================================
  describe('Hidden Test Case Security', () => {
    it('Never exposes hidden test case inputs and expected outputs to participant', async () => {
      const res = await request(app)
        .post(`/api/questions/${q1Id}/run`)
        .set('Authorization', `Bearer ${soloUserToken}`)
        .send({
          language: 'python',
          code: 'print("Question 1")',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify that public test cases show inputs/expectedOutputs, but hidden test cases never do
      const testCasesInDb = await prisma.testCase.findMany({
        where: { questionId: q1Id },
      });

      const hiddenCase = testCasesInDb.find((tc) => !tc.isPublic);
      if (hiddenCase) {
        // Run code endpoint only runs public test cases:
        const results = res.body.data.testResults || [];
        for (const r of results) {
          if (!r.isPublic) {
            expect(r.input).toBeUndefined();
            expect(r.expectedOutput).toBeUndefined();
          }
        }
      }
    });
  });

  // =========================================================================
  // REQUIREMENT 2 & 3: SUBMISSION RESULTS & ROUND 2 SOLUTION PROTECTION
  // =========================================================================
  describe('Requirement 2 & 3: Submission Results & Solution Protection', () => {
    it('Participant submission response returns generic confirmation but NEVER exposes test case counts, scores, maxScore, or verdicts', async () => {
      const res = await request(app)
        .post(`/api/questions/${q1Id}/submit`)
        .set('Authorization', `Bearer ${soloUserToken}`)
        .send({
          language: 'python',
          code: 'print("Question 1")',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Answer submitted successfully');

      // Allowed fields
      expect(res.body.data.status).toBe('SUBMITTED');

      // Strictly prohibited fields for participants
      expect(res.body.data.passedTests).toBeUndefined();
      expect(res.body.data.totalTests).toBeUndefined();
      expect(res.body.data.score).toBeUndefined();
      expect(res.body.data.maxScore).toBeUndefined();
      expect(res.body.data.testResults).toBeUndefined();
    });

    it('Admin submission response retains internal scores and verdicts for monitoring', async () => {
      const res = await request(app)
        .post(`/api/questions/${q1Id}/submit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          language: 'python',
          code: 'print("Question 1")',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Admin sees score and status verdict
      expect(res.body.data.score).toBeDefined();
      expect(res.body.data.maxScore).toBeDefined();
      expect(['ACCEPTED', 'WRONG_ANSWER']).toContain(res.body.data.status);
    });

    it('Participant submission history strips scores, verdicts, and test case counts', async () => {
      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${soloUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.submissions.length).toBeGreaterThan(0);

      for (const s of res.body.data.submissions) {
        expect(s.status).toBe('SUBMITTED');
        expect(s.score).toBeUndefined();
        expect(s.passedTests).toBeUndefined();
        expect(s.totalTests).toBeUndefined();
      }
    });

    it('Round 2 questions never leak expectedOutput or reference solutions to participant', async () => {
      // Find Round 2
      const r2 = await prisma.contestRound.findFirst({
        where: { roundNumber: 2 },
      });

      if (r2) {
        await prisma.contestRound.update({
          where: { id: r2.id },
          data: {
            status: RoundStatus.ACTIVE,
            startTime: new Date(Date.now() - 60000),
            endTime: new Date(Date.now() + 3600000),
          },
        });

        const res = await request(app)
          .get(`/api/rounds/${r2.id}`)
          .set('Authorization', `Bearer ${soloUserToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const r2Questions = res.body.data.round.questions || [];
        for (const q of r2Questions) {
          expect(q.expectedOutput).toBeUndefined();
        }
      }
    });
  });

  afterAll(async () => {
    const testEmails = [
      'solo.integrity@codebreak.dev',
      'solo2.integrity@codebreak.dev',
      'admin.integrity@codebreak.dev',
    ];
    await prisma.userSession.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.violation.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
  });
});

import { PrismaClient, ContestStatus, RoundStatus, RoundType } from '@prisma/client';
import { getRound1Templates, getRound2Templates, getRound3Templates } from '../src/utils/roundTemplates.js';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('--- Non-Destructive Production Question Seeder ---');

  // Verify connection
  const [dbInfo]: any = await prisma.$queryRawUnsafe(
    'SELECT current_database(), current_schema(), inet_server_port();'
  );
  console.log('Database connected:', dbInfo);

  // 1. Ensure Active Contest exists
  let contest = await prisma.contest.findFirst({
    where: { title: 'CODEBREAK 2026' },
  });

  if (!contest) {
    console.log('Creating contest "CODEBREAK 2026"...');
    contest = await prisma.contest.create({
      data: {
        title: 'CODEBREAK 2026',
        tagline: 'BREAK THE CODE WITHIN YOU',
        description:
          'Annual Flagship Collegiate Programming Contest featuring fast-paced algorithmic tests, code debugging challenges, and real-time multiplayer problem locking.',
        status: ContestStatus.ACTIVE,
        registrationOpen: true,
        registrationFee: 200.0,
        qualificationCutoff: 10,
        rules:
          'Standard collegiate ACM-ICPC style rules apply. Dual-member teams synchronize in real-time. Fullscreen violation monitors active.',
      },
    });
    console.log('✓ Contest created:', contest.id);
  } else {
    console.log('✓ Contest already exists:', contest.id);
  }

  // 2. Ensure 3 Contest Rounds exist
  const roundConfigs = [
    {
      roundNumber: 1,
      title: 'Round 1: Rapid Code & Logic Sprint',
      description: 'High-velocity technical MCQs, output predictions, and quick fundamental coding questions.',
      type: RoundType.MCQ_OUTPUT_CODING,
      durationMinutes: 45,
    },
    {
      roundNumber: 2,
      title: 'Round 2: Jumbled Code & Debugging Arena',
      description: 'Identify logic bugs, restore scrambled algorithmic blocks, and satisfy strict edge constraints.',
      type: RoundType.DEBUGGING_JUMBLED,
      durationMinutes: 45,
    },
    {
      roundNumber: 3,
      title: 'Round 3: Grand Competitive Finale',
      description: 'Solve complex data structure & dynamic programming challenges against hidden test suites.',
      type: RoundType.FINAL_CODING,
      durationMinutes: 45,
    },
  ];

  const rounds: Record<number, any> = {};

  for (const config of roundConfigs) {
    let round = await prisma.contestRound.findFirst({
      where: {
        contestId: contest.id,
        roundNumber: config.roundNumber,
      },
    });

    if (!round) {
      console.log(`Creating Round ${config.roundNumber}: ${config.title}...`);
      round = await prisma.contestRound.create({
        data: {
          contestId: contest.id,
          roundNumber: config.roundNumber,
          title: config.title,
          description: config.description,
          type: config.type,
          durationMinutes: config.durationMinutes,
          status: RoundStatus.UPCOMING,
        },
      });
      console.log(`✓ Round ${config.roundNumber} created:`, round.id);
    } else {
      console.log(`✓ Round ${config.roundNumber} already exists:`, round.id);
    }
    rounds[config.roundNumber] = round;
  }

  // 3. Populate Questions for each Round idempotently
  const r1Templates = getRound1Templates();
  const roundPacks: { roundNumber: number; templates: any[] }[] = [
    {
      roundNumber: 1,
      templates: [...r1Templates.mcqBits, ...r1Templates.outputPredictions],
    },
    {
      roundNumber: 2,
      templates: getRound2Templates(),
    },
    {
      roundNumber: 3,
      templates: getRound3Templates(),
    },
  ];

  let totalQuestionsCreated = 0;

  for (const pack of roundPacks) {
    const round = rounds[pack.roundNumber];
    console.log(`\nChecking Round ${pack.roundNumber} questions (${pack.templates.length} templates)...`);

    for (let i = 0; i < pack.templates.length; i++) {
      const t = pack.templates[i];

      // Check if question already exists by roundId and title
      const existing = await prisma.question.findFirst({
        where: {
          roundId: round.id,
          title: t.title,
        },
      });

      if (existing) {
        continue;
      }

      await prisma.question.create({
        data: {
          roundId: round.id,
          orderNumber: i + 1,
          title: t.title,
          description: t.description,
          type: t.type,
          difficulty: t.difficulty || 'MEDIUM',
          points: t.points || 10,
          timeLimitMs: t.timeLimitMs || 2000,
          memoryLimitMb: t.memoryLimitMb || 128,
          initialCode: t.initialCode || null,
          expectedOutput: t.expectedOutput || null,
          constraints: t.constraints || null,
          allowedLanguages: t.allowedLanguages || 'python,java,cpp',
          options:
            t.options && t.options.length > 0
              ? {
                  create: t.options.map((opt: any, idx: number) => ({
                    text: opt.text,
                    isCorrect: Boolean(opt.isCorrect),
                    orderNumber: opt.orderNumber || idx + 1,
                    explanation: opt.explanation || null,
                  })),
                }
              : undefined,
          testCases:
            t.testCases && t.testCases.length > 0
              ? {
                  create: t.testCases.map((tc: any) => ({
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    isPublic: tc.isPublic ?? true,
                    weight: tc.weight ?? 1,
                  })),
                }
              : undefined,
        },
      });
      totalQuestionsCreated++;
    }
  }

  // Summary
  const contestCount = await prisma.contest.count();
  const roundCount = await prisma.contestRound.count();
  const questionCount = await prisma.question.count();
  const optionCount = await prisma.questionOption.count();
  const testCaseCount = await prisma.testCase.count();
  const userCount = await prisma.user.count();

  console.log('\n=============================================');
  console.log('Database Status:');
  console.log(`  Users (Untouched): ${userCount}`);
  console.log(`  Contests:          ${contestCount}`);
  console.log(`  Contest Rounds:    ${roundCount}`);
  console.log(`  Total Questions:   ${questionCount} (newly created: ${totalQuestionsCreated})`);
  console.log(`  Question Options:  ${optionCount}`);
  console.log(`  Test Cases:        ${testCaseCount}`);
  console.log('=============================================\n');
}

main()
  .catch((err) => {
    console.error('Error during seeding:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

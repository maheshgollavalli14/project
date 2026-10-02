import { PrismaClient, Role, ContestStatus, RoundStatus, RoundType, QuestionType, Difficulty, SubmissionStatus, Severity, ViolationType, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CODEBREAK Database...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.violation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.score.deleteMany();
  await prisma.savedCode.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.contestRound.deleteMany();
  await prisma.contest.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.contestSetting.deleteMany();

  const passwordHash = await bcrypt.hash('Password@123', 10);
  const adminPasswordHash = await bcrypt.hash('Admin@CodeBreak2026', 10);

  // 1. Create Admin User
  const admin = await prisma.user.create({
    data: {
      email: 'admin@codebreak.dev',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      profile: {
        create: {
          fullName: 'Contest Director Sarah Jenkins',
          college: 'CODEBREAK Technical Committee',
          phone: '+91 9876543210',
          participantId: 'CB-ADM-001',
        },
      },
    },
  });
  console.log('✓ Admin user created: admin@codebreak.dev');

  // 2. Create Individual Participants
  const ind1 = await prisma.user.create({
    data: {
      email: 'alex.chen@mit.edu',
      passwordHash,
      role: Role.PARTICIPANT,
      profile: {
        create: {
          fullName: 'Alex Chen',
          college: 'Massachusetts Institute of Technology',
          phone: '+91 9123456780',
          participantId: 'CB-IND-101',
        },
      },
    },
  });

  const ind2 = await prisma.user.create({
    data: {
      email: 'priya.sharma@iitd.ac.in',
      passwordHash,
      role: Role.PARTICIPANT,
      profile: {
        create: {
          fullName: 'Priya Sharma',
          college: 'IIT Delhi',
          phone: '+91 9123456781',
          participantId: 'CB-IND-102',
        },
      },
    },
  });

  const ind3 = await prisma.user.create({
    data: {
      email: 'marcus.vance@stanford.edu',
      passwordHash,
      role: Role.PARTICIPANT,
      profile: {
        create: {
          fullName: 'Marcus Vance',
          college: 'Stanford University',
          phone: '+91 9123456782',
          participantId: 'CB-IND-103',
        },
      },
    },
  });

  const ind4 = await prisma.user.create({
    data: {
      email: 'rohan.gupta@nitt.edu',
      passwordHash,
      role: Role.PARTICIPANT,
      profile: {
        create: {
          fullName: 'Rohan Gupta',
          college: 'NIT Trichy',
          phone: '+91 9887766551',
          participantId: 'CB-IND-104',
        },
      },
    },
  });

  const ind5 = await prisma.user.create({
    data: {
      email: 'ananya.deshmukh@nitt.edu',
      passwordHash,
      role: Role.PARTICIPANT,
      profile: {
        create: {
          fullName: 'Ananya Deshmukh',
          college: 'NIT Trichy',
          phone: '+91 9887766552',
          participantId: 'CB-IND-105',
        },
      },
    },
  });

  const ind6 = await prisma.user.create({
    data: {
      email: 'dev.kapoor@pilani.bits-pilani.ac.in',
      passwordHash,
      role: Role.PARTICIPANT,
      profile: {
        create: {
          fullName: 'Dev Kapoor',
          college: 'BITS Pilani',
          phone: '+91 9776655441',
          participantId: 'CB-IND-106',
        },
      },
    },
  });

  console.log('✓ Individual participants created');

  // 4. Create Contest & 3 Rounds
  const now = new Date();
  const contest = await prisma.contest.create({
    data: {
      title: 'CODEBREAK 2026',
      tagline: 'BREAK THE CODE WITHIN YOU',
      description: 'Annual Flagship Collegiate Programming Contest featuring fast-paced algorithmic tests, code debugging challenges, and real-time multiplayer problem locking.',
      status: ContestStatus.ACTIVE,
      registrationOpen: true,
      registrationFee: 200.0,
      qualificationCutoff: 20,
      rules: 'Standard collegiate ACM-ICPC style rules apply. Dual-member teams synchronize in real-time. Fullscreen violation monitors active.',
    },
  });

  // Round 1: MCQs + Output Prediction + Simple Coding
  const round1 = await prisma.contestRound.create({
    data: {
      contestId: contest.id,
      roundNumber: 1,
      title: 'Round 1: Rapid Code & Logic Sprint',
      description: 'High-velocity technical MCQs, output predictions, and quick fundamental coding questions.',
      type: RoundType.MCQ_OUTPUT_CODING,
      startTime: now,
      endTime: new Date(now.getTime() + 60 * 60 * 1000), // 60 mins from now
      durationMinutes: 45,
      status: RoundStatus.ACTIVE,
    },
  });

  // Round 2: Jumbled Code & Debugging Arena
  const round2 = await prisma.contestRound.create({
    data: {
      contestId: contest.id,
      roundNumber: 2,
      title: 'Round 2: Jumbled Code & Debugging Arena',
      description: 'Identify logic bugs, restore scrambled algorithmic blocks, and satisfy strict edge constraints.',
      type: RoundType.DEBUGGING_JUMBLED,
      startTime: new Date(now.getTime() + 90 * 60 * 1000),
      endTime: new Date(now.getTime() + 150 * 60 * 1000),
      durationMinutes: 60,
      status: RoundStatus.UPCOMING,
    },
  });

  // Round 3: Grand Competitive Finale
  const round3 = await prisma.contestRound.create({
    data: {
      contestId: contest.id,
      roundNumber: 3,
      title: 'Round 3: Grand Competitive Finale',
      description: 'Solve complex data structure & dynamic programming challenges against hidden test suites.',
      type: RoundType.FINAL_CODING,
      startTime: new Date(now.getTime() + 180 * 60 * 1000),
      endTime: new Date(now.getTime() + 270 * 60 * 1000),
      durationMinutes: 90,
      status: RoundStatus.UPCOMING,
    },
  });

  console.log('✓ Contest & 3 rounds created');

  // 5. Questions for Round 1
  // Q1: MCQ (Bitwise)
  const q1 = await prisma.question.create({
    data: {
      roundId: round1.id,
      orderNumber: 1,
      title: 'Bitwise Optimization Analysis',
      description: 'What is the time complexity and result of the operation `x & (x - 1)` for an integer `x`?',
      type: QuestionType.MCQ,
      difficulty: Difficulty.EASY,
      points: 10,
      options: {
        create: [
          { orderNumber: 1, text: 'O(1) time — Clears the lowest set bit in x', isCorrect: true, explanation: 'Subtracting 1 flips all bits after the lowest set bit, so bitwise AND cancels out the lowest set bit in O(1).' },
          { orderNumber: 2, text: 'O(log n) time — Checks if x is odd', isCorrect: false },
          { orderNumber: 3, text: 'O(n) time — Reverses the binary representation', isCorrect: false },
          { orderNumber: 4, text: 'O(1) time — Multiplies x by 2', isCorrect: false },
        ],
      },
    },
  });

  // Q2: Output Prediction (Python scope & mutability)
  const q2 = await prisma.question.create({
    data: {
      roundId: round1.id,
      orderNumber: 2,
      title: 'Python Closure & Default Mutable Argument',
      description: 'Analyze the following Python snippet and determine the exact console output:\n\n```python\ndef append_to(element, target=[]):\n    target.append(element)\n    return target\n\nlist1 = append_to(10)\nlist2 = append_to(20, [])\nlist3 = append_to(30)\nprint(list1, list2, list3)\n```',
      type: QuestionType.OUTPUT_PREDICTION,
      difficulty: Difficulty.MEDIUM,
      points: 15,
      expectedOutput: '[10, 30] [20] [10, 30]',
      options: {
        create: [
          { orderNumber: 1, text: '[10, 30] [20] [10, 30]', isCorrect: true, explanation: 'Default arguments in Python are evaluated once at function definition time, so list1 and list3 share the same list instance.' },
          { orderNumber: 2, text: '[10] [20] [30]', isCorrect: false },
          { orderNumber: 3, text: '[10, 20, 30] [20] [10, 20, 30]', isCorrect: false },
          { orderNumber: 4, text: 'TypeError: target cannot be mutable', isCorrect: false },
        ],
      },
    },
  });

  // Q3: Simple Coding (Two Sum / Difference)
  const q3 = await prisma.question.create({
    data: {
      roundId: round1.id,
      orderNumber: 3,
      title: 'Target Pair Finder',
      description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. Assume each input has exactly one solution.\n\nInput Format:\nLine 1: N (number of elements)\nLine 2: N space-separated integers\nLine 3: Target integer\n\nOutput Format:\nTwo space-separated indices sorted in ascending order.',
      type: QuestionType.CODING,
      difficulty: Difficulty.EASY,
      points: 25,
      initialCode: `import sys

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    nums = [int(x) for x in lines[1:n+1]]
    target = int(lines[n+1])
    
    # Write your solution here
    seen = {}
    for i, val in enumerate(nums):
        diff = target - val
        if diff in seen:
            print(f"{seen[diff]} {i}")
            return
        seen[val] = i

if __name__ == '__main__':
    solve()
`,
      constraints: '2 <= N <= 10^5, -10^9 <= nums[i] <= 10^9',
      testCases: {
        create: [
          { input: "4\n2 7 11 15\n9", expectedOutput: "0 1", isPublic: true, weight: 1 },
          { input: "3\n3 2 4\n6", expectedOutput: "1 2", isPublic: true, weight: 1 },
          { input: "5\n1 5 3 7 9\n12", expectedOutput: "2 4", isPublic: false, weight: 2 },
          { input: "6\n-3 4 3 90 2 1\n0", expectedOutput: "0 2", isPublic: false, weight: 2 },
        ],
      },
    },
  });

  // 6. Questions for Round 2: Jumbled & Debugging
  // Q4: Debugging (Binary Search with integer overflow bug)
  const q4 = await prisma.question.create({
    data: {
      roundId: round2.id,
      orderNumber: 1,
      title: 'Fix The Binary Search',
      description: 'The given code attempts to find the first occurrence of an integer `target` in a sorted array. However, it contains an off-by-one bug and potential infinite loop on boundary conditions. Debug and repair the implementation so all test cases pass.',
      type: QuestionType.DEBUGGING,
      difficulty: Difficulty.MEDIUM,
      points: 30,
      initialCode: `import sys

def find_target(arr, target):
    low = 0
    high = len(arr) # BUG 1: Should be len(arr) - 1
    ans = -1
    while low <= high:
        mid = (low + high) // 2
        if mid >= len(arr):
            break
        if arr[mid] == target:
            ans = mid
            high = mid - 1 # Keep searching left for first occurrence
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return ans

def main():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    arr = [int(x) for x in input_data[1:n+1]]
    target = int(input_data[n+1])
    print(find_target(arr, target))

if __name__ == '__main__':
    main()
`,
      expectedOutput: 'Index of first occurrence or -1',
      testCases: {
        create: [
          { input: "5\n1 2 2 2 3\n2", expectedOutput: "1", isPublic: true, weight: 1 },
          { input: "4\n1 3 5 7\n6", expectedOutput: "-1", isPublic: true, weight: 1 },
          { input: "6\n4 4 4 4 4 4\n4", expectedOutput: "0", isPublic: false, weight: 2 },
          { input: "5\n10 20 30 40 50\n50", expectedOutput: "4", isPublic: false, weight: 2 },
        ],
      },
    },
  });

  // Q5: Jumbled Code (Valid Palindrome after deleting at most one character)
  const q5 = await prisma.question.create({
    data: {
      roundId: round2.id,
      orderNumber: 2,
      title: 'Unscramble: Almost Palindrome',
      description: 'The logic to check if a string can become a palindrome by removing at most one character has been scrambled. Reorder the blocks and output `YES` or `NO`.',
      type: QuestionType.JUMBLED,
      difficulty: Difficulty.MEDIUM,
      points: 35,
      initialCode: `import sys

# SCRAMBLED BLOCKS:
# Block A:
#     return is_pal(s, left + 1, right) or is_pal(s, left, right - 1)
# Block B:
#     while left < right:
#         if s[left] != s[right]:
#             return Block A
#         left += 1
#         right -= 1
#     return True
# Block C:
#     def is_pal(sub, l, r):
#         return sub[l:r+1] == sub[l:r+1][::-1]

def valid_almost_palindrome(s):
    def is_pal(sub, l, r):
        return sub[l:r+1] == sub[l:r+1][::-1]
        
    left, right = 0, len(s) - 1
    while left < right:
        if s[left] != s[right]:
            return is_pal(s, left + 1, right) or is_pal(s, left, right - 1)
        left += 1
        right -= 1
    return True

def main():
    s = sys.stdin.read().strip()
    if not s:
        return
    print("YES" if valid_almost_palindrome(s) else "NO")

if __name__ == '__main__':
    main()
`,
      testCases: {
        create: [
          { input: "aba", expectedOutput: "YES", isPublic: true, weight: 1 },
          { input: "abca", expectedOutput: "YES", isPublic: true, weight: 1 },
          { input: "abcde", expectedOutput: "NO", isPublic: false, weight: 2 },
          { input: "deeee", expectedOutput: "YES", isPublic: false, weight: 2 },
        ],
      },
    },
  });

  // 7. Questions for Round 3: Competitive Programming
  // Q6: Max Subarray Sum / Kadane with Constraints
  const q6 = await prisma.question.create({
    data: {
      roundId: round3.id,
      orderNumber: 1,
      title: 'Maximum Subarray Circular Harmony',
      description: 'Given a circular integer array `nums` of length `n`, return the maximum possible sum of a non-empty subarray of `nums`.\n\nA circular array means the end of the array connects to the beginning of the array. Formally, the next element of `nums[i]` is `nums[(i + 1) % n]` and the previous element of `nums[i]` is `nums[(i - 1 + n) % n]`.\n\nInput Format:\nLine 1: An integer `N`\nLine 2: `N` space-separated integers\n\nOutput Format:\nA single integer representing the maximum circular subarray sum.',
      type: QuestionType.CODING,
      difficulty: Difficulty.MEDIUM,
      points: 50,
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      initialCode: `import sys

def maxSubarraySumCircular(nums):
    total_sum = 0
    curr_max = 0
    max_sum = -float('inf')
    curr_min = 0
    min_sum = float('inf')
    
    for x in nums:
        total_sum += x
        curr_max = max(x, curr_max + x)
        max_sum = max(max_sum, curr_max)
        curr_min = min(x, curr_min + x)
        min_sum = min(min_sum, curr_min)
        
    if max_sum < 0:
        return max_sum
    return max(max_sum, total_sum - min_sum)

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    nums = [int(x) for x in data[1:n+1]]
    print(maxSubarraySumCircular(nums))

if __name__ == '__main__':
    main()
`,
      constraints: '1 <= N <= 3 * 10^4, -3 * 10^4 <= nums[i] <= 3 * 10^4',
      testCases: {
        create: [
          { input: "4\n1 -2 3 -2", expectedOutput: "3", isPublic: true, weight: 1 },
          { input: "3\n5 -3 5", expectedOutput: "10", isPublic: true, weight: 1 },
          { input: "4\n-3 -2 -3 -1", expectedOutput: "-1", isPublic: false, weight: 2 },
          { input: "6\n3 -1 2 -1 3 4", expectedOutput: "11", isPublic: false, weight: 2 },
        ],
      },
    },
  });

  // Q7: Longest Increasing Subsequence with Reconstruction
  const q7 = await prisma.question.create({
    data: {
      roundId: round3.id,
      orderNumber: 2,
      title: 'Quantum Gateway Matrix Length',
      description: 'Determine the length of the longest strictly increasing subsequence in an array of numbers.\n\nInput Format:\nLine 1: N\nLine 2: N space-separated integers\n\nOutput Format:\nLength of the longest strictly increasing subsequence.',
      type: QuestionType.CODING,
      difficulty: Difficulty.HARD,
      points: 75,
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      initialCode: `import sys
import bisect

def solve():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    nums = [int(x) for x in data[1:n+1]]
    
    tails = []
    for x in nums:
        idx = bisect.bisect_left(tails, x)
        if idx == len(tails):
            tails.append(x)
        else:
            tails[idx] = x
    print(len(tails))

if __name__ == '__main__':
    solve()
`,
      constraints: '1 <= N <= 10^5, -10^9 <= nums[i] <= 10^9',
      testCases: {
        create: [
          { input: "6\n10 9 2 5 3 7", expectedOutput: "3", isPublic: true, weight: 1 },
          { input: "6\n0 1 0 3 2 3", expectedOutput: "4", isPublic: true, weight: 1 },
          { input: "7\n7 7 7 7 7 7 7", expectedOutput: "1", isPublic: false, weight: 2 },
          { input: "8\n10 22 9 33 21 50 41 60", expectedOutput: "5", isPublic: false, weight: 3 },
        ],
      },
    },
  });

  console.log('✓ Questions and test cases for all 3 rounds created');

  // 8. Create Sample Payments
  await prisma.payment.createMany({
    data: [
      { userId: ind1.id, amount: 200, transactionId: 'TXN-982401', status: PaymentStatus.COMPLETED, provider: 'MOCK_GATEWAY' },
      { userId: ind2.id, amount: 200, transactionId: 'TXN-982402', status: PaymentStatus.COMPLETED, provider: 'MOCK_GATEWAY' },
      { userId: ind3.id, amount: 200, transactionId: 'TXN-982403', status: PaymentStatus.COMPLETED, provider: 'MOCK_GATEWAY' },
      { userId: ind4.id, amount: 200, transactionId: 'TXN-982404', status: PaymentStatus.COMPLETED, provider: 'MOCK_GATEWAY' },
      { userId: ind5.id, amount: 200, transactionId: 'TXN-982405', status: PaymentStatus.COMPLETED, provider: 'MOCK_GATEWAY' },
      { userId: ind6.id, amount: 200, transactionId: 'TXN-982406', status: PaymentStatus.COMPLETED, provider: 'MOCK_GATEWAY' },
    ],
  });

  // 9. Create Sample Submissions & Scores
  await prisma.submission.create({
    data: {
      questionId: q3.id,
      userId: ind1.id,
      roundId: round1.id,
      language: 'python',
      code: q3.initialCode || '',
      status: SubmissionStatus.ACCEPTED,
      score: 25,
      runtimeMs: 42,
      memoryKb: 14200,
      passedTests: 4,
      totalTests: 4,
    },
  });

  await prisma.submission.create({
    data: {
      questionId: q3.id,
      userId: ind4.id,
      roundId: round1.id,
      language: 'python',
      code: q3.initialCode || '',
      status: SubmissionStatus.ACCEPTED,
      score: 25,
      runtimeMs: 38,
      memoryKb: 14100,
      passedTests: 4,
      totalTests: 4,
    },
  });

  // Scores
  await prisma.score.create({
    data: {
      contestId: contest.id,
      roundId: round1.id,
      userId: ind1.id,
      points: 50,
      solvedCount: 3,
      penaltySeconds: 380,
      isQualified: true,
      rank: 1,
    },
  });

  await prisma.score.create({
    data: {
      contestId: contest.id,
      roundId: round1.id,
      userId: ind4.id,
      points: 45,
      solvedCount: 3,
      penaltySeconds: 420,
      isQualified: true,
      rank: 2,
    },
  });

  await prisma.score.create({
    data: {
      contestId: contest.id,
      roundId: round1.id,
      userId: ind6.id,
      points: 25,
      solvedCount: 1,
      penaltySeconds: 850,
      isQualified: false,
      rank: 3,
    },
  });

  // 10. Sample Anti-cheating Violation
  await prisma.violation.create({
    data: {
      userId: ind3.id,
      contestId: contest.id,
      roundId: round1.id,
      type: ViolationType.TAB_SWITCH,
      severity: Severity.LOW,
      metadata: JSON.stringify({ reason: 'Visibility change detected: tab blurred for 4.2 seconds' }),
      reviewed: false,
    },
  });

  // 11. Initial Contest Settings
  const defaultSettings = [
    { key: 'ANTI_CHEAT_FULLSCREEN_MANDATORY', value: 'true', description: 'Require fullscreen for coding rounds' },
    { key: 'MAX_VIOLATIONS_BEFORE_WARNING', value: '3', description: 'Count before participant receives strict warning' },
    { key: 'LEADERBOARD_FROZEN', value: 'false', description: 'Freeze leaderboard during final 15 minutes' },
    { key: 'TIE_BREAK_STRATEGY', value: 'POINTS_THEN_SOLVED_THEN_TIME', description: 'Leaderboard tie-breaker rules' },
  ];

  for (const s of defaultSettings) {
    await prisma.contestSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  console.log('✅ CODEBREAK Database Seeding Complete!');
  console.log('----------------------------------------------------');
  console.log('Admin Account:        admin@codebreak.dev / Admin@CodeBreak2026');
  console.log('Participant 1:        alex.chen@mit.edu / Password@123');
  console.log('Participant 2:        priya.sharma@iitd.ac.in / Password@123');
  console.log('Participant 3:        marcus.vance@stanford.edu / Password@123');
  console.log('Participant 4:        rohan.gupta@nitt.edu / Password@123');
  console.log('Participant 5:        ananya.deshmukh@nitt.edu / Password@123');
  console.log('Participant 6:        dev.kapoor@pilani.bits-pilani.ac.in / Password@123');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

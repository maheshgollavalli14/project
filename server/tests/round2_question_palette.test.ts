import { describe, it, expect } from 'vitest';

// Model definition for Question as used in client/src/types
interface Question {
  id: string;
  roundId: string;
  orderNumber: number;
  title: string;
  description: string;
  type: string;
  initialCode?: string | null;
  savedState?: {
    questionId: string;
    code?: string | null;
    selectedOptionId?: string | null;
  } | null;
  submissions?: Array<{ id: string; status: string; score: number }>;
}

/**
 * Exactly mirrors Round 2's isQuestionAttempted implementation from client/src/pages/contest/Round2.tsx
 */
function createRound2AttemptEvaluator(
  currentIndex: number,
  currentEditorCode: string,
  submissionFeedback: { submitted?: boolean } | null,
  submittedQuestions: Set<string>
) {
  return (q: Question, idx: number): boolean => {
    // 1. If officially submitted, it is attempted
    if (
      submittedQuestions.has(q.id) ||
      (q.submissions && q.submissions.length > 0) ||
      (idx === currentIndex && submissionFeedback?.submitted)
    ) {
      return true;
    }

    // 2. Check the code for this question
    const currentCode = idx === currentIndex ? currentEditorCode : q.savedState?.code;
    if (!currentCode) {
      return false;
    }

    const normalize = (str?: string | null) => (str || '').replace(/\r\n/g, '\n').trim();
    const normalizedCurrent = normalize(currentCode);

    if (normalizedCurrent.length === 0) {
      return false;
    }

    const initial = normalize(q.initialCode);

    // 3. If there is initial starter code, it is only attempted if modified
    if (initial.length > 0) {
      return normalizedCurrent !== initial;
    }

    // 4. If there was no initial starter code, any non-empty code is an attempt
    return normalizedCurrent.length > 0;
  };
}

describe('Round 2 Question Palette State & Tick-Mark Verification Suite', () => {
  // Setup 4 mock questions for Round 2 with realistic starter templates
  const questions: Question[] = [
    {
      id: 'q1',
      roundId: 'r2',
      orderNumber: 1,
      title: 'Problem 1: Reverse String Bug',
      description: 'Fix the off-by-one error',
      type: 'DEBUGGING',
      initialCode: 'def reverse_str(s):\n    return s[::-1] # bug template',
      savedState: null,
      submissions: [],
    },
    {
      id: 'q2',
      roundId: 'r2',
      orderNumber: 2,
      title: 'Problem 2: Array Sum Jumbled',
      description: 'Reconstruct lines to sum array',
      type: 'JUMBLED',
      initialCode: '# Jumbled snippet:\nsum = 0\nfor x in arr:\npass',
      savedState: null,
      submissions: [],
    },
    {
      id: 'q3',
      roundId: 'r2',
      orderNumber: 3,
      title: 'Problem 3: Binary Search Edge Case',
      description: 'Fix integer overflow in midpoint',
      type: 'DEBUGGING',
      initialCode: 'def bsearch(arr, target):\n    mid = (low + high) / 2',
      savedState: null,
      submissions: [],
    },
    {
      id: 'q4',
      roundId: 'r2',
      orderNumber: 4,
      title: 'Problem 4: Factorial Recursion',
      description: 'Add missing base case',
      type: 'DEBUGGING',
      initialCode: 'def fact(n):\n    return n * fact(n - 1)',
      savedState: null,
      submissions: [],
    },
  ];

  it('Test A: Click/Open Question 1 -> Question 1 opens, NO tick mark appears', () => {
    let currentIndex = 0;
    let editorCode = questions[0].initialCode!;
    const submittedQuestions = new Set<string>();
    const isAttempted = createRound2AttemptEvaluator(currentIndex, editorCode, null, submittedQuestions);

    expect(isAttempted(questions[0], 0)).toBe(false);
    expect(isAttempted(questions[1], 1)).toBe(false);
    expect(isAttempted(questions[2], 2)).toBe(false);
    expect(isAttempted(questions[3], 3)).toBe(false);
  });

  it('Test B: Click/Open Question 2 -> Question 2 opens, NO tick mark on Q1 or Q2', () => {
    // Navigating from Q1 to Q2 saves Q1's editor code (which was untouched initialCode)
    questions[0].savedState = { questionId: 'q1', code: questions[0].initialCode };
    let currentIndex = 1;
    let editorCode = questions[1].initialCode!;
    const submittedQuestions = new Set<string>();
    const isAttempted = createRound2AttemptEvaluator(currentIndex, editorCode, null, submittedQuestions);

    expect(isAttempted(questions[0], 0)).toBe(false);
    expect(isAttempted(questions[1], 1)).toBe(false);
    expect(isAttempted(questions[2], 2)).toBe(false);
    expect(isAttempted(questions[3], 3)).toBe(false);
  });

  it('Test C: Click/Open Question 3 -> Question 3 opens, NO tick mark on Q1, Q2, or Q3', () => {
    questions[1].savedState = { questionId: 'q2', code: questions[1].initialCode };
    let currentIndex = 2;
    let editorCode = questions[2].initialCode!;
    const submittedQuestions = new Set<string>();
    const isAttempted = createRound2AttemptEvaluator(currentIndex, editorCode, null, submittedQuestions);

    expect(isAttempted(questions[0], 0)).toBe(false);
    expect(isAttempted(questions[1], 1)).toBe(false);
    expect(isAttempted(questions[2], 2)).toBe(false);
    expect(isAttempted(questions[3], 3)).toBe(false);
  });

  it('Test D: Click/Open Question 4 -> Question 4 opens, NO tick mark on any question', () => {
    questions[2].savedState = { questionId: 'q3', code: questions[2].initialCode };
    let currentIndex = 3;
    let editorCode = questions[3].initialCode!;
    const submittedQuestions = new Set<string>();
    const isAttempted = createRound2AttemptEvaluator(currentIndex, editorCode, null, submittedQuestions);

    for (let i = 0; i < 4; i++) {
      expect(isAttempted(questions[i], i)).toBe(false);
    }
  });

  it('Test E: Actually answer/modify Q2 -> tick appears for Q2 according to existing logic', () => {
    // Navigate back to Q2
    let currentIndex = 1;
    // Participant actually modifies Q2's code
    let editorCode = '# Modified by participant\nsum = 0\nfor x in arr:\n    sum += x\nreturn sum';
    const submittedQuestions = new Set<string>();
    const isAttempted = createRound2AttemptEvaluator(currentIndex, editorCode, null, submittedQuestions);

    // Q2 is now modified/attempted
    expect(isAttempted(questions[1], 1)).toBe(true);

    // Q1, Q3, Q4 remain untouched and unattempted
    expect(isAttempted(questions[0], 0)).toBe(false);
    expect(isAttempted(questions[2], 2)).toBe(false);
    expect(isAttempted(questions[3], 3)).toBe(false);
  });

  it('Test F: Navigate away to Q3 and return to Q2 -> Q2 retains its tick mark', () => {
    // 1. Navigate away from Q2 to Q3
    const modifiedQ2Code = '# Modified by participant\nsum = 0\nfor x in arr:\n    sum += x\nreturn sum';
    questions[1].savedState = { questionId: 'q2', code: modifiedQ2Code };

    let currentIndex = 2; // On Q3
    let editorCode = questions[2].initialCode!;
    const submittedQuestions = new Set<string>();
    let isAttempted = createRound2AttemptEvaluator(currentIndex, editorCode, null, submittedQuestions);

    // While on Q3: Q2 retains its attempted state
    expect(isAttempted(questions[1], 1)).toBe(true);
    expect(isAttempted(questions[2], 2)).toBe(false);

    // 2. Return to Q2
    currentIndex = 1;
    editorCode = questions[1].savedState!.code!;
    isAttempted = createRound2AttemptEvaluator(currentIndex, editorCode, null, submittedQuestions);

    // Returning to Q2 restores Q2's code and retains its tick
    expect(editorCode).toBe(modifiedQ2Code);
    expect(isAttempted(questions[1], 1)).toBe(true);
    expect(isAttempted(questions[0], 0)).toBe(false);
    expect(isAttempted(questions[2], 2)).toBe(false);
    expect(isAttempted(questions[3], 3)).toBe(false);
  });

  it('Test G: Refresh -> persisted answer state remains', () => {
    // Simulating page refresh by re-initializing from savedState
    const refreshedQuestions: Question[] = JSON.parse(JSON.stringify(questions));

    // Q2 has saved modified code, other questions have untouched initialCode
    let currentIndex = 0; // Starts on Q1 after refresh
    let editorCode = refreshedQuestions[0].savedState?.code || refreshedQuestions[0].initialCode!;
    const submittedQuestions = new Set<string>();
    const isAttempted = createRound2AttemptEvaluator(currentIndex, editorCode, null, submittedQuestions);

    expect(isAttempted(refreshedQuestions[1], 1)).toBe(true);
    expect(isAttempted(refreshedQuestions[0], 0)).toBe(false);
    expect(isAttempted(refreshedQuestions[2], 2)).toBe(false);
    expect(isAttempted(refreshedQuestions[3], 3)).toBe(false);
  });

  it('Test H: Open unanswered questions without answering -> they remain unattempted', () => {
    // User clicks through all unanswered questions
    for (const targetIdx of [0, 2, 3]) {
      const editorCode = questions[targetIdx].savedState?.code || questions[targetIdx].initialCode!;
      const isAttempted = createRound2AttemptEvaluator(targetIdx, editorCode, null, new Set());

      // Target question must NOT be marked attempted merely from opening
      expect(isAttempted(questions[targetIdx], targetIdx)).toBe(false);
    }
  });

  it('Test I: Windows newline normalization (CRLF vs LF) does not trigger false attempt', () => {
    // If backend returns initialCode with CRLF but editor produces LF, it should NOT count as a change
    const qWithCRLF: Question = {
      id: 'q_crlf',
      roundId: 'r2',
      orderNumber: 5,
      title: 'CRLF Test Question',
      description: 'Testing newline format',
      type: 'DEBUGGING',
      initialCode: 'def test():\r\n    return True\r\n',
      savedState: null,
      submissions: [],
    };

    const monacoLFCode = 'def test():\n    return True\n';
    const isAttempted = createRound2AttemptEvaluator(0, monacoLFCode, null, new Set());

    expect(isAttempted(qWithCRLF, 0)).toBe(false);
  });

  it('Test J: Question with no initial code is attempted when non-empty code is written', () => {
    const qNoInitial: Question = {
      id: 'q_blank',
      roundId: 'r2',
      orderNumber: 6,
      title: 'Blank Starter Question',
      description: 'Write from scratch',
      type: 'CODING',
      initialCode: null,
      savedState: null,
      submissions: [],
    };

    // Initially blank -> false
    let isAttempted = createRound2AttemptEvaluator(0, '', null, new Set());
    expect(isAttempted(qNoInitial, 0)).toBe(false);

    // Participant writes code -> true
    isAttempted = createRound2AttemptEvaluator(0, 'print("hello")', null, new Set());
    expect(isAttempted(qNoInitial, 0)).toBe(true);
  });
});

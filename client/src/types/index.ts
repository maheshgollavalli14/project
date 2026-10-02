export type Role = 'PARTICIPANT' | 'ADMIN';

export type ContestStatus = 'UPCOMING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export type RoundStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

export type RoundType = 'MCQ_OUTPUT_CODING' | 'DEBUGGING_JUMBLED' | 'FINAL_CODING';

export type QuestionType = 'MCQ' | 'OUTPUT_PREDICTION' | 'DEBUGGING' | 'JUMBLED' | 'CODING';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type SubmissionStatus = 
  | 'PENDING' 
  | 'RUNNING' 
  | 'ACCEPTED' 
  | 'WRONG_ANSWER' 
  | 'TIME_LIMIT_EXCEEDED' 
  | 'COMPILATION_ERROR' 
  | 'RUNTIME_ERROR';

export type ViolationType = 
  | 'FULLSCREEN_EXIT' 
  | 'TAB_SWITCH' 
  | 'COPY' 
  | 'PASTE' 
  | 'WINDOW_BLUR' 
  | 'SUSPICIOUS_ACTIVITY';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  profile?: Profile;
}

export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  college: string;
  phone: string;
  participantId: string;
  avatarUrl?: string;
}

export interface Contest {
  id: string;
  title: string;
  tagline: string;
  description: string;
  status: ContestStatus;
  registrationOpen: boolean;
  registrationFee: number;
  qualificationCutoff: number;
  rules?: string;
  rounds?: ContestRound[];
}

export interface ContestRound {
  id: string;
  contestId: string;
  roundNumber: number;
  title: string;
  description: string;
  type: RoundType;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes: number;
  status: RoundStatus;
  questions?: Question[];
  isArenaOpen?: boolean;
  isFinalized?: boolean;
}

export interface QuestionOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect?: boolean;
  explanation?: string;
  orderNumber: number;
}

export interface TestCase {
  id: string;
  questionId: string;
  input: string;
  expectedOutput: string;
  isPublic: boolean;
  weight: number;
}

export interface Question {
  id: string;
  roundId: string;
  orderNumber: number;
  title: string;
  description: string;
  type: QuestionType;
  difficulty: Difficulty;
  points: number;
  timeLimitMs: number;
  memoryLimitMb: number;
  initialCode?: string | null;
  expectedOutput?: string | null;
  constraints?: string | null;
  allowedLanguages: string;
  options?: QuestionOption[];
  testCases?: TestCase[];
  savedState?: SavedCode | null;
  submissions?: any[];
}

export interface SavedCode {
  id?: string;
  questionId: string;
  userId?: string;
  code?: string | null;
  language?: string | null;
  selectedOptionId?: string | null;
  markedForReview?: boolean;
  updatedAt?: string;
}

export interface Submission {
  id: string;
  questionId: string;
  userId: string;
  roundId: string;
  language: string;
  code: string;
  status: SubmissionStatus;
  score: number;
  runtimeMs?: number | null;
  memoryKb?: number | null;
  passedTests: number;
  totalTests: number;
  errorOutput?: string | null;
  createdAt: string;
  question?: {
    title: string;
    points: number;
  };
}

export interface Score {
  id: string;
  contestId: string;
  roundId?: string | null;
  userId?: string | null;
  points: number;
  solvedCount: number;
  penaltySeconds: number;
  isQualified: boolean;
  rank?: number | null;
  user?: User;
}

export interface LeaderboardEntry {
  rank: number;
  id: string; // userId
  name: string;
  code: string; // participantId
  college: string;
  solvedCount: number;
  points: number;
  penaltySeconds: number;
  isQualified: boolean;
  roundScores?: Record<number, number>;
}

export interface Violation {
  id: string;
  userId: string;
  contestId: string;
  roundId?: string | null;
  type: ViolationType;
  severity: Severity;
  metadata?: string | null;
  reviewed: boolean;
  adminNote?: string | null;
  createdAt: string;
  user?: {
    email: string;
    profile?: {
      fullName: string;
      participantId: string;
      college: string;
    };
  };
}

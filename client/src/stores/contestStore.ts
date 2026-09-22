import { create } from 'zustand';
import { Contest, ContestRound, ProblemLock, Question } from '../types/index.js';

interface ContestState {
  contest: Contest | null;
  activeRound: ContestRound | null;
  remainingSeconds: number;
  activeLocks: Record<string, { userId: string; fullName: string; isLockedByMe: boolean; expiresAt: string }>;
  teammateOnline: boolean;
  violationsCount: number;
  setContest: (contest: Contest | null) => void;
  setActiveRound: (round: ContestRound | null) => void;
  setRemainingSeconds: (seconds: number) => void;
  decrementTimer: () => void;
  setProblemLock: (questionId: string, lockData: { userId: string; fullName: string; isLockedByMe: boolean; expiresAt: string } | null) => void;
  setTeammateOnline: (online: boolean) => void;
  incrementViolations: () => void;
}

export const useContestStore = create<ContestState>((set) => ({
  contest: null,
  activeRound: null,
  remainingSeconds: 0,
  activeLocks: {},
  teammateOnline: false,
  violationsCount: 0,

  setContest: (contest) => set({ contest }),

  setActiveRound: (activeRound) =>
    set({
      activeRound,
      remainingSeconds: activeRound ? (activeRound as any).remainingSeconds || 0 : 0,
    }),

  setRemainingSeconds: (remainingSeconds) => set({ remainingSeconds }),

  decrementTimer: () =>
    set((state) => ({
      remainingSeconds: Math.max(0, state.remainingSeconds - 1),
    })),

  setProblemLock: (questionId, lockData) =>
    set((state) => {
      const locks = { ...state.activeLocks };
      if (!lockData) {
        delete locks[questionId];
      } else {
        locks[questionId] = lockData;
      }
      return { activeLocks: locks };
    }),

  setTeammateOnline: (teammateOnline) => set({ teammateOnline }),

  incrementViolations: () => set((state) => ({ violationsCount: state.violationsCount + 1 })),
}));

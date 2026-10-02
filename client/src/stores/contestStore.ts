import { create } from 'zustand';
import { Contest, ContestRound, Question } from '../types/index.js';

interface ContestState {
  contest: Contest | null;
  activeRound: ContestRound | null;
  remainingSeconds: number;
  violationsCount: number;
  setContest: (contest: Contest | null) => void;
  setActiveRound: (round: ContestRound | null) => void;
  setRemainingSeconds: (seconds: number) => void;
  decrementTimer: () => void;
  incrementViolations: () => void;
}

export const useContestStore = create<ContestState>((set) => ({
  contest: null,
  activeRound: null,
  remainingSeconds: 0,
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

  incrementViolations: () => set((state) => ({ violationsCount: state.violationsCount + 1 })),
}));

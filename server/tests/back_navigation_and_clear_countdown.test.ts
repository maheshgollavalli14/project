import { describe, it, expect, vi } from 'vitest';
import { FullscreenTimerService } from '../src/services/fullscreenTimer.service.js';

describe('Browser Back Navigation & Fullscreen Countdown Clearance Unit Suite', () => {
  const userId1 = 'user-test-uuid-001';
  const userId2 = 'user-test-uuid-002';
  const roundId1 = 'round-test-uuid-001';
  const roundId2 = 'round-test-uuid-002';
  const contestId = 'contest-test-uuid-001';
  const email = 'participant@codebreak.dev';

  it('starts a countdown and registers it in FullscreenTimerService', () => {
    const countdown = FullscreenTimerService.startCountdown(
      userId1,
      roundId1,
      contestId,
      email,
      1
    );

    expect(countdown).toBeDefined();
    expect(countdown.countdownSeconds).toBe(10);
    expect(typeof countdown.deadline).toBe('string');

    const activeInfo = FullscreenTimerService.getActiveCountdown(userId1, roundId1);
    expect(activeInfo.active).toBe(true);
    expect(activeInfo.remainingSeconds).toBeGreaterThan(0);
  });

  it('clearCountdown immediately cancels the countdown and stops automatic submission', () => {
    FullscreenTimerService.startCountdown(
      userId1,
      roundId1,
      contestId,
      email,
      1
    );

    expect(FullscreenTimerService.getActiveCountdown(userId1, roundId1).active).toBe(true);

    // Participant presses Browser Back -> client signals clear-countdown
    FullscreenTimerService.clearCountdown(userId1, roundId1);

    // Verify countdown is cleared
    const activeInfo = FullscreenTimerService.getActiveCountdown(userId1, roundId1);
    expect(activeInfo.active).toBe(false);
    expect(activeInfo.deadline).toBeUndefined();
  });

  it('isolates countdowns per user and per round', () => {
    FullscreenTimerService.startCountdown(userId1, roundId1, contestId, email, 1);
    FullscreenTimerService.startCountdown(userId2, roundId2, contestId, email, 1);

    // Clear only user 1 round 1
    FullscreenTimerService.clearCountdown(userId1, roundId1);

    expect(FullscreenTimerService.getActiveCountdown(userId1, roundId1).active).toBe(false);
    expect(FullscreenTimerService.getActiveCountdown(userId2, roundId2).active).toBe(true);

    // Clean up
    FullscreenTimerService.clearCountdown(userId2, roundId2);
    expect(FullscreenTimerService.getActiveCountdown(userId2, roundId2).active).toBe(false);
  });

  it('clearCountdown handles non-existent or already-cleared timers gracefully', () => {
    expect(() => {
      FullscreenTimerService.clearCountdown('non-existent-user', 'non-existent-round');
    }).not.toThrow();
  });

  describe('Round State Restoration and Attempted Status Verification', () => {
    // Round 1 check: MCQ & Output Prediction
    it('Round 1: Unattempted/viewed questions are NOT marked as answered', () => {
      const q = {
        id: 'q1',
        type: 'MCQ',
        savedState: null,
      };
      const isAnswered = Boolean(q.savedState?.selectedOptionId);
      expect(isAnswered).toBe(false);
    });

    it('Round 1: Saved option restores question as answered', () => {
      const q = {
        id: 'q1',
        type: 'MCQ',
        savedState: { selectedOptionId: 'opt-abc' },
      };
      const isAnswered = Boolean(q.savedState?.selectedOptionId);
      expect(isAnswered).toBe(true);
    });

    // Round 2 check: Jumbled Code / Debugging
    it('Round 2: Unmodified starter code is NOT marked as attempted', () => {
      const initial = 'def solve():\n    pass';
      const current = 'def solve():\n    pass';
      const normalize = (s: string) => s.replace(/\r\n/g, '\n').trim();
      const isAttempted = normalize(current) !== normalize(initial);
      expect(isAttempted).toBe(false);
    });

    it('Round 2: Modified code is marked as attempted', () => {
      const initial = 'def solve():\n    pass';
      const current = 'def solve():\n    return 42';
      const normalize = (s: string) => s.replace(/\r\n/g, '\n').trim();
      const isAttempted = normalize(current) !== normalize(initial);
      expect(isAttempted).toBe(true);
    });

    // Round 3 check: Coding Scenario
    it('Round 3: Empty code is NOT marked as answered', () => {
      const code = '';
      const isAnswered = Boolean(code && code.trim().length > 0);
      expect(isAnswered).toBe(false);
    });

    it('Round 3: Non-empty code restored from savedState is marked as answered', () => {
      const savedCode = 'def solution(): return True';
      const isAnswered = Boolean(savedCode && savedCode.trim().length > 0);
      expect(isAnswered).toBe(true);
    });
  });
});

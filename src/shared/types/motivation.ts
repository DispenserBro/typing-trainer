export type MotivationGoalId =
  | 'practice-sessions'
  | 'practice-minutes'
  | 'target-speed-sessions'
  | 'high-accuracy-sessions'
  | 'game-victories';

export type MotivationStreakId =
  | 'flawless-practice'
  | 'successful-practice'
  | 'clean-game-victories';

export type MotivationChallengeGoalId =
  | 'practice-sessions'
  | 'practice-minutes'
  | 'rhythm-sessions'
  | 'target-speed-sessions'
  | 'high-accuracy-sessions'
  | 'flawless-practice'
  | 'game-levels'
  | 'game-victories'
  | 'clean-game-victories';

export type MotivationSeasonThemeId =
  | 'consistency'
  | 'precision'
  | 'adventure'
  | 'balanced';

export interface MotivationTotals {
  practiceSessions: number;
  practiceMinutes: number;
  targetSpeedSessions: number;
  highAccuracySessions: number;
  flawlessPracticeSessions: number;
  successfulPracticeSessions: number;
  gameVictories: number;
  cleanGameVictories: number;
}

export interface MotivationStreakProgress {
  current: number;
  best: number;
}

export interface MotivationChallengeProgress {
  current: number;
  completedAt: string | null;
}

export interface MotivationStreaks {
  flawlessPractice: MotivationStreakProgress;
  successfulPractice: MotivationStreakProgress;
  cleanGameVictories: MotivationStreakProgress;
}

export type MotivationWeeklyGoals = Record<MotivationChallengeGoalId, MotivationChallengeProgress>;

export interface MotivationWeeklyState {
  weekKey: string;
  startedAt: string;
  endsAt: string;
  templateId: string;
  activeGoalIds: MotivationChallengeGoalId[];
  goals: MotivationWeeklyGoals;
}

export type MotivationSeasonGoals = Record<MotivationChallengeGoalId, MotivationChallengeProgress>;

export interface MotivationSeasonState {
  cycleKey: string;
  startedAt: string;
  endsAt: string;
  themeId: MotivationSeasonThemeId;
  featuredGoalIds: MotivationChallengeGoalId[];
  goals: MotivationSeasonGoals;
}

export interface MotivationProgress {
  totals: MotivationTotals;
  streaks: MotivationStreaks;
  weekly: MotivationWeeklyState;
  season: MotivationSeasonState;
  lastUpdated: string;
}

// Core data types for the habit tracker

export type HabitType = 'binary' | 'numeric';

export interface Habit {
  id: string;
  name: string;
  type: HabitType;
  weeklyGoal: number;
  unit: string; // "days", "liters", "eggs", etc.
  color: string; // For visual distinction
  icon: string; // Emoji or icon name
  createdAt: string;
  archived: boolean;
  order: number; // For drag-drop ordering
}

export interface DailyEntry {
  id: string;
  habitId: string;
  date: string; // ISO format: "2024-12-08"
  value: number; // 0/1 for binary, actual value for numeric
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyStats {
  weekStart: string; // Monday ISO date
  habitId: string;
  total: number;
  goal: number;
  remaining: number;
  avgNeededPerDay: number;
  isOnTrack: boolean;
  completionPercentage: number;
  streak: number; // Consecutive weeks hitting goal
}

export interface StreakData {
  habitId: string;
  currentDailyStreak: number;
  longestDailyStreak: number;
  currentWeeklyStreak: number;
  longestWeeklyStreak: number;
  lastActiveDate: string;
}

export interface OverallStats {
  weekStart: string;
  totalHabits: number;
  habitsOnTrack: number;
  overallCompletionPercentage: number;
  bestPerformingHabit: string | null;
  needsAttentionHabit: string | null;
  weeklyPerfectDays: number; // Days where all habits hit daily target
  allHabitsWeeklyStreak: number; // Weeks where all habits hit goals
}

// UI State types
export interface WeekNavigation {
  currentWeekStart: Date;
  displayWeekStart: Date;
}

export interface HabitFormData {
  name: string;
  type: HabitType;
  weeklyGoal: number;
  unit: string;
  color: string;
  icon: string;
}

// Chart data types
export interface ChartDataPoint {
  name: string;
  value: number;
  goal?: number;
  fill?: string;
}

export interface TrendDataPoint {
  week: string;
  completion: number;
  [key: string]: string | number; // Dynamic habit values
}

// Export/Import types
export interface ExportData {
  version: number;
  exportedAt: string;
  habits: Habit[];
  entries: DailyEntry[];
}



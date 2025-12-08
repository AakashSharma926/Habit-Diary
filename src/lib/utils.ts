import {
  startOfWeek,
  endOfWeek,
  format,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isToday,
  isBefore,
  parseISO,
  differenceInDays,
  addDays,
} from 'date-fns';
import type { Habit, DailyEntry, WeeklyStats, OverallStats, StreakData } from '../types';

// ============ DATE UTILITIES ============

export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday
}

export function getWeekEnd(date: Date = new Date()): Date {
  return endOfWeek(date, { weekStartsOn: 1 }); // Sunday
}

export function getWeekDates(weekStart: Date): Date[] {
  const weekEnd = getWeekEnd(weekStart);
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
}

export interface DayInfo {
  date: string;
  dayName: string;
  dayNum: string;
}

export function getDaysOfWeek(weekStart: Date): DayInfo[] {
  const dates = getWeekDates(weekStart);
  return dates.map((d) => ({
    date: formatDate(d),
    dayName: format(d, 'EEE'),
    dayNum: format(d, 'd'),
  }));
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDisplayDate(date: Date): string {
  return format(date, 'MMM d');
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = getWeekEnd(weekStart);
  return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
}

export function getDayName(date: Date): string {
  return format(date, 'EEE');
}

export function navigateWeek(currentWeekStart: Date, direction: 'prev' | 'next'): Date {
  return direction === 'next' ? addWeeks(currentWeekStart, 1) : subWeeks(currentWeekStart, 1);
}

export function isCurrentWeek(weekStart: Date): boolean {
  const currentWeekStart = getWeekStart(new Date());
  return formatDate(weekStart) === formatDate(currentWeekStart);
}

export function getRemainingDaysInWeek(weekStart: Date): number {
  const today = new Date();
  const weekEnd = getWeekEnd(weekStart);
  
  if (isBefore(weekEnd, today)) return 0;
  if (isBefore(today, weekStart)) return 7;
  
  return differenceInDays(weekEnd, today) + 1;
}

// ============ STATS CALCULATIONS ============

export function calculateWeeklyStats(
  habit: Habit,
  entries: DailyEntry[],
  weekStart: Date
): WeeklyStats {
  const weekStartStr = formatDate(weekStart);
  const weekEnd = getWeekEnd(weekStart);
  const weekDates = getWeekDates(weekStart);
  
  // Get entries for this habit in this week
  const habitEntries = entries.filter(
    (e) => e.habitId === habit.id && 
    e.date >= weekStartStr && 
    e.date <= formatDate(weekEnd)
  );
  
  // Calculate total
  const total = habitEntries.reduce((sum, entry) => sum + entry.value, 0);
  const goal = habit.weeklyGoal;
  const remaining = Math.max(0, goal - total);
  
  // Calculate average needed per remaining day
  const remainingDays = getRemainingDaysInWeek(weekStart);
  const avgNeededPerDay = remainingDays > 0 ? remaining / remainingDays : 0;
  
  // Determine if on track
  // Calculate expected progress for this point in the week
  const today = new Date();
  const daysPassed = weekDates.filter((d) => isBefore(d, today) || isToday(d)).length;
  const expectedProgress = (goal / 7) * daysPassed;
  const isOnTrack = total >= expectedProgress || total >= goal;
  
  const completionPercentage = Math.min(100, Math.round((total / goal) * 100));
  
  return {
    weekStart: weekStartStr,
    habitId: habit.id,
    total,
    goal,
    remaining,
    avgNeededPerDay: Math.round(avgNeededPerDay * 100) / 100,
    isOnTrack,
    completionPercentage,
    streak: 0, // Calculated separately
  };
}

export function calculateOverallStats(
  habits: Habit[],
  entries: DailyEntry[],
  weekStart: Date
): OverallStats {
  const weekStartStr = formatDate(weekStart);
  const weekDates = getWeekDates(weekStart);
  
  const stats = habits.map((h) => calculateWeeklyStats(h, entries, weekStart));
  
  const habitsOnTrack = stats.filter((s) => s.isOnTrack).length;
  const totalCompletion = stats.reduce((sum, s) => sum + s.completionPercentage, 0);
  const overallCompletionPercentage = habits.length > 0 
    ? Math.round(totalCompletion / habits.length) 
    : 0;
  
  // Best and worst performing habits
  const sortedStats = [...stats].sort((a, b) => b.completionPercentage - a.completionPercentage);
  const bestPerformingHabit = sortedStats[0]?.habitId || null;
  const needsAttentionHabit = sortedStats.filter((s) => !s.isOnTrack)[0]?.habitId || null;
  
  // Count perfect days (all habits hit their daily target)
  const weeklyPerfectDays = weekDates.filter((date) => {
    const dateStr = formatDate(date);
    if (isBefore(new Date(), date) && !isToday(date)) return false;
    
    return habits.every((habit) => {
      const dailyTarget = habit.weeklyGoal / 7;
      const entry = entries.find((e) => e.habitId === habit.id && e.date === dateStr);
      return (entry?.value || 0) >= dailyTarget;
    });
  }).length;
  
  return {
    weekStart: weekStartStr,
    totalHabits: habits.length,
    habitsOnTrack,
    overallCompletionPercentage,
    bestPerformingHabit,
    needsAttentionHabit,
    weeklyPerfectDays,
    allHabitsWeeklyStreak: 0, // Calculated separately with historical data
  };
}

export function calculateStreakData(
  habitId: string,
  entries: DailyEntry[],
  weeklyGoal: number
): StreakData {
  const habitEntries = entries
    .filter((e) => e.habitId === habitId)
    .sort((a, b) => b.date.localeCompare(a.date));
  
  if (habitEntries.length === 0) {
    return {
      habitId,
      currentDailyStreak: 0,
      longestDailyStreak: 0,
      currentWeeklyStreak: 0,
      longestWeeklyStreak: 0,
      lastActiveDate: '',
    };
  }
  
  // Daily streak: consecutive days with value > 0
  let currentDailyStreak = 0;
  let longestDailyStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;
  
  for (const entry of habitEntries) {
    const entryDate = parseISO(entry.date);
    
    if (entry.value > 0) {
      if (lastDate === null || differenceInDays(lastDate, entryDate) === 1) {
        tempStreak++;
        if (currentDailyStreak === 0 && 
            (isToday(entryDate) || differenceInDays(new Date(), entryDate) === 1)) {
          currentDailyStreak = tempStreak;
        }
      } else {
        longestDailyStreak = Math.max(longestDailyStreak, tempStreak);
        tempStreak = 1;
      }
      lastDate = entryDate;
    } else {
      longestDailyStreak = Math.max(longestDailyStreak, tempStreak);
      tempStreak = 0;
      lastDate = null;
    }
  }
  longestDailyStreak = Math.max(longestDailyStreak, tempStreak);
  currentDailyStreak = Math.max(currentDailyStreak, tempStreak);
  
  // Weekly streak: consecutive weeks meeting goal
  const weeklyTotals = new Map<string, number>();
  for (const entry of habitEntries) {
    const weekStart = formatDate(getWeekStart(parseISO(entry.date)));
    weeklyTotals.set(weekStart, (weeklyTotals.get(weekStart) || 0) + entry.value);
  }
  
  const sortedWeeks = Array.from(weeklyTotals.entries())
    .sort((a, b) => b[0].localeCompare(a[0]));
  
  let currentWeeklyStreak = 0;
  let longestWeeklyStreak = 0;
  let weekTempStreak = 0;
  let lastWeekStart: Date | null = null;
  
  for (const [weekStartStr, total] of sortedWeeks) {
    const weekStart = parseISO(weekStartStr);
    
    if (total >= weeklyGoal) {
      if (lastWeekStart === null || differenceInDays(lastWeekStart, weekStart) === 7) {
        weekTempStreak++;
        const currentWeekStartStr = formatDate(getWeekStart(new Date()));
        const prevWeekStartStr = formatDate(getWeekStart(subWeeks(new Date(), 1)));
        if (currentWeeklyStreak === 0 && 
            (weekStartStr === currentWeekStartStr || weekStartStr === prevWeekStartStr)) {
          currentWeeklyStreak = weekTempStreak;
        }
      } else {
        longestWeeklyStreak = Math.max(longestWeeklyStreak, weekTempStreak);
        weekTempStreak = 1;
      }
      lastWeekStart = weekStart;
    } else {
      longestWeeklyStreak = Math.max(longestWeeklyStreak, weekTempStreak);
      weekTempStreak = 0;
      lastWeekStart = null;
    }
  }
  longestWeeklyStreak = Math.max(longestWeeklyStreak, weekTempStreak);
  currentWeeklyStreak = Math.max(currentWeeklyStreak, weekTempStreak);
  
  return {
    habitId,
    currentDailyStreak,
    longestDailyStreak,
    currentWeeklyStreak,
    longestWeeklyStreak,
    lastActiveDate: habitEntries[0]?.date || '',
  };
}

// ============ COLOR UTILITIES ============

export const HABIT_COLORS = [
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#84cc16', // Lime
];

export const HABIT_ICONS = [
  '🌅', // Wake up
  '🥚', // Eggs
  '💧', // Water
  '🏋️', // Gym
  '📚', // Reading
  '🧘', // Meditation
  '🚶', // Walking
  '💤', // Sleep
  '🍎', // Nutrition
  '✍️', // Writing
  '🎯', // Goals
  '💪', // Exercise
];

export function getStatusColor(isOnTrack: boolean, completionPercentage: number): string {
  if (completionPercentage >= 100) return '#10b981'; // Green - completed
  if (isOnTrack) return '#06b6d4'; // Cyan - on track
  if (completionPercentage >= 50) return '#f59e0b'; // Amber - warning
  return '#ef4444'; // Red - behind
}

// ============ EXPORT/IMPORT ============

export function exportToJSON(habits: Habit[], entries: DailyEntry[]): string {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    habits,
    entries,
  };
  return JSON.stringify(data, null, 2);
}

export function exportToCSV(habits: Habit[], entries: DailyEntry[]): string {
  const lines: string[] = [];
  
  // Headers
  lines.push('Date,Habit,Type,Value,Goal,Unit');
  
  // Create a map of habits for quick lookup
  const habitMap = new Map(habits.map((h) => [h.id, h]));
  
  // Sort entries by date
  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  
  for (const entry of sortedEntries) {
    const habit = habitMap.get(entry.habitId);
    if (habit) {
      lines.push(
        `${entry.date},${habit.name},${habit.type},${entry.value},${habit.weeklyGoal},${habit.unit}`
      );
    }
  }
  
  return lines.join('\n');
}

export function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============ OVERALL STREAK CALCULATION ============

/**
 * Calculate streak for a single habit
 * A streak breaks immediately if a day is missed (no entry or value = 0)
 */
export function calculateHabitStreak(
  habitId: string,
  habit: Habit,
  entries: DailyEntry[]
): { currentStreak: number; maxStreak: number } {
  const habitEntries = entries.filter(e => e.habitId === habitId);
  
  if (habitEntries.length === 0) {
    return { currentStreak: 0, maxStreak: 0 };
  }

  const dailyGoal = habit.weeklyGoal / 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Build a map of dates with successful completions
  const successDates = new Set<string>();
  
  for (const entry of habitEntries) {
    const value = entry.value || 0;
    let isSuccess = false;
    
    if (habit.type === 'binary') {
      isSuccess = value >= 1;
    } else {
      // For numeric, need at least 80% of daily goal
      isSuccess = value >= dailyGoal * 0.8;
    }
    
    if (isSuccess) {
      successDates.add(entry.date);
    }
  }

  // Calculate current streak: go backwards from today/yesterday
  let currentStreak = 0;
  let checkDate = new Date(today);
  const todayStr = formatDate(today);
  const yesterdayStr = formatDate(addDays(today, -1));
  
  // Start from today or yesterday if they have entries
  if (!successDates.has(todayStr) && !successDates.has(yesterdayStr)) {
    // No recent activity, current streak is 0
    currentStreak = 0;
  } else {
    // Start counting from today or yesterday
    if (!successDates.has(todayStr)) {
      checkDate = addDays(today, -1);
    }
    
    while (successDates.has(formatDate(checkDate))) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    }
  }

  // Calculate max streak: find longest consecutive run
  let maxStreak = 0;
  const sortedDates = Array.from(successDates).sort();
  
  if (sortedDates.length > 0) {
    let tempStreak = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = parseISO(sortedDates[i - 1]);
      const currDate = parseISO(sortedDates[i]);
      const diff = differenceInDays(currDate, prevDate);
      
      if (diff === 1) {
        tempStreak++;
      } else {
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak);
  }

  return { currentStreak, maxStreak };
}

/**
 * Calculate overall streak based on WEEKLY goal completion
 * If all habits meet their weekly goals, that week counts as 7 days toward streak
 */
export function calculateOverallStreak(
  habits: Habit[],
  entries: DailyEntry[]
): { currentStreak: number; maxStreak: number; isCurrentWeekOnTrack: boolean; weeklyStatus: 'on-track' | 'warning' | 'behind' } {
  if (habits.length === 0) {
    return { currentStreak: 0, maxStreak: 0, isCurrentWeekOnTrack: true, weeklyStatus: 'on-track' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekStart = getWeekStart(today);
  
  // Get all weeks that have entries
  const weeklyTotals = new Map<string, Map<string, number>>(); // weekStart -> habitId -> total
  
  for (const entry of entries) {
    const entryDate = parseISO(entry.date);
    const weekStart = formatDate(getWeekStart(entryDate));
    
    if (!weeklyTotals.has(weekStart)) {
      weeklyTotals.set(weekStart, new Map());
    }
    
    const habitTotals = weeklyTotals.get(weekStart)!;
    habitTotals.set(entry.habitId, (habitTotals.get(entry.habitId) || 0) + entry.value);
  }
  
  // Determine which weeks are "complete" (all habits met their weekly goals)
  const completeWeeks = new Set<string>();
  
  for (const [weekStart, habitTotals] of weeklyTotals) {
    let allHabitsComplete = true;
    
    for (const habit of habits) {
      const total = habitTotals.get(habit.id) || 0;
      // Need to meet at least 80% of weekly goal
      if (total < habit.weeklyGoal * 0.8) {
        allHabitsComplete = false;
        break;
      }
    }
    
    if (allHabitsComplete) {
      completeWeeks.add(weekStart);
    }
  }
  
  // Check current week status with detailed breakdown
  // Uses same logic as TrackerView's getPacingStatus
  const currentWeekStr = formatDate(currentWeekStart);
  const currentWeekTotals = weeklyTotals.get(currentWeekStr) || new Map();
  const dayOfWeek = differenceInDays(today, currentWeekStart) + 1; // 1-7
  
  let habitsOnTrack = 0;
  let habitsWarning = 0;
  let habitsBehind = 0;
  
  for (const habit of habits) {
    const total = currentWeekTotals.get(habit.id) || 0;
    const weeklyGoal = habit.weeklyGoal;
    
    // Already completed weekly goal
    if (total >= weeklyGoal) {
      habitsOnTrack++;
      continue;
    }
    
    if (habit.type === 'binary') {
      // For binary habits: compare to expected days
      const expectedByToday = (weeklyGoal / 7) * dayOfWeek;
      const difference = total - expectedByToday;
      
      if (difference >= 0) {
        habitsOnTrack++;
      } else if (difference >= -1) {
        // Within 1 day - warning (Catch Up)
        habitsWarning++;
      } else {
        // More than 1 day behind
        habitsBehind++;
      }
    } else {
      // For numeric habits: compare to expected amount
      const dailyGoal = weeklyGoal / 7;
      const expectedByToday = dailyGoal * dayOfWeek;
      const difference = total - expectedByToday;
      
      if (difference >= 0) {
        habitsOnTrack++;
      } else if (difference >= -dailyGoal) {
        // Within 1 day's worth - warning (Catch Up)
        habitsWarning++;
      } else {
        // More than 1 day behind
        habitsBehind++;
      }
    }
  }
  
  // Determine overall weekly status based on majority
  let weeklyStatus: 'on-track' | 'warning' | 'behind';
  if (habitsBehind > 0) {
    // Any habit truly behind = red
    weeklyStatus = 'behind';
  } else if (habitsWarning > 0) {
    // Some habits catching up = yellow
    weeklyStatus = 'warning';
  } else {
    // All on track = green
    weeklyStatus = 'on-track';
  }
  
  const isCurrentWeekOnTrack = weeklyStatus === 'on-track';
  
  // Calculate current streak (in days, where each complete week = 7 days)
  let currentStreak = 0;
  const sortedWeeks = Array.from(completeWeeks).sort((a, b) => b.localeCompare(a)); // Most recent first
  
  // Start from last week (current week is still in progress)
  const lastWeekStart = formatDate(subWeeks(currentWeekStart, 1));
  
  if (sortedWeeks.length > 0 && sortedWeeks[0] === lastWeekStart) {
    // Last week was complete, count consecutive weeks
    let checkWeek = parseISO(lastWeekStart);
    
    while (completeWeeks.has(formatDate(checkWeek))) {
      currentStreak += 7; // Each complete week adds 7 days
      checkWeek = subWeeks(checkWeek, 1);
    }
    
    // Add current week's progress if on track
    if (isCurrentWeekOnTrack) {
      currentStreak += dayOfWeek;
    }
  } else if (isCurrentWeekOnTrack) {
    // No complete weeks but current week is on track
    currentStreak = dayOfWeek;
  }
  
  // Calculate max streak
  let maxStreak = 0;
  const sortedWeeksAsc = Array.from(completeWeeks).sort();
  
  if (sortedWeeksAsc.length > 0) {
    let tempStreak = 7;
    
    for (let i = 1; i < sortedWeeksAsc.length; i++) {
      const prevWeek = parseISO(sortedWeeksAsc[i - 1]);
      const currWeek = parseISO(sortedWeeksAsc[i]);
      const diff = differenceInDays(currWeek, prevWeek);
      
      if (diff === 7) {
        tempStreak += 7;
      } else {
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 7;
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak);
  }
  
  // Include current streak in max if it's larger
  maxStreak = Math.max(maxStreak, currentStreak);

  return { currentStreak, maxStreak, isCurrentWeekOnTrack, weeklyStatus };
}

// Get streak color based on streak length
export function getStreakColor(streak: number): string {
  if (streak >= 365) return '#ffd700'; // Bright gold for 365+
  if (streak >= 100) return '#ff6b6b'; // Coral for 100+
  if (streak >= 60) return '#c084fc'; // Purple for 60+
  if (streak >= 30) return '#f59e0b'; // Amber for 30+
  if (streak >= 14) return '#8b5cf6'; // Violet for 14+
  if (streak >= 7) return '#06b6d4'; // Cyan for 7+
  if (streak >= 3) return '#10b981'; // Green for 3+
  return '#64748b'; // Gray for less
}

// Get streak level for animations
export function getStreakLevel(streak: number): 'none' | 'bronze' | 'silver' | 'gold' | 'fire' | 'legendary' | 'mythic' | 'immortal' {
  if (streak >= 365) return 'immortal';   // 365+ days - rainbow/special
  if (streak >= 100) return 'mythic';     // 100+ days - intense fire
  if (streak >= 60) return 'legendary';   // 60+ days - purple fire
  if (streak >= 30) return 'fire';        // 30+ days - orange fire
  if (streak >= 14) return 'gold';        // 14+ days - gold star
  if (streak >= 7) return 'silver';       // 7+ days - silver sparkle
  if (streak >= 3) return 'bronze';       // 3+ days - bronze sparkle
  return 'none';
}

// Get streak emoji based on level
export function getStreakEmoji(streak: number): string {
  if (streak >= 365) return '🌟';  // Star for immortal
  if (streak >= 100) return '💎';  // Diamond for mythic
  if (streak >= 60) return '👑';   // Crown for legendary
  if (streak >= 30) return '🔥';   // Fire for 30+
  if (streak >= 14) return '⭐';   // Star for 14+
  if (streak >= 7) return '💫';    // Sparkles for 7+
  if (streak >= 3) return '✨';    // Sparkle for 3+
  if (streak > 0) return '📅';     // Calendar for 1-2
  return '💤';                     // Sleep for 0
}


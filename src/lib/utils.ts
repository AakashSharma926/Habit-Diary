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
  subDays,
} from 'date-fns';
import type { Habit, DailyEntry, WeeklyStats, OverallStats, StreakData } from '../types';

// ============ DATE UTILITIES ============

/**
 * Check if a date is editable based on the 6-hour grace period rule:
 * - Today is always editable
 * - Yesterday is editable until 6 AM today
 * - Future dates are not editable
 * - All other past dates are locked
 */
export function isDateEditable(dateStr: string): boolean {
  const now = new Date();
  const today = formatDate(new Date());
  const targetDate = parseISO(dateStr);
  const targetDateStr = formatDate(targetDate);
  
  // Future dates are not editable
  if (targetDateStr > today) {
    return false;
  }
  
  // Today is always editable
  if (targetDateStr === today) {
    return true;
  }
  
  // Yesterday check: editable if current time is before 6 AM
  const yesterday = formatDate(subDays(new Date(), 1));
  if (targetDateStr === yesterday) {
    const currentHour = now.getHours();
    return currentHour < 6; // Editable from 12 AM to 6 AM
  }
  
  // All other past dates are locked
  return false;
}

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

/**
 * Get the effective daily goal for an entry.
 * Uses targetAtEntry (snapshot at time of entry) if available,
 * otherwise falls back to the current habit's goal.
 * This ensures historical data is evaluated correctly even if goals change.
 */
export function getEffectiveDailyGoal(
  entry: DailyEntry,
  habit: Habit
): number {
  // Use stored target if available (for historical accuracy)
  if (entry.targetAtEntry !== undefined) {
    return entry.targetAtEntry;
  }
  // Fall back to current habit goal
  return habit.type === 'binary' ? 1 : habit.weeklyGoal / 7;
}

/**
 * Check if an entry meets its daily goal.
 * For binary habits: value >= 1
 * For numeric habits: value >= 80% of daily goal
 */
export function isEntryComplete(
  entry: DailyEntry,
  habit: Habit
): boolean {
  const dailyGoal = getEffectiveDailyGoal(entry, habit);
  const value = entry.value || 0;
  
  if (habit.type === 'binary') {
    return value >= 1;
  }
  // For numeric, allow 80% threshold
  return value >= dailyGoal * 0.8;
}

export function calculateWeeklyStats(
  habit: Habit,
  entries: DailyEntry[],
  weekStart: Date
): WeeklyStats {
  const weekStartStr = formatDate(weekStart);
  const weekEnd = getWeekEnd(weekStart);
  const weekDates = getWeekDates(weekStart);
  
  // Get habit creation date
  const habitCreatedAt = parseISO(habit.createdAt);
  const createdDay = new Date(habitCreatedAt);
  createdDay.setHours(0, 0, 0, 0);
  
  // Only count days from when the habit was created
  const activeDays = weekDates.filter(day => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    return dayStart >= createdDay;
  });
  
  // Get entries for this habit in this week
  const habitEntries = entries.filter(
    (e) => e.habitId === habit.id && 
    e.date >= weekStartStr && 
    e.date <= formatDate(weekEnd)
  );
  
  // Calculate total
  const total = habitEntries.reduce((sum, entry) => sum + entry.value, 0);
  
  // Pro-rate the goal based on active days (if habit was created mid-week)
  const activeDaysCount = activeDays.length;
  const goal = activeDaysCount > 0 ? (habit.weeklyGoal / 7) * activeDaysCount : habit.weeklyGoal;
  const remaining = Math.max(0, goal - total);
  
  // Calculate average needed per remaining day (only count active remaining days)
  const today = new Date();
  const remainingActiveDays = activeDays.filter(d => !isBefore(d, today) || isToday(d)).length;
  const avgNeededPerDay = remainingActiveDays > 0 ? remaining / remainingActiveDays : 0;
  
  // Determine if on track (based on active days passed)
  const activePassedDays = activeDays.filter((d) => isBefore(d, today) || isToday(d)).length;
  const expectedProgress = activePassedDays > 0 ? (goal / activeDaysCount) * activePassedDays : 0;
  const isOnTrack = total >= expectedProgress || total >= goal;
  
  const completionPercentage = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0;
  
  return {
    weekStart: weekStartStr,
    habitId: habit.id,
    total,
    goal: Math.round(goal * 100) / 100,
    remaining: Math.round(remaining * 100) / 100,
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
  
  // Filter out habits with 0 goal (didn't exist in this week at all)
  const applicableStats = stats.filter(s => s.goal > 0);
  
  const habitsOnTrack = applicableStats.filter((s) => s.isOnTrack).length;
  const totalCompletion = applicableStats.reduce((sum, s) => sum + s.completionPercentage, 0);
  const overallCompletionPercentage = applicableStats.length > 0 
    ? Math.round(totalCompletion / applicableStats.length) 
    : 0;
  
  // Best and worst performing habits (from applicable ones)
  const sortedStats = [...applicableStats].sort((a, b) => b.completionPercentage - a.completionPercentage);
  const bestPerformingHabit = sortedStats[0]?.habitId || null;
  const needsAttentionHabit = sortedStats.filter((s) => !s.isOnTrack)[0]?.habitId || null;
  
  // Count perfect days (all habits that existed on that day hit their daily target)
  const weeklyPerfectDays = weekDates.filter((date) => {
    const dateStr = formatDate(date);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    if (isBefore(new Date(), date) && !isToday(date)) return false;
    
    // Get habits that existed on this day
    const habitsExistingOnDay = habits.filter(habit => {
      const createdAt = parseISO(habit.createdAt);
      const createdDay = new Date(createdAt);
      createdDay.setHours(0, 0, 0, 0);
      return dayStart >= createdDay;
    });
    
    // If no habits existed on this day, it's not a perfect day
    if (habitsExistingOnDay.length === 0) return false;
    
    return habitsExistingOnDay.every((habit) => {
      const entry = entries.find((e) => e.habitId === habit.id && e.date === dateStr);
      if (!entry) return false;
      return isEntryComplete(entry, habit);
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Build a map of dates with successful completions
  // Uses targetAtEntry for historical accuracy
  const successDates = new Set<string>();
  
  for (const entry of habitEntries) {
    if (isEntryComplete(entry, habit)) {
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
  const todayStr = formatDate(today);
  const currentWeekStart = getWeekStart(today);
  
  // Group entries by date and habitId for daily calculations
  // Store full entries to access targetAtEntry
  const entriesByDateAndHabit = new Map<string, Map<string, DailyEntry>>(); // date -> habitId -> entry
  
  for (const entry of entries) {
    if (!entriesByDateAndHabit.has(entry.date)) {
      entriesByDateAndHabit.set(entry.date, new Map());
    }
    const dayEntries = entriesByDateAndHabit.get(entry.date)!;
    // Keep the entry with highest value if multiple exist for same day
    const existing = dayEntries.get(entry.habitId);
    if (!existing || entry.value > existing.value) {
      dayEntries.set(entry.habitId, entry);
    }
  }
  
  // Check if a day is "perfect" (all habits that existed on that day met their daily goal)
  // Uses targetAtEntry for historical accuracy
  // Only considers habits that existed on the given date
  const isPerfectDay = (dateStr: string): boolean => {
    const dayEntries = entriesByDateAndHabit.get(dateStr);
    if (!dayEntries) return false;
    
    const dayDate = parseISO(dateStr);
    dayDate.setHours(0, 0, 0, 0);
    
    // Get habits that existed on this day
    const habitsExistingOnDay = habits.filter(habit => {
      const createdAt = parseISO(habit.createdAt);
      const createdDay = new Date(createdAt);
      createdDay.setHours(0, 0, 0, 0);
      return dayDate >= createdDay;
    });
    
    // If no habits existed on this day, it's not a perfect day
    if (habitsExistingOnDay.length === 0) return false;
    
    for (const habit of habitsExistingOnDay) {
      const entry = dayEntries.get(habit.id);
      if (!entry) return false;
      if (!isEntryComplete(entry, habit)) return false;
    }
    return true;
  };
  
  // Calculate current streak (consecutive perfect days ending at today or yesterday)
  let currentStreak = 0;
  let checkDate = new Date(today);
  
  // First check if today is perfect
  if (isPerfectDay(todayStr)) {
    currentStreak = 1;
    checkDate = subDays(today, 1);
  } else {
    // If today isn't perfect, start from yesterday
    checkDate = subDays(today, 1);
  }
  
  // Count backwards from the starting point
  while (true) {
    const dateStr = formatDate(checkDate);
    if (isPerfectDay(dateStr)) {
      currentStreak++;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }
  
  // Calculate max streak by checking all days
  let maxStreak = 0;
  let tempStreak = 0;
  const allDates = Array.from(entriesByDateAndHabit.keys()).sort();
  
  for (let i = 0; i < allDates.length; i++) {
    if (isPerfectDay(allDates[i])) {
      if (tempStreak === 0) {
        tempStreak = 1;
      } else {
        // Check if consecutive with previous day
        const prevDate = allDates[i - 1];
        const currDate = parseISO(allDates[i]);
        const prevDateParsed = parseISO(prevDate);
        const diff = differenceInDays(currDate, prevDateParsed);
        
        if (diff === 1) {
          tempStreak++;
        } else {
          maxStreak = Math.max(maxStreak, tempStreak);
          tempStreak = 1;
        }
      }
    } else {
      maxStreak = Math.max(maxStreak, tempStreak);
      tempStreak = 0;
    }
  }
  maxStreak = Math.max(maxStreak, tempStreak, currentStreak);
  
  // Calculate weekly status for the current week (for the badge color)
  const weeklyTotals = new Map<string, number>(); // habitId -> total for current week
  const dayOfWeek = differenceInDays(today, currentWeekStart) + 1; // 1-7
  
  for (const entry of entries) {
    const entryDate = parseISO(entry.date);
    if (entryDate >= currentWeekStart && entryDate <= today) {
      weeklyTotals.set(entry.habitId, (weeklyTotals.get(entry.habitId) || 0) + entry.value);
    }
  }
  
  let habitsOnTrack = 0;
  let habitsWarning = 0;
  let habitsBehind = 0;
  
  for (const habit of habits) {
    const total = weeklyTotals.get(habit.id) || 0;
    const weeklyGoal = habit.weeklyGoal;
    
    // Already completed weekly goal
    if (total >= weeklyGoal) {
      habitsOnTrack++;
      continue;
    }
    
    if (habit.type === 'binary') {
      const expectedByToday = (weeklyGoal / 7) * dayOfWeek;
      const difference = total - expectedByToday;
      
      if (difference >= 0) {
        habitsOnTrack++;
      } else if (difference >= -1) {
        habitsWarning++;
      } else {
        habitsBehind++;
      }
    } else {
      const dailyGoal = weeklyGoal / 7;
      const expectedByToday = dailyGoal * dayOfWeek;
      const difference = total - expectedByToday;
      
      if (difference >= 0) {
        habitsOnTrack++;
      } else if (difference >= -dailyGoal) {
        habitsWarning++;
      } else {
        habitsBehind++;
      }
    }
  }
  
  let weeklyStatus: 'on-track' | 'warning' | 'behind';
  if (habitsBehind > 0) {
    weeklyStatus = 'behind';
  } else if (habitsWarning > 0) {
    weeklyStatus = 'warning';
  } else {
    weeklyStatus = 'on-track';
  }
  
  const isCurrentWeekOnTrack = weeklyStatus === 'on-track';

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
  if (streak > 0) return '🌱';     // Calendar for 1-2
  return '💤';                     // Sleep for 0
}


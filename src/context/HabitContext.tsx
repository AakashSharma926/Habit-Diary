import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Habit, DailyEntry, HabitFormData } from '../types';
import {
  isFirebaseConfigured,
  subscribeToHabits,
  subscribeToEntriesForWeek,
  createHabit,
  updateHabit,
  deleteHabit,
  upsertEntry,
  getAllEntries,
  resetWeekData,
  importData,
  deleteAllHabits,
  deleteAllEntries,
} from '../lib/firebase';
import {
  subscribeToHabitsLocal,
  subscribeToEntriesForWeekLocal,
  createHabitLocal,
  updateHabitLocal,
  deleteHabitLocal,
  upsertEntryLocal,
  getAllEntriesLocal,
  resetWeekDataLocal,
  importDataLocal,
  triggerLocalRefresh,
  deleteAllHabitsLocal,
  deleteAllEntriesLocal,
} from '../lib/localStorage';
import {
  getWeekStart,
  getWeekEnd,
  formatDate,
  navigateWeek,
  HABIT_COLORS,
} from '../lib/utils';
import { subDays, eachDayOfInterval } from 'date-fns';

interface HabitContextType {
  // Data
  habits: Habit[];
  entries: DailyEntry[];
  allEntries: DailyEntry[];
  weekStart: Date;
  isLoading: boolean;
  error: string | null;
  isUsingLocalStorage: boolean;

  // Navigation
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;
  goToWeek: (date: Date) => void;

  // Habit CRUD
  addHabit: (data: HabitFormData) => Promise<void>;
  editHabit: (habitId: string, data: Partial<HabitFormData>) => Promise<void>;
  removeHabit: (habitId: string) => Promise<void>;

  // Entry operations
  updateEntry: (habitId: string, date: string, value: number) => Promise<void>;
  getEntryValue: (habitId: string, date: string) => number;

  // Bulk operations
  resetCurrentWeek: () => Promise<void>;
  importFromJSON: (jsonString: string) => Promise<void>;
  loadAllEntries: () => Promise<void>;
  clearAllData: () => Promise<void>;
  clearAllEntries: () => Promise<void>;
  generateFakeData: (months: number) => Promise<void>;
}

const HabitContext = createContext<HabitContextType | null>(null);

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [allEntries, setAllEntries] = useState<DailyEntry[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isUsingLocalStorage = !isFirebaseConfigured;

  // Subscribe to habits
  useEffect(() => {
    setIsLoading(true);
    
    const unsubscribe = isUsingLocalStorage
      ? subscribeToHabitsLocal((newHabits) => {
          setHabits(newHabits);
          setIsLoading(false);
        })
      : subscribeToHabits((newHabits) => {
          setHabits(newHabits);
          setIsLoading(false);
        });

    return () => unsubscribe();
  }, [isUsingLocalStorage]);

  // Subscribe to entries for current week
  useEffect(() => {
    const weekStartStr = formatDate(weekStart);
    const weekEndStr = formatDate(getWeekEnd(weekStart));

    const unsubscribe = isUsingLocalStorage
      ? subscribeToEntriesForWeekLocal(weekStartStr, weekEndStr, (newEntries) => {
          setEntries(newEntries);
        })
      : subscribeToEntriesForWeek(weekStartStr, weekEndStr, (newEntries) => {
          setEntries(newEntries);
        });

    return () => unsubscribe();
  }, [weekStart, isUsingLocalStorage]);

  // Load all entries for streak calculations
  const loadAllEntries = useCallback(async () => {
    try {
      const fetchedEntries = isUsingLocalStorage
        ? await getAllEntriesLocal()
        : await getAllEntries();
      setAllEntries(fetchedEntries);
    } catch (err) {
      console.error('Failed to load all entries:', err);
    }
  }, [isUsingLocalStorage]);

  useEffect(() => {
    loadAllEntries();
  }, [loadAllEntries]);

  // Navigation
  const goToPreviousWeek = useCallback(() => {
    setWeekStart((prev) => navigateWeek(prev, 'prev'));
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => navigateWeek(prev, 'next'));
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setWeekStart(getWeekStart(new Date()));
  }, []);

  const goToWeek = useCallback((date: Date) => {
    setWeekStart(getWeekStart(date));
  }, []);

  // Habit CRUD
  const addHabit = useCallback(async (data: HabitFormData) => {
    try {
      const newHabit: Habit = {
        id: uuidv4(),
        name: data.name,
        type: data.type,
        weeklyGoal: data.weeklyGoal,
        unit: data.unit,
        color: data.color || HABIT_COLORS[habits.length % HABIT_COLORS.length],
        icon: data.icon,
        createdAt: new Date().toISOString(),
        archived: false,
        order: habits.length,
      };
      
      if (isUsingLocalStorage) {
        await createHabitLocal(newHabit);
        triggerLocalRefresh();
      } else {
        await createHabit(newHabit);
      }
    } catch (err) {
      setError('Failed to create habit');
      throw err;
    }
  }, [habits.length, isUsingLocalStorage]);

  const editHabit = useCallback(async (habitId: string, data: Partial<HabitFormData>) => {
    try {
      if (isUsingLocalStorage) {
        await updateHabitLocal(habitId, data);
        triggerLocalRefresh();
      } else {
        await updateHabit(habitId, data);
      }
    } catch (err) {
      setError('Failed to update habit');
      throw err;
    }
  }, [isUsingLocalStorage]);

  const removeHabit = useCallback(async (habitId: string) => {
    try {
      if (isUsingLocalStorage) {
        await deleteHabitLocal(habitId);
        triggerLocalRefresh();
      } else {
        await deleteHabit(habitId);
      }
    } catch (err) {
      setError('Failed to delete habit');
      throw err;
    }
  }, [isUsingLocalStorage]);

  // Entry operations
  const updateEntry = useCallback(async (habitId: string, date: string, value: number) => {
    try {
      const entry: DailyEntry = {
        id: `${habitId}_${date}`,
        habitId,
        date,
        value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      if (isUsingLocalStorage) {
        await upsertEntryLocal(entry);
        triggerLocalRefresh();
      } else {
        await upsertEntry(entry);
      }
      
      await loadAllEntries(); // Refresh all entries for streak calculations
    } catch (err) {
      setError('Failed to update entry');
      throw err;
    }
  }, [loadAllEntries, isUsingLocalStorage]);

  const getEntryValue = useCallback((habitId: string, date: string): number => {
    const entry = entries.find((e) => e.habitId === habitId && e.date === date);
    return entry?.value || 0;
  }, [entries]);

  // Bulk operations
  const resetCurrentWeek = useCallback(async () => {
    try {
      const weekStartStr = formatDate(weekStart);
      const weekEndStr = formatDate(getWeekEnd(weekStart));
      
      if (isUsingLocalStorage) {
        await resetWeekDataLocal(weekStartStr, weekEndStr);
        triggerLocalRefresh();
      } else {
        await resetWeekData(weekStartStr, weekEndStr);
      }
    } catch (err) {
      setError('Failed to reset week');
      throw err;
    }
  }, [weekStart, isUsingLocalStorage]);

  const importFromJSON = useCallback(async (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.habits && data.entries) {
        if (isUsingLocalStorage) {
          await importDataLocal(data.habits, data.entries);
          triggerLocalRefresh();
        } else {
          await importData(data.habits, data.entries);
        }
        await loadAllEntries();
      } else {
        throw new Error('Invalid import format');
      }
    } catch (err) {
      setError('Failed to import data');
      throw err;
    }
  }, [loadAllEntries, isUsingLocalStorage]);

  const clearAllData = useCallback(async () => {
    try {
      if (isUsingLocalStorage) {
        await deleteAllHabitsLocal();
        triggerLocalRefresh();
      } else {
        await deleteAllHabits();
      }
    } catch (err) {
      setError('Failed to clear data');
      throw err;
    }
  }, [isUsingLocalStorage]);

  const clearAllEntries = useCallback(async () => {
    try {
      if (isUsingLocalStorage) {
        await deleteAllEntriesLocal();
        triggerLocalRefresh();
      } else {
        await deleteAllEntries();
      }
      await loadAllEntries();
    } catch (err) {
      setError('Failed to clear entries');
      throw err;
    }
  }, [isUsingLocalStorage, loadAllEntries]);

  const generateFakeData = useCallback(async (months: number) => {
    try {
      const today = new Date();
      const startDate = subDays(today, months * 30);
      const days = eachDayOfInterval({ start: startDate, end: today });

      // Generate entries for each habit for each day
      for (const habit of habits) {
        for (const day of days) {
          const dateStr = formatDate(day);
          const dailyGoal = habit.weeklyGoal / 7;
          
          // Random completion with some variance
          // 70% chance of completing, with some variation
          const completionChance = Math.random();
          let value = 0;

          if (habit.type === 'binary') {
            // Binary: either 0 or 1
            value = completionChance > 0.3 ? 1 : 0;
          } else {
            // Numeric: random value around the daily goal
            if (completionChance > 0.3) {
              // Complete with some variance (80% to 120% of daily goal)
              const variance = 0.8 + Math.random() * 0.4;
              value = Math.round(dailyGoal * variance);
            } else if (completionChance > 0.15) {
              // Partial completion (30% to 70% of daily goal)
              value = Math.round(dailyGoal * (0.3 + Math.random() * 0.4));
            }
            // else value stays 0 (missed day)
          }

          if (value > 0) {
            const entry: DailyEntry = {
              id: `${habit.id}_${dateStr}`,
              habitId: habit.id,
              date: dateStr,
              value,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            if (isUsingLocalStorage) {
              await upsertEntryLocal(entry);
            } else {
              await upsertEntry(entry);
            }
          }
        }
      }

      if (isUsingLocalStorage) {
        triggerLocalRefresh();
      }
      await loadAllEntries();
    } catch (err) {
      setError('Failed to generate fake data');
      throw err;
    }
  }, [habits, isUsingLocalStorage, loadAllEntries]);

  const value: HabitContextType = {
    habits,
    entries,
    allEntries,
    weekStart,
    isLoading,
    error,
    isUsingLocalStorage,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    goToWeek,
    addHabit,
    editHabit,
    removeHabit,
    updateEntry,
    getEntryValue,
    resetCurrentWeek,
    importFromJSON,
    loadAllEntries,
    clearAllData,
    clearAllEntries,
    generateFakeData,
  };

  return <HabitContext.Provider value={value}>{children}</HabitContext.Provider>;
}

export function useHabits() {
  const context = useContext(HabitContext);
  if (!context) {
    throw new Error('useHabits must be used within a HabitProvider');
  }
  return context;
}

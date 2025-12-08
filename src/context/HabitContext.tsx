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
  // Friend data
  getFriendHabits,
  getFriendEntries,
  subscribeToFriendHabits,
  subscribeToFriendEntries,
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
  
  // User state
  currentUserId: string | null;
  viewingUserId: string | null; // If viewing a friend's dashboard
  isViewingFriend: boolean;
  setViewingUser: (userId: string | null) => void;

  // Navigation
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;
  goToWeek: (date: Date) => void;

  // Habit CRUD (only works when not viewing friend)
  addHabit: (data: HabitFormData) => Promise<void>;
  editHabit: (habitId: string, data: Partial<HabitFormData>) => Promise<void>;
  removeHabit: (habitId: string) => Promise<void>;

  // Entry operations (only works when not viewing friend)
  updateEntry: (habitId: string, date: string, value: number) => Promise<void>;
  getEntryValue: (habitId: string, date: string) => number;

  // Bulk operations
  resetCurrentWeek: () => Promise<void>;
  importFromJSON: (jsonString: string) => Promise<void>;
  loadAllEntries: () => Promise<void>;
  clearAllData: () => Promise<void>;
  clearAllEntries: () => Promise<void>;
  generateFakeData: (months: number) => Promise<void>;
  
  // Set current user (called from AuthContext)
  setCurrentUserId: (userId: string | null) => void;
}

const HabitContext = createContext<HabitContextType | null>(null);

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [allEntries, setAllEntries] = useState<DailyEntry[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // User state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  
  // Determine which mode we're in
  const isUsingLocalStorage = !isFirebaseConfigured || !currentUserId;
  const isViewingFriend = viewingUserId !== null && viewingUserId !== currentUserId;
  const activeUserId = viewingUserId || currentUserId;

  // Set viewing user (for friend dashboards)
  const setViewingUser = useCallback((userId: string | null) => {
    setViewingUserId(userId);
  }, []);

  // Subscribe to habits
  useEffect(() => {
    setIsLoading(true);
    
    let unsubscribe: () => void;
    
    if (isUsingLocalStorage) {
      unsubscribe = subscribeToHabitsLocal((newHabits) => {
        setHabits(newHabits);
        setIsLoading(false);
      });
    } else if (isViewingFriend && viewingUserId) {
      // Viewing friend's habits (read-only)
      unsubscribe = subscribeToFriendHabits(viewingUserId, (newHabits) => {
        setHabits(newHabits);
        setIsLoading(false);
      });
    } else if (currentUserId) {
      // Own habits
      unsubscribe = subscribeToHabits(currentUserId, (newHabits) => {
        setHabits(newHabits);
        setIsLoading(false);
      });
    } else {
      setHabits([]);
      setIsLoading(false);
      unsubscribe = () => {};
    }

    return () => unsubscribe();
  }, [isUsingLocalStorage, currentUserId, viewingUserId, isViewingFriend]);

  // Subscribe to entries for current week
  useEffect(() => {
    const weekStartStr = formatDate(weekStart);
    const weekEndStr = formatDate(getWeekEnd(weekStart));

    let unsubscribe: () => void;

    if (isUsingLocalStorage) {
      unsubscribe = subscribeToEntriesForWeekLocal(weekStartStr, weekEndStr, (newEntries) => {
        setEntries(newEntries);
      });
    } else if (isViewingFriend && viewingUserId) {
      // For friends, we get all entries and filter
      unsubscribe = subscribeToFriendEntries(viewingUserId, (allFriendEntries) => {
        const weekEntries = allFriendEntries.filter(
          e => e.date >= weekStartStr && e.date <= weekEndStr
        );
        setEntries(weekEntries);
      });
    } else if (currentUserId) {
      unsubscribe = subscribeToEntriesForWeek(currentUserId, weekStartStr, weekEndStr, (newEntries) => {
        setEntries(newEntries);
      });
    } else {
      setEntries([]);
      unsubscribe = () => {};
    }

    return () => unsubscribe();
  }, [weekStart, isUsingLocalStorage, currentUserId, viewingUserId, isViewingFriend]);

  // Load all entries for streak calculations
  const loadAllEntries = useCallback(async () => {
    try {
      let fetchedEntries: DailyEntry[];
      
      if (isUsingLocalStorage) {
        fetchedEntries = await getAllEntriesLocal();
      } else if (isViewingFriend && viewingUserId) {
        fetchedEntries = await getFriendEntries(viewingUserId);
      } else if (currentUserId) {
        fetchedEntries = await getAllEntries(currentUserId);
      } else {
        fetchedEntries = [];
      }
      
      setAllEntries(fetchedEntries);
    } catch (err) {
      console.error('Failed to load all entries:', err);
    }
  }, [isUsingLocalStorage, currentUserId, viewingUserId, isViewingFriend]);

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

  // Habit CRUD (blocked when viewing friend)
  const addHabit = useCallback(async (data: HabitFormData) => {
    if (isViewingFriend) {
      throw new Error("Cannot edit a friend's habits");
    }
    
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
      } else if (currentUserId) {
        await createHabit(currentUserId, newHabit);
      }
    } catch (err) {
      setError('Failed to create habit');
      throw err;
    }
  }, [habits.length, isUsingLocalStorage, currentUserId, isViewingFriend]);

  const editHabit = useCallback(async (habitId: string, data: Partial<HabitFormData>) => {
    if (isViewingFriend) {
      throw new Error("Cannot edit a friend's habits");
    }
    
    try {
      if (isUsingLocalStorage) {
        await updateHabitLocal(habitId, data);
        triggerLocalRefresh();
      } else if (currentUserId) {
        await updateHabit(currentUserId, habitId, data);
      }
    } catch (err) {
      setError('Failed to update habit');
      throw err;
    }
  }, [isUsingLocalStorage, currentUserId, isViewingFriend]);

  const removeHabit = useCallback(async (habitId: string) => {
    if (isViewingFriend) {
      throw new Error("Cannot delete a friend's habits");
    }
    
    try {
      if (isUsingLocalStorage) {
        await deleteHabitLocal(habitId);
        triggerLocalRefresh();
      } else if (currentUserId) {
        await deleteHabit(currentUserId, habitId);
      }
    } catch (err) {
      setError('Failed to delete habit');
      throw err;
    }
  }, [isUsingLocalStorage, currentUserId, isViewingFriend]);

  // Entry operations (blocked when viewing friend)
  const updateEntry = useCallback(async (habitId: string, date: string, value: number) => {
    if (isViewingFriend) {
      throw new Error("Cannot edit a friend's entries");
    }
    
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
      } else if (currentUserId) {
        await upsertEntry(currentUserId, entry);
      }
      
      await loadAllEntries();
    } catch (err) {
      setError('Failed to update entry');
      throw err;
    }
  }, [loadAllEntries, isUsingLocalStorage, currentUserId, isViewingFriend]);

  const getEntryValue = useCallback((habitId: string, date: string): number => {
    const entry = entries.find((e) => e.habitId === habitId && e.date === date);
    return entry?.value || 0;
  }, [entries]);

  // Bulk operations
  const resetCurrentWeek = useCallback(async () => {
    if (isViewingFriend) return;
    
    try {
      const weekStartStr = formatDate(weekStart);
      const weekEndStr = formatDate(getWeekEnd(weekStart));
      
      if (isUsingLocalStorage) {
        await resetWeekDataLocal(weekStartStr, weekEndStr);
        triggerLocalRefresh();
      } else if (currentUserId) {
        await resetWeekData(currentUserId, weekStartStr, weekEndStr);
      }
    } catch (err) {
      setError('Failed to reset week');
      throw err;
    }
  }, [weekStart, isUsingLocalStorage, currentUserId, isViewingFriend]);

  const importFromJSON = useCallback(async (jsonString: string) => {
    if (isViewingFriend) return;
    
    try {
      const data = JSON.parse(jsonString);
      if (data.habits && data.entries) {
        if (isUsingLocalStorage) {
          await importDataLocal(data.habits, data.entries);
          triggerLocalRefresh();
        } else if (currentUserId) {
          await importData(currentUserId, data.habits, data.entries);
        }
        await loadAllEntries();
      } else {
        throw new Error('Invalid import format');
      }
    } catch (err) {
      setError('Failed to import data');
      throw err;
    }
  }, [loadAllEntries, isUsingLocalStorage, currentUserId, isViewingFriend]);

  const clearAllData = useCallback(async () => {
    if (isViewingFriend) return;
    
    try {
      if (isUsingLocalStorage) {
        await deleteAllHabitsLocal();
        triggerLocalRefresh();
      } else if (currentUserId) {
        await deleteAllHabits(currentUserId);
      }
    } catch (err) {
      setError('Failed to clear data');
      throw err;
    }
  }, [isUsingLocalStorage, currentUserId, isViewingFriend]);

  const clearAllEntries = useCallback(async () => {
    if (isViewingFriend) return;
    
    try {
      if (isUsingLocalStorage) {
        await deleteAllEntriesLocal();
        triggerLocalRefresh();
      } else if (currentUserId) {
        await deleteAllEntries(currentUserId);
      }
      await loadAllEntries();
    } catch (err) {
      setError('Failed to clear entries');
      throw err;
    }
  }, [isUsingLocalStorage, currentUserId, loadAllEntries, isViewingFriend]);

  const generateFakeData = useCallback(async (months: number) => {
    if (isViewingFriend) return;
    
    try {
      const today = new Date();
      const startDate = subDays(today, months * 30);
      const days = eachDayOfInterval({ start: startDate, end: today });

      for (const habit of habits) {
        for (const day of days) {
          const dateStr = formatDate(day);
          const dailyGoal = habit.weeklyGoal / 7;
          
          const completionChance = Math.random();
          let value = 0;

          if (habit.type === 'binary') {
            value = completionChance > 0.3 ? 1 : 0;
          } else {
            if (completionChance > 0.3) {
              const variance = 0.8 + Math.random() * 0.4;
              value = Math.round(dailyGoal * variance);
            } else if (completionChance > 0.15) {
              value = Math.round(dailyGoal * (0.3 + Math.random() * 0.4));
            }
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
            } else if (currentUserId) {
              await upsertEntry(currentUserId, entry);
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
  }, [habits, isUsingLocalStorage, currentUserId, loadAllEntries, isViewingFriend]);

  const value: HabitContextType = {
    habits,
    entries,
    allEntries,
    weekStart,
    isLoading,
    error,
    isUsingLocalStorage,
    currentUserId,
    viewingUserId,
    isViewingFriend,
    setViewingUser,
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
    setCurrentUserId,
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

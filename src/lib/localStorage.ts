import type { Habit, DailyEntry } from '../types';

const STORAGE_KEY = 'habit-forge-data';

interface StorageData {
  habits: Habit[];
  entries: DailyEntry[];
}

function getStorageData(): StorageData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading from localStorage:', error);
  }
  return { habits: [], entries: [] };
}

function setStorageData(data: StorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
}

// ============ HABIT OPERATIONS ============

export async function createHabitLocal(habit: Habit): Promise<void> {
  const data = getStorageData();
  data.habits.push(habit);
  setStorageData(data);
}

export async function updateHabitLocal(habitId: string, updates: Partial<Habit>): Promise<void> {
  const data = getStorageData();
  const index = data.habits.findIndex((h) => h.id === habitId);
  if (index !== -1) {
    data.habits[index] = { ...data.habits[index], ...updates };
    setStorageData(data);
  }
}

export async function deleteHabitLocal(habitId: string): Promise<void> {
  const data = getStorageData();
  data.habits = data.habits.filter((h) => h.id !== habitId);
  data.entries = data.entries.filter((e) => e.habitId !== habitId);
  setStorageData(data);
}

export async function getHabitsLocal(): Promise<Habit[]> {
  const data = getStorageData();
  return data.habits
    .filter((h) => !h.archived)
    .sort((a, b) => a.order - b.order);
}

export function subscribeToHabitsLocal(callback: (habits: Habit[]) => void): () => void {
  // Initial load
  const data = getStorageData();
  const habits = data.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order);
  callback(habits);

  // Listen for storage events from other tabs
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      const newData = getStorageData();
      const newHabits = newData.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order);
      callback(newHabits);
    }
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}

// ============ ENTRY OPERATIONS ============

export async function upsertEntryLocal(entry: DailyEntry): Promise<void> {
  const data = getStorageData();
  const existingIndex = data.entries.findIndex(
    (e) => e.habitId === entry.habitId && e.date === entry.date
  );

  if (existingIndex !== -1) {
    // Keep the original targetAtEntry if not provided in update (preserve historical target)
    const existingTarget = data.entries[existingIndex].targetAtEntry;
    data.entries[existingIndex] = {
      ...data.entries[existingIndex],
      value: entry.value,
      targetAtEntry: entry.targetAtEntry ?? existingTarget,
      updatedAt: new Date().toISOString(),
    };
  } else {
    data.entries.push({
      ...entry,
      id: `${entry.habitId}_${entry.date}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  setStorageData(data);
}

export async function getEntriesForWeekLocal(weekStart: string, weekEnd: string): Promise<DailyEntry[]> {
  const data = getStorageData();
  return data.entries
    .filter((e) => e.date >= weekStart && e.date <= weekEnd)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getAllEntriesLocal(): Promise<DailyEntry[]> {
  const data = getStorageData();
  return data.entries.sort((a, b) => b.date.localeCompare(a.date));
}

export function subscribeToEntriesForWeekLocal(
  weekStart: string,
  weekEnd: string,
  callback: (entries: DailyEntry[]) => void
): () => void {
  // Initial load
  const data = getStorageData();
  const entries = data.entries
    .filter((e) => e.date >= weekStart && e.date <= weekEnd)
    .sort((a, b) => a.date.localeCompare(b.date));
  callback(entries);

  // Listen for storage events
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      const newData = getStorageData();
      const newEntries = newData.entries
        .filter((e) => e.date >= weekStart && e.date <= weekEnd)
        .sort((a, b) => a.date.localeCompare(b.date));
      callback(newEntries);
    }
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}

// ============ BULK OPERATIONS ============

export async function importDataLocal(habits: Habit[], entries: DailyEntry[]): Promise<void> {
  const data = getStorageData();
  
  // Merge habits (update existing, add new)
  habits.forEach((habit) => {
    const existingIndex = data.habits.findIndex((h) => h.id === habit.id);
    if (existingIndex !== -1) {
      data.habits[existingIndex] = habit;
    } else {
      data.habits.push(habit);
    }
  });

  // Merge entries (update existing, add new)
  entries.forEach((entry) => {
    const existingIndex = data.entries.findIndex(
      (e) => e.habitId === entry.habitId && e.date === entry.date
    );
    if (existingIndex !== -1) {
      data.entries[existingIndex] = entry;
    } else {
      data.entries.push(entry);
    }
  });

  setStorageData(data);
}

export async function resetWeekDataLocal(weekStart: string, weekEnd: string): Promise<void> {
  const data = getStorageData();
  data.entries = data.entries.filter((e) => e.date < weekStart || e.date > weekEnd);
  setStorageData(data);
}

export async function deleteAllHabitsLocal(): Promise<void> {
  setStorageData({ habits: [], entries: [] });
}

export async function deleteAllEntriesLocal(): Promise<void> {
  const data = getStorageData();
  data.entries = [];
  setStorageData(data);
}

// Trigger a manual refresh for the current tab
export function triggerLocalRefresh(): void {
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
}


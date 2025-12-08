import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import type { Habit, DailyEntry } from '../types';

// Firebase configuration - Replace with your own config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Check if Firebase is configured
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.apiKey !== "YOUR_API_KEY"
);

let app: ReturnType<typeof initializeApp> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

export { db };

// Collection references
const HABITS_COLLECTION = 'habits';
const ENTRIES_COLLECTION = 'entries';

// ============ HABIT OPERATIONS ============

export async function createHabit(habit: Habit): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const habitRef = doc(db, HABITS_COLLECTION, habit.id);
  await setDoc(habitRef, {
    ...habit,
    createdAt: Timestamp.now(),
  });
}

export async function updateHabit(habitId: string, updates: Partial<Habit>): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const habitRef = doc(db, HABITS_COLLECTION, habitId);
  await updateDoc(habitRef, updates);
}

export async function deleteHabit(habitId: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const batch = writeBatch(db);
  
  // Delete the habit
  const habitRef = doc(db, HABITS_COLLECTION, habitId);
  batch.delete(habitRef);
  
  // Delete all entries for this habit
  const entriesQuery = query(
    collection(db, ENTRIES_COLLECTION),
    where('habitId', '==', habitId)
  );
  const entriesSnapshot = await getDocs(entriesQuery);
  entriesSnapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  
  await batch.commit();
}

export async function getHabits(): Promise<Habit[]> {
  if (!db) throw new Error('Firebase not configured');
  // Fetch all habits and filter/sort client-side to avoid composite index requirement
  const snapshot = await getDocs(collection(db, HABITS_COLLECTION));
  return snapshot.docs
    .map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
      createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() || docSnap.data().createdAt,
    }) as Habit)
    .filter((habit) => !habit.archived)
    .sort((a, b) => a.order - b.order);
}

export function subscribeToHabits(callback: (habits: Habit[]) => void): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }
  
  // Subscribe to all habits and filter/sort client-side to avoid composite index requirement
  return onSnapshot(collection(db, HABITS_COLLECTION), (snapshot) => {
    const habits = snapshot.docs
      .map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
        createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() || docSnap.data().createdAt,
      }) as Habit)
      .filter((habit) => !habit.archived)
      .sort((a, b) => a.order - b.order);
    callback(habits);
  }, (error) => {
    console.error('Error subscribing to habits:', error);
    callback([]);
  });
}

// ============ ENTRY OPERATIONS ============

export async function upsertEntry(entry: DailyEntry): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const entryId = `${entry.habitId}_${entry.date}`;
  const entryRef = doc(db, ENTRIES_COLLECTION, entryId);
  
  const existingDoc = await getDoc(entryRef);
  
  if (existingDoc.exists()) {
    await updateDoc(entryRef, {
      value: entry.value,
      updatedAt: Timestamp.now(),
    });
  } else {
    await setDoc(entryRef, {
      ...entry,
      id: entryId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }
}

export async function getEntriesForWeek(weekStart: string, weekEnd: string): Promise<DailyEntry[]> {
  if (!db) throw new Error('Firebase not configured');
  const entriesQuery = query(
    collection(db, ENTRIES_COLLECTION),
    where('date', '>=', weekStart),
    where('date', '<=', weekEnd),
    orderBy('date', 'asc')
  );
  const snapshot = await getDocs(entriesQuery);
  return snapshot.docs.map((docSnap) => ({
    ...docSnap.data(),
    id: docSnap.id,
    createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() || docSnap.data().createdAt,
    updatedAt: docSnap.data().updatedAt?.toDate?.()?.toISOString() || docSnap.data().updatedAt,
  })) as DailyEntry[];
}

export async function getEntriesForHabit(habitId: string): Promise<DailyEntry[]> {
  if (!db) throw new Error('Firebase not configured');
  const entriesQuery = query(
    collection(db, ENTRIES_COLLECTION),
    where('habitId', '==', habitId),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(entriesQuery);
  return snapshot.docs.map((docSnap) => ({
    ...docSnap.data(),
    id: docSnap.id,
  })) as DailyEntry[];
}

export async function getAllEntries(): Promise<DailyEntry[]> {
  if (!db) throw new Error('Firebase not configured');
  const entriesQuery = query(
    collection(db, ENTRIES_COLLECTION),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(entriesQuery);
  return snapshot.docs.map((docSnap) => ({
    ...docSnap.data(),
    id: docSnap.id,
    createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() || docSnap.data().createdAt,
    updatedAt: docSnap.data().updatedAt?.toDate?.()?.toISOString() || docSnap.data().updatedAt,
  })) as DailyEntry[];
}

export function subscribeToEntriesForWeek(
  weekStart: string,
  weekEnd: string,
  callback: (entries: DailyEntry[]) => void
): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }
  
  const entriesQuery = query(
    collection(db, ENTRIES_COLLECTION),
    where('date', '>=', weekStart),
    where('date', '<=', weekEnd),
    orderBy('date', 'asc')
  );
  
  return onSnapshot(entriesQuery, (snapshot) => {
    const entries = snapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
      createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() || docSnap.data().createdAt,
      updatedAt: docSnap.data().updatedAt?.toDate?.()?.toISOString() || docSnap.data().updatedAt,
    })) as DailyEntry[];
    callback(entries);
  }, (error) => {
    console.error('Error subscribing to entries:', error);
    callback([]);
  });
}

// ============ BULK OPERATIONS ============

export async function importData(habits: Habit[], entries: DailyEntry[]): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const batch = writeBatch(db);
  
  habits.forEach((habit) => {
    const habitRef = doc(db!, HABITS_COLLECTION, habit.id);
    batch.set(habitRef, habit);
  });
  
  entries.forEach((entry) => {
    const entryId = `${entry.habitId}_${entry.date}`;
    const entryRef = doc(db!, ENTRIES_COLLECTION, entryId);
    batch.set(entryRef, { ...entry, id: entryId });
  });
  
  await batch.commit();
}

export async function resetWeekData(weekStart: string, weekEnd: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const entriesQuery = query(
    collection(db, ENTRIES_COLLECTION),
    where('date', '>=', weekStart),
    where('date', '<=', weekEnd)
  );
  
  const snapshot = await getDocs(entriesQuery);
  const batch = writeBatch(db);
  
  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  
  await batch.commit();
}

export async function deleteAllHabits(): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  
  // Delete all habits
  const habitsSnapshot = await getDocs(collection(db, HABITS_COLLECTION));
  const entriesSnapshot = await getDocs(collection(db, ENTRIES_COLLECTION));
  
  // Firestore batch has a limit of 500 operations, so we may need multiple batches
  const allDocs = [...habitsSnapshot.docs, ...entriesSnapshot.docs];
  const batchSize = 450;
  
  for (let i = 0; i < allDocs.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = allDocs.slice(i, i + batchSize);
    chunk.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }
}

export async function deleteAllEntries(): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  
  // Delete only entries (tracking data), keep habits
  const entriesSnapshot = await getDocs(collection(db, ENTRIES_COLLECTION));
  
  // Firestore batch has a limit of 500 operations, so we may need multiple batches
  const batchSize = 450;
  
  for (let i = 0; i < entriesSnapshot.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = entriesSnapshot.docs.slice(i, i + batchSize);
    chunk.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }
}

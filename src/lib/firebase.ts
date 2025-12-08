import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
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
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import type { Habit, DailyEntry } from '../types';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Check if Firebase is configured
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.apiKey !== ""
);

// Initialize Firebase only if configured
let app: ReturnType<typeof initializeApp> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

export { auth, db };
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
if (isFirebaseConfigured) {
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
}

// ============ USER-SPECIFIC FIRESTORE OPERATIONS ============

// Get user's habits collection reference
const getUserHabitsRef = (userId: string) => {
  if (!db) throw new Error('Firebase not configured');
  return collection(db, 'users', userId, 'habits');
};

// Get user's entries collection reference
const getUserEntriesRef = (userId: string) => {
  if (!db) throw new Error('Firebase not configured');
  return collection(db, 'users', userId, 'entries');
};

// ============ HABITS CRUD ============

export function subscribeToHabits(userId: string, callback: (habits: Habit[]) => void) {
  if (!db) {
    callback([]);
    return () => {};
  }

  const habitsRef = getUserHabitsRef(userId);
  const q = query(habitsRef, orderBy('order', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const habits: Habit[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Habit[];
    callback(habits);
  });
}

export async function createHabit(userId: string, habit: Habit) {
  if (!db) throw new Error('Firebase not configured');
  const habitsRef = getUserHabitsRef(userId);
  await setDoc(doc(habitsRef, habit.id), habit);
}

export async function updateHabit(userId: string, habitId: string, data: Partial<Habit>) {
  if (!db) throw new Error('Firebase not configured');
  const habitRef = doc(getUserHabitsRef(userId), habitId);
  await updateDoc(habitRef, data);
}

export async function deleteHabit(userId: string, habitId: string) {
  if (!db) throw new Error('Firebase not configured');
  const habitRef = doc(getUserHabitsRef(userId), habitId);
  await deleteDoc(habitRef);
}

// ============ ENTRIES CRUD ============

export function subscribeToEntriesForWeek(
  userId: string,
  weekStart: string,
  weekEnd: string,
  callback: (entries: DailyEntry[]) => void
) {
  if (!db) {
    callback([]);
    return () => {};
  }

  const entriesRef = getUserEntriesRef(userId);
  const q = query(
    entriesRef,
    where('date', '>=', weekStart),
    where('date', '<=', weekEnd)
  );

  return onSnapshot(q, (snapshot) => {
    const entries: DailyEntry[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DailyEntry[];
    callback(entries);
  });
}

export async function getAllEntries(userId: string): Promise<DailyEntry[]> {
  if (!db) return [];
  const entriesRef = getUserEntriesRef(userId);
  const snapshot = await getDocs(entriesRef);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as DailyEntry[];
}

export async function upsertEntry(userId: string, entry: DailyEntry) {
  if (!db) throw new Error('Firebase not configured');
  const entryRef = doc(getUserEntriesRef(userId), entry.id);
  await setDoc(entryRef, entry);
}

export async function resetWeekData(userId: string, weekStart: string, weekEnd: string) {
  if (!db) throw new Error('Firebase not configured');
  const entriesRef = getUserEntriesRef(userId);
  const q = query(
    entriesRef,
    where('date', '>=', weekStart),
    where('date', '<=', weekEnd)
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

export async function importData(userId: string, habits: Habit[], entries: DailyEntry[]) {
  if (!db) throw new Error('Firebase not configured');
  const batch = writeBatch(db);

  habits.forEach((habit) => {
    const habitRef = doc(getUserHabitsRef(userId), habit.id);
    batch.set(habitRef, habit);
  });

  entries.forEach((entry) => {
    const entryRef = doc(getUserEntriesRef(userId), entry.id);
    batch.set(entryRef, entry);
  });

  await batch.commit();
}

export async function deleteAllHabits(userId: string) {
  if (!db) throw new Error('Firebase not configured');
  const habitsRef = getUserHabitsRef(userId);
  const snapshot = await getDocs(habitsRef);
  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

export async function deleteAllEntries(userId: string) {
  if (!db) throw new Error('Firebase not configured');
  const entriesRef = getUserEntriesRef(userId);
  const snapshot = await getDocs(entriesRef);
  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

// ============ FRIEND DATA ACCESS (READ-ONLY) ============

export async function getFriendHabits(friendUserId: string): Promise<Habit[]> {
  if (!db) return [];
  const habitsRef = getUserHabitsRef(friendUserId);
  const q = query(habitsRef, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Habit[];
}

export async function getFriendEntries(friendUserId: string): Promise<DailyEntry[]> {
  if (!db) return [];
  const entriesRef = getUserEntriesRef(friendUserId);
  const snapshot = await getDocs(entriesRef);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as DailyEntry[];
}

export function subscribeToFriendHabits(friendUserId: string, callback: (habits: Habit[]) => void) {
  if (!db) {
    callback([]);
    return () => {};
  }

  const habitsRef = getUserHabitsRef(friendUserId);
  const q = query(habitsRef, orderBy('order', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const habits: Habit[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Habit[];
    callback(habits);
  });
}

export function subscribeToFriendEntries(friendUserId: string, callback: (entries: DailyEntry[]) => void) {
  if (!db) {
    callback([]);
    return () => {};
  }

  const entriesRef = getUserEntriesRef(friendUserId);

  return onSnapshot(entriesRef, (snapshot) => {
    const entries: DailyEntry[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DailyEntry[];
    callback(entries);
  });
}

// ============ USER PROFILE ============

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Timestamp | Date;
  friends: string[];
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!db) return null;
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data() as UserProfile;
  }
  return null;
}

export async function createUserProfile(profile: UserProfile) {
  if (!db) throw new Error('Firebase not configured');
  const userRef = doc(db, 'users', profile.uid);
  await setDoc(userRef, {
    ...profile,
    createdAt: serverTimestamp(),
  });
}

export async function updateUserProfile(userId: string, data: Partial<UserProfile>) {
  if (!db) throw new Error('Firebase not configured');
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, data);
}

export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  if (!db) return null;
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as UserProfile;
}

export async function getFriendProfiles(friendIds: string[]): Promise<UserProfile[]> {
  if (!db || friendIds.length === 0) return [];
  const profiles: UserProfile[] = [];
  for (const id of friendIds) {
    const profile = await getUserProfile(id);
    if (profile) profiles.push(profile);
  }
  return profiles;
}

export default app;

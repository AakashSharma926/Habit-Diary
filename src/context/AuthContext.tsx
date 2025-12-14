import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { 
  auth, 
  db, 
  googleProvider, 
  isFirebaseConfigured,
  claimSparksForCompletedDays,
} from '../lib/firebase';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
  sparks: number;
  claimedDays: string[]; // Array of "habitId_date" that have awarded sparks
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  allUsers: UserProfile[];
  isLoading: boolean;
  isAuthenticated: boolean;
  isFirebaseEnabled: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  claimSparks: (completedDays: { habitId: string; date: string }[]) => Promise<{ totalSparksEarned: number; claimedCount: number }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        const profile = await getOrCreateUserProfile(firebaseUser);
        setUserProfile(profile);
        // Load all users
        await loadAllUsers();
      } else {
        setUserProfile(null);
        setAllUsers([]);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Get or create user profile in Firestore
  const getOrCreateUserProfile = async (firebaseUser: User): Promise<UserProfile> => {
    if (!db) throw new Error('Firebase not configured');
    
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        uid: firebaseUser.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        createdAt: data.createdAt?.toDate() || new Date(),
        sparks: data.sparks || 0,
        claimedDays: data.claimedDays || [],
      };
    } else {
      const newProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        createdAt: serverTimestamp(),
        sparks: 0,
        claimedDays: [],
      };

      await setDoc(userRef, newProfile);

      return {
        ...newProfile,
        createdAt: new Date(),
      };
    }
  };

  // Refresh user profile from Firestore
  const refreshProfile = useCallback(async () => {
    if (!user || !db) return;
    const profile = await getOrCreateUserProfile(user);
    setUserProfile(profile);
  }, [user]);

  // Claim sparks for completed days (1 spark per completed day per habit)
  const claimSparks = useCallback(async (
    completedDays: { habitId: string; date: string }[]
  ): Promise<{ totalSparksEarned: number; claimedCount: number }> => {
    if (!user) return { totalSparksEarned: 0, claimedCount: 0 };
    
    const result = await claimSparksForCompletedDays(user.uid, completedDays);
    
    // Refresh profile to get updated sparks count
    if (result.claimedCount > 0) {
      await refreshProfile();
    }
    
    return result;
  }, [user, refreshProfile]);

  // Load all users from Firestore
  const loadAllUsers = async () => {
    if (!db) {
      setAllUsers([]);
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const users: UserProfile[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL,
          createdAt: data.createdAt?.toDate() || new Date(),
          sparks: data.sparks || 0,
          claimedDays: data.claimedDays || [],
        };
      });
      setAllUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
      setAllUsers([]);
    }
  };

  const refreshUsers = async () => {
    await loadAllUsers();
  };

  // Sign in with Google
  const signInWithGoogle = async (): Promise<void> => {
    if (!auth) throw new Error('Firebase not configured');
    await signInWithPopup(auth, googleProvider);
  };

  // Sign out
  const logout = async (): Promise<void> => {
    if (!auth) throw new Error('Firebase not configured');
    await signOut(auth);
  };

  const value: AuthContextType = {
    user,
    userProfile,
    allUsers,
    isLoading,
    isAuthenticated: !!user,
    isFirebaseEnabled: isFirebaseConfigured,
    signInWithGoogle,
    logout,
    refreshUsers,
    refreshProfile,
    claimSparks,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, getDocFromServer, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, updateProfile } from 'firebase/auth';

// Firebase configuration using environment variables for security
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/**
 * Updates the user's profile information
 */
export const updateUserProfile = async (displayName: string, photoURL: string) => {
  if (!auth.currentUser) throw new Error("No authenticated user");
  try {
    await updateProfile(auth.currentUser, {
      displayName,
      photoURL
    });
    return auth.currentUser;
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

/**
 * Validates connection to Firestore
 */
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

/**
 * Sign in with Google
 */
export const signIn = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Error signing in:", error);
    if (error.code === 'auth/popup-blocked') {
      throw new Error("Sign-in popup was blocked by your browser. Please allow popups for this site.");
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error("This domain is not authorized for Firebase Authentication. Please add it to the 'Authorized Domains' in the Firebase Console.");
    }
    throw error;
  }
};

/**
 * Sign out
 */
export const signOut = () => auth.signOut();

/**
 * Listen for auth state changes
 */
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Saves a generated meal plan to Firestore
 */
export const saveMealPlan = async (userId: string, planData: any) => {
  try {
    const docRef = await addDoc(collection(db, 'users', userId, 'plans'), {
      ...planData,
      userId,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving meal plan:", error);
    throw error;
  }
};

/**
 * Retrieves the user's saved plans from Firestore
 */
export const getSavedPlans = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'users', userId, 'plans')
      // Removed orderBy to avoid requiring a manual Firestore index for the prototype
    );
    const querySnapshot = await getDocs(q);
    const plans = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort manually in memory to avoid index requirement
    return plans.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error("Error fetching saved plans:", error);
    throw error;
  }
};

/**
 * Deletes a saved plan
 */
export const deletePlan = async (userId: string, planId: string) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'plans', planId));
  } catch (error) {
    console.error("Error deleting plan:", error);
    throw error;
  }
};

/**
 * Shares a meal plan
 */
export const shareMealPlan = async (userId: string, planData: any) => {
  try {
    const docRef = await addDoc(collection(db, 'sharedPlans'), {
      ...planData,
      userId,
      createdAt: new Date().toISOString(),
      sharedAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error sharing meal plan:", error);
    throw error;
  }
};

/**
 * Fetches a shared plan by ID
 */
export const getSharedPlan = async (shareId: string) => {
  try {
    const docRef = doc(db, 'sharedPlans', shareId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching shared plan:", error);
    throw error;
  }
};

/**
 * Updates user streaks
 */
export const updateUserStreak = async (userId: string) => {
  try {
    const statsRef = doc(db, 'users', userId, 'stats', 'current');
    const statsSnap = await getDoc(statsRef);
    const now = new Date();
    
    if (!statsSnap.exists()) {
      const initialStats = {
        currentStreak: 1,
        longestStreak: 1,
        lastUploadDate: now.toISOString(),
        totalPlansGenerated: 1
      };
      await setDoc(statsRef, initialStats);
      return initialStats;
    }

    const stats = statsSnap.data();
    const lastDate = new Date(stats.lastUploadDate);
    
    // Check if it's the same day
    if (lastDate.toDateString() === now.toDateString()) {
      return stats;
    }

    // Check if it's the next day (within 48 hours to be safe for "consecutive")
    const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
    
    let newStreak = stats.currentStreak;
    if (diffHours <= 48) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    const updatedStats = {
      ...stats,
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, stats.longestStreak),
      lastUploadDate: now.toISOString(),
      totalPlansGenerated: stats.totalPlansGenerated + 1
    };

    await setDoc(statsRef, updatedStats);
    return updatedStats;
  } catch (error) {
    console.error("Error updating streak:", error);
    throw error;
  }
};

/**
 * Gets user stats
 */
export const getUserStats = async (userId: string) => {
  try {
    const statsRef = doc(db, 'users', userId, 'stats', 'current');
    const statsSnap = await getDoc(statsRef);
    return statsSnap.exists() ? statsSnap.data() : null;
  } catch (error) {
    console.error("Error fetching user stats:", error);
    throw error;
  }
};

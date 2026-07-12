import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, getDocFromServer, setDoc, getDoc, runTransaction } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged, User, updateProfile } from 'firebase/auth';

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
    const isBase64 = photoURL.startsWith('data:image/');
    
    // Update Auth Profile (skip photoURL if it is a base64 data URL to prevent invalid-profile-attribute error)
    await updateProfile(auth.currentUser, {
      displayName,
      photoURL: isBase64 ? '' : photoURL
    });

    // Save/Merge the profile settings including the avatar photoURL inside Firestore
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(userRef, {
      displayName,
      photoURL
    }, { merge: true });

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

export const signIn = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Error signing in with popup:", error);
    
    // Fall back to redirect if popup is blocked or cancelled
    if (
      error.code === 'auth/popup-blocked' || 
      error.code === 'auth/cancelled-popup-request' ||
      error.code === 'auth/popup-closed-by-user'
    ) {
      console.log("Popup blocked or closed, falling back to signInWithRedirect...");
      try {
        await signInWithRedirect(auth, googleProvider);
        return null; // The page will redirect, no user returned synchronously
      } catch (redirectError: any) {
        console.error("Error signing in with redirect:", redirectError);
        throw redirectError;
      }
    }
    
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error("This domain is not authorized for Firebase Authentication. Please add it to the 'Authorized Domains' in the Firebase Console.");
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error("Google Sign-In is not enabled. Please enable Google Sign-In under Authentication > Sign-in method in your Firebase Console.");
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

/**
 * Claims a unique username for a user
 */
export const claimUsername = async (userId: string, username: string, displayName: string, photoURL: string) => {
  const cleanUsername = username.trim().toLowerCase();
  if (!cleanUsername) throw new Error("Username cannot be empty");
  if (!/^[a-zA-Z0-9_]{3,15}$/.test(cleanUsername)) {
    throw new Error("Username must be 3-15 alphanumeric characters or underscores");
  }

  const usernameRef = doc(db, 'usernames', cleanUsername);
  const userRef = doc(db, 'users', userId);

  try {
    await runTransaction(db, async (transaction) => {
      const usernameSnap = await transaction.get(usernameRef);
      if (usernameSnap.exists() && usernameSnap.data().uid !== userId) {
        throw new Error("Username already taken");
      }

      // Check if user already has a username to release
      const userSnap = await transaction.get(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.username && userData.username !== cleanUsername) {
          const oldUsernameRef = doc(db, 'usernames', userData.username);
          transaction.delete(oldUsernameRef);
        }
      }

      // Set new mapping
      transaction.set(usernameRef, {
        uid: userId,
        displayName: displayName || 'Anonymous',
        photoURL: photoURL || ''
      });

      // Update user doc
      transaction.set(userRef, {
        username: cleanUsername,
        displayName: displayName || 'Anonymous',
        photoURL: photoURL || ''
      }, { merge: true });
    });

    return cleanUsername;
  } catch (error) {
    console.error("Error claiming username:", error);
    throw error;
  }
};

/**
 * Searches a user by username
 */
export const getUserByUsername = async (username: string) => {
  const cleanUsername = username.trim().toLowerCase();
  const usernameRef = doc(db, 'usernames', cleanUsername);
  const snap = await getDoc(usernameRef);
  if (snap.exists()) {
    const data = snap.data();
    // Fetch their current streak
    const statsRef = doc(db, 'users', data.uid, 'stats', 'current');
    const statsSnap = await getDoc(statsRef);
    const stats = statsSnap.exists() ? statsSnap.data() : { currentStreak: 0, metabolicScore: 75 };
    return {
      uid: data.uid,
      username: cleanUsername,
      displayName: data.displayName || 'Anonymous',
      avatar: data.photoURL || '',
      streak: stats.currentStreak || 0,
      score: stats.metabolicScore || 75
    };
  }
  return null;
};

/**
 * Sends a friend request
 */
export const sendFriendRequest = async (
  senderId: string, 
  senderUsername: string, 
  senderDisplayName: string, 
  senderAvatar: string, 
  receiverId: string
) => {
  try {
    const incomingRef = doc(db, 'users', receiverId, 'incomingRequests', senderId);
    const outgoingRef = doc(db, 'users', senderId, 'outgoingRequests', receiverId);
    
    await setDoc(incomingRef, {
      uid: senderId,
      username: senderUsername,
      displayName: senderDisplayName,
      avatar: senderAvatar,
      timestamp: new Date().toISOString()
    });
    
    await setDoc(outgoingRef, {
      uid: receiverId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error sending friend request:", error);
    throw error;
  }
};

/**
 * Accepts a friend request
 */
export const acceptFriendRequest = async (
  userId: string,
  myUsername: string,
  myDisplayName: string,
  myAvatar: string,
  friendId: string,
  friendUsername: string,
  friendDisplayName: string,
  friendAvatar: string
) => {
  try {
    const myFriendRef = doc(db, 'users', userId, 'friends', friendId);
    const friendFriendRef = doc(db, 'users', friendId, 'friends', userId);

    await setDoc(myFriendRef, {
      uid: friendId,
      username: friendUsername,
      displayName: friendDisplayName,
      avatar: friendAvatar,
      addedAt: new Date().toISOString()
    });

    await setDoc(friendFriendRef, {
      uid: userId,
      username: myUsername,
      displayName: myDisplayName,
      avatar: myAvatar,
      addedAt: new Date().toISOString()
    });

    // Remove pending request docs
    await declineFriendRequest(userId, friendId);
  } catch (error) {
    console.error("Error accepting friend request:", error);
    throw error;
  }
};

/**
 * Declines/Removes a friend request
 */
export const declineFriendRequest = async (userId: string, friendId: string) => {
  try {
    const incomingRef = doc(db, 'users', userId, 'incomingRequests', friendId);
    const outgoingRef = doc(db, 'users', friendId, 'outgoingRequests', userId);
    const oppositeIncomingRef = doc(db, 'users', friendId, 'incomingRequests', userId);
    const oppositeOutgoingRef = doc(db, 'users', userId, 'outgoingRequests', friendId);

    await deleteDoc(incomingRef);
    await deleteDoc(outgoingRef);
    await deleteDoc(oppositeIncomingRef);
    await deleteDoc(oppositeOutgoingRef);
  } catch (error) {
    console.error("Error declining friend request:", error);
    throw error;
  }
};

/**
 * Gets incoming requests
 */
export const getIncomingRequests = async (userId: string) => {
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'incomingRequests'));
    return snap.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Error fetching incoming requests:", error);
    return [];
  }
};

/**
 * Gets outgoing requests
 */
export const getOutgoingRequests = async (userId: string) => {
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'outgoingRequests'));
    return snap.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Error fetching outgoing requests:", error);
    return [];
  }
};

/**
 * Gets friends list
 */
export const getFriends = async (userId: string) => {
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'friends'));
    return snap.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Error fetching friends:", error);
    return [];
  }
};

/**
 * Fetches current streaks & scores of multiple friends
 */
export const getFriendLeaderboardStats = async (friendUids: string[]) => {
  try {
    const stats: Record<string, { streak: number; score: number }> = {};
    for (const uid of friendUids) {
      const statsRef = doc(db, 'users', uid, 'stats', 'current');
      const statsSnap = await getDoc(statsRef);
      if (statsSnap.exists()) {
        const data = statsSnap.data();
        const streak = data.currentStreak || 0;
        const score = data.metabolicScore || Math.min(85 + (streak % 15), 100);
        stats[uid] = { streak, score };
      } else {
        stats[uid] = { streak: 0, score: 75 };
      }
    }
    return stats;
  } catch (error) {
    console.error("Error fetching friends leaderboard stats:", error);
    return {};
  }
};

/**
 * Seeds mockup users for searchable demos (e.g. huey, sarah, marcus, elena)
 */
export const seedDemoUsers = async () => {
  try {
    const demoUsers = [
      { uid: 'demo-huey', username: 'huey', displayName: 'Huey', photoURL: 'https://i.pravatar.cc/150?u=huey', streak: 12, score: 90 },
      { uid: 'demo-sarah', username: 'sarah', displayName: 'Sarah Chen', photoURL: 'https://i.pravatar.cc/150?u=sarah', streak: 24, score: 98 },
      { uid: 'demo-marcus', username: 'marcus', displayName: 'Marcus Wright', photoURL: 'https://i.pravatar.cc/150?u=marcus', streak: 18, score: 92 },
      { uid: 'demo-elena', username: 'elena', displayName: 'Elena Rodriguez', photoURL: 'https://i.pravatar.cc/150?u=elena', streak: 15, score: 89 }
    ];

    for (const user of demoUsers) {
      const usernameRef = doc(db, 'usernames', user.username);
      const userRef = doc(db, 'users', user.uid);
      const statsRef = doc(db, 'users', user.uid, 'stats', 'current');

      await setDoc(usernameRef, {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL
      });

      await setDoc(userRef, {
        username: user.username,
        displayName: user.displayName,
        photoURL: user.photoURL
      });

      await setDoc(statsRef, {
        currentStreak: user.streak,
        longestStreak: user.streak,
        lastUploadDate: new Date().toISOString(),
        totalPlansGenerated: 5,
        metabolicScore: user.score
      });
    }
    console.log("Demo users seeded successfully!");
  } catch (error) {
    console.error("Error seeding demo users:", error);
  }
};

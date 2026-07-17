import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword as fbSignIn, 
  createUserWithEmailAndPassword as fbCreateUser, 
  signOut as fbSignOut, 
  onAuthStateChanged as fbAuthStateChanged
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc,
  setDoc,
  getDoc
} from 'firebase/firestore';

// Types for our app
export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: 'fan' | 'staff';
}

export interface FanReport {
  id: string;
  category: string;
  location: string;
  description: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  status: 'pending' | 'resolved' | 'in-progress';
}

export interface BroadcastMessage {
  id: string;
  message: string;
  timestamp: number;
  author: string;
}

export interface GateStatus {
  id: string; // "Gate A", "Gate B", etc.
  name: string;
  occupancy: number;
  waitTime: string;
  status: 'critical' | 'optimal' | 'steady' | 'clear';
}

// -------------------------------------------------------------
// FIREBASE CONFIGURATION
// -------------------------------------------------------------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if we have a valid configuration (non-empty strings)
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
  firebaseConfig.projectId
);

let app;
let auth: any = null;
let db: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully.");
  } catch (error) {
    console.error("Firebase initialization failed, falling back to Mock mode:", error);
  }
} else {
  console.log("Firebase config not found or incomplete. Running in Local Mock Sync mode using BroadcastChannel.");
}

// -------------------------------------------------------------
// LOCAL MOCK STATE MANAGEMENT & SYNC (via BroadcastChannel)
// -------------------------------------------------------------
// We use a BroadcastChannel named 'setu_realtime' to sync state across browser tabs
const syncChannel = typeof window !== 'undefined' ? new BroadcastChannel('setu_realtime') : null;

// Initial gate states
const defaultGates: GateStatus[] = [
  { id: 'gate-a', name: 'Gate A', occupancy: 92, waitTime: '24m 12s', status: 'critical' },
  { id: 'gate-b', name: 'Gate B', occupancy: 34, waitTime: '04m 45s', status: 'optimal' },
  { id: 'gate-c', name: 'Gate C', occupancy: 58, waitTime: '11m 30s', status: 'steady' },
  { id: 'gate-d', name: 'Gate D', occupancy: 12, waitTime: '01m 20s', status: 'clear' }
];

// Helper to get mock data from localStorage
const getLocalData = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const saveLocalData = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Load initial local states
let mockReports: FanReport[] = getLocalData('setu_reports', []);
let mockBroadcasts: BroadcastMessage[] = getLocalData('setu_broadcasts', [
  {
    id: 'b1',
    message: "Gate D is currently the fastest entry with 4 min wait time.",
    timestamp: Date.now() - 3600000,
    author: "System Operations"
  }
]);
let mockGates: GateStatus[] = getLocalData('setu_gates', defaultGates);
let mockUsers: UserProfile[] = getLocalData('setu_users', []);
let currentMockUser: UserProfile | null = getLocalData('setu_current_user', null);

// Pub/Sub listeners for mock state changes inside the current tab
type ListenerCallback = (data: any) => void;
const mockListeners: { [key: string]: Set<ListenerCallback> } = {
  reports: new Set(),
  broadcasts: new Set(),
  gates: new Set(),
  auth: new Set()
};

// Handle incoming synchronization messages from other tabs
if (syncChannel) {
  syncChannel.onmessage = (event) => {
    const { type, payload } = event.data;
    if (type === 'SYNC_REPORTS') {
      mockReports = payload;
      saveLocalData('setu_reports', mockReports);
      mockListeners.reports.forEach(cb => cb([...mockReports]));
    } else if (type === 'SYNC_BROADCASTS') {
      mockBroadcasts = payload;
      saveLocalData('setu_broadcasts', mockBroadcasts);
      mockListeners.broadcasts.forEach(cb => cb([...mockBroadcasts]));
    } else if (type === 'SYNC_GATES') {
      mockGates = payload;
      saveLocalData('setu_gates', mockGates);
      mockListeners.gates.forEach(cb => cb([...mockGates]));
    }
  };
}

const triggerSync = (type: 'SYNC_REPORTS' | 'SYNC_BROADCASTS' | 'SYNC_GATES', payload: any) => {
  if (syncChannel) {
    syncChannel.postMessage({ type, payload });
  }
};

// -------------------------------------------------------------
// CORE SERVICE API (wraps Firebase vs Local Mock)
// -------------------------------------------------------------

// 1. Authentication
export const signUpUser = async (email: string, password: string, fullName: string, role: 'fan' | 'staff'): Promise<UserProfile> => {
  if (isFirebaseConfigured && auth && db) {
    const cred = await fbCreateUser(auth, email, password);
    const profile: UserProfile = {
      uid: cred.user.uid,
      email,
      fullName,
      role
    };
    // Save profile to Firestore
    await setDoc(doc(db, 'users', cred.user.uid), profile);
    return profile;
  } else {
    // Check if user already exists
    if (mockUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Email already registered.");
    }
    const profile: UserProfile = {
      uid: 'user_' + Math.random().toString(36).substr(2, 9),
      email,
      fullName,
      role
    };
    mockUsers.push(profile);
    saveLocalData('setu_users', mockUsers);
    
    // Set current user
    currentMockUser = profile;
    saveLocalData('setu_current_user', currentMockUser);
    
    // Notify local auth listeners
    mockListeners.auth.forEach(cb => cb(currentMockUser));
    return profile;
  }
};

export const signInUser = async (email: string, password: string): Promise<UserProfile> => {
  if (isFirebaseConfigured && auth && db) {
    const cred = await fbSignIn(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    throw new Error("User profile not found in database.");
  } else {
    // Simple password check (anything works for demo, but we validate user email)
    const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error("Invalid email or password.");
    }
    currentMockUser = user;
    saveLocalData('setu_current_user', currentMockUser);
    mockListeners.auth.forEach(cb => cb(currentMockUser));
    return user;
  }
};

export const logoutUser = async (): Promise<void> => {
  if (isFirebaseConfigured && auth) {
    await fbSignOut(auth);
  } else {
    currentMockUser = null;
    localStorage.removeItem('setu_current_user');
    mockListeners.auth.forEach(cb => cb(null));
  }
};

export const subscribeToAuth = (callback: (user: UserProfile | null) => void) => {
  if (isFirebaseConfigured && auth && db) {
    return fbAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            callback(userDoc.data() as UserProfile);
            return;
          }
        } catch (e) {
          console.error("Error loading user profile on auth state change", e);
        }
      }
      callback(null);
    });
  } else {
    mockListeners.auth.add(callback);
    callback(currentMockUser);
    return () => {
      mockListeners.auth.delete(callback);
    };
  }
};

// 2. Reports
export const submitReport = async (reportData: Omit<FanReport, 'id' | 'timestamp' | 'status'>): Promise<void> => {
  const newReport: FanReport = {
    ...reportData,
    id: 'rep_' + Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    status: 'pending'
  };

  if (isFirebaseConfigured && db) {
    await addDoc(collection(db, 'reports'), newReport);
  } else {
    mockReports.unshift(newReport); // Newest first
    saveLocalData('setu_reports', mockReports);
    triggerSync('SYNC_REPORTS', mockReports);
    mockListeners.reports.forEach(cb => cb([...mockReports]));
  }
};

export const subscribeToReports = (callback: (reports: FanReport[]) => void) => {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const reportsList: FanReport[] = [];
      snapshot.forEach((doc) => {
        reportsList.push(doc.data() as FanReport);
      });
      callback(reportsList);
    });
  } else {
    mockListeners.reports.add(callback);
    callback([...mockReports]);
    return () => {
      mockListeners.reports.delete(callback);
    };
  }
};

// 3. Broadcast messages
export const publishBroadcast = async (message: string, author: string): Promise<void> => {
  const newBroadcast: BroadcastMessage = {
    id: 'broad_' + Math.random().toString(36).substr(2, 9),
    message,
    timestamp: Date.now(),
    author
  };

  if (isFirebaseConfigured && db) {
    await addDoc(collection(db, 'broadcasts'), newBroadcast);
  } else {
    mockBroadcasts.unshift(newBroadcast); // Newest first
    saveLocalData('setu_broadcasts', mockBroadcasts);
    triggerSync('SYNC_BROADCASTS', mockBroadcasts);
    mockListeners.broadcasts.forEach(cb => cb([...mockBroadcasts]));
  }
};

export const subscribeToBroadcasts = (callback: (broadcasts: BroadcastMessage[]) => void) => {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'broadcasts'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const broadcastsList: BroadcastMessage[] = [];
      snapshot.forEach((doc) => {
        broadcastsList.push(doc.data() as BroadcastMessage);
      });
      callback(broadcastsList);
    });
  } else {
    mockListeners.broadcasts.add(callback);
    callback([...mockBroadcasts]);
    return () => {
      mockListeners.broadcasts.delete(callback);
    };
  }
};

// 4. Gates Wait Times & Occupancy
export const updateGateStatusInDB = async (gateId: string, occupancy: number, waitTime: string, status: 'critical' | 'optimal' | 'steady' | 'clear'): Promise<void> => {
  if (isFirebaseConfigured && db) {
    const gateDoc = doc(db, 'gates', gateId);
    await updateDoc(gateDoc, { occupancy, waitTime, status });
  } else {
    mockGates = mockGates.map(g => g.id === gateId ? { ...g, occupancy, waitTime, status } : g);
    saveLocalData('setu_gates', mockGates);
    triggerSync('SYNC_GATES', mockGates);
    mockListeners.gates.forEach(cb => cb([...mockGates]));
  }
};

export const subscribeToGates = (callback: (gates: GateStatus[]) => void) => {
  if (isFirebaseConfigured && db) {
    return onSnapshot(collection(db, 'gates'), (snapshot) => {
      const gatesList: GateStatus[] = [];
      snapshot.forEach((doc) => {
        gatesList.push(doc.data() as GateStatus);
      });
      // Sort to make sure they are in consistent order (A, B, C, D)
      gatesList.sort((a, b) => a.name.localeCompare(b.name));
      callback(gatesList);
    });
  } else {
    mockListeners.gates.add(callback);
    callback([...mockGates]);
    return () => {
      mockListeners.gates.delete(callback);
    };
  }
};

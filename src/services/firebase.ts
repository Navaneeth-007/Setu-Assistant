import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword as fbSignIn, 
  createUserWithEmailAndPassword as fbCreateUser, 
  signOut as fbSignOut, 
  onAuthStateChanged as fbAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
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
  status: 'pending' | 'checking' | 'resolving' | 'resolved';
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
  auth: new Set(),
  brief: new Set(),
  facilities: new Set()
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
    } else if (type === 'SYNC_BRIEF') {
      saveLocalData('setu_latest_brief', payload);
      mockListeners.brief.forEach(cb => cb([...payload]));
    } else if (type === 'SYNC_FACILITIES') {
      mockFacilities = payload;
      saveLocalData('setu_facilities', mockFacilities);
      mockListeners.facilities.forEach(cb => cb([...mockFacilities]));
    }
  };
}

const triggerSync = (type: 'SYNC_REPORTS' | 'SYNC_BROADCASTS' | 'SYNC_GATES' | 'SYNC_BRIEF' | 'SYNC_FACILITIES', payload: any) => {
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
    await setDoc(doc(db, 'users', cred.user.uid), profile);
    return profile;
  } else {
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
    currentMockUser = profile;
    saveLocalData('setu_current_user', currentMockUser);
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

export const signInWithGoogle = async (preferredRole: 'fan' | 'staff' = 'fan'): Promise<UserProfile> => {
  if (isFirebaseConfigured && auth && db) {
    localStorage.setItem('preferred_google_role', preferredRole);
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const profile: UserProfile = {
      uid: cred.user.uid,
      email: cred.user.email || '',
      fullName: cred.user.displayName || 'Google User',
      role: preferredRole
    };
    const userDocRef = doc(db, 'users', cred.user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    } else {
      await setDoc(userDocRef, profile);
      return profile;
    }
  } else {
    const email = `google_${preferredRole}@example.com`;
    let user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      user = {
        uid: 'google_user_' + Math.random().toString(36).substr(2, 9),
        email,
        fullName: `Google ${preferredRole === 'fan' ? 'Fan' : 'Staff'}`,
        role: preferredRole
      };
      mockUsers.push(user);
      saveLocalData('setu_users', mockUsers);
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
        const userDocRef = doc(db, 'users', fbUser.uid);
        let userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          // Wait for 1.2 seconds to allow signInWithGoogle to complete its write operation
          await new Promise(resolve => setTimeout(resolve, 1200));
          userDoc = await getDoc(userDocRef);
        }
        
        if (!userDoc.exists()) {
          const role = (localStorage.getItem('preferred_google_role') as 'fan' | 'staff') || 'fan';
          const profile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            fullName: fbUser.displayName || 'Google User',
            role
          };
          await setDoc(userDocRef, profile);
          userDoc = await getDoc(userDocRef);
        }
        
        if (userDoc.exists()) {
          callback(userDoc.data() as UserProfile);
          return;
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
    await setDoc(doc(db, 'reports', newReport.id), newReport);
  } else {
    mockReports.unshift(newReport); // Newest first
    saveLocalData('setu_reports', mockReports);
    triggerSync('SYNC_REPORTS', mockReports);
    mockListeners.reports.forEach(cb => cb([...mockReports]));
  }
};

export const updateReportStatusInDB = async (reportId: string, status: 'pending' | 'checking' | 'resolving' | 'resolved'): Promise<void> => {
  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db, 'reports', reportId), { status });
  } else {
    mockReports = mockReports.map(r => r.id === reportId ? { ...r, status } : r);
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
        reportsList.push({
          ...(doc.data() as FanReport),
          id: doc.id
        });
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
    return onSnapshot(collection(db, 'gates'), async (snapshot) => {
      if (snapshot.empty) {
        console.log("Firestore 'gates' collection is empty. Auto-seeding default gate configurations...");
        try {
          for (const gate of defaultGates) {
            await setDoc(doc(db, 'gates', gate.id), gate);
          }
        } catch (err) {
          console.error("Failed to seed default gates:", err);
        }
        return;
      }
      const gatesList: GateStatus[] = [];
      snapshot.forEach((doc) => {
        gatesList.push(doc.data() as GateStatus);
      });
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

// 5. GenAI Situation Brief Telemetry Sync
export interface SituationAction {
  title: string;
  description: string;
  type: string;
}

const defaultBriefActions: SituationAction[] = [
  {
    title: "CRITICAL ACTION REQUIRED",
    description: "Reroute incoming fans away from Gate A to Gate B. Queue density at Gate A is exceeding safety threshold (92%).",
    type: "critical"
  },
  {
    title: "MAINTENANCE DISPATCH",
    description: "Dispatch technician to Section 114 to repair lighting array failure reported by visual AI triage.",
    type: "warning"
  }
];

export const saveLatestBrief = async (actions: SituationAction[]): Promise<void> => {
  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, 'briefs', 'latest'), { actions, timestamp: Date.now() });
  } else {
    saveLocalData('setu_latest_brief', actions);
    triggerSync('SYNC_BRIEF', actions);
    mockListeners.brief.forEach(cb => cb([...actions]));
  }
};

export const subscribeToLatestBrief = (callback: (actions: SituationAction[]) => void) => {
  if (isFirebaseConfigured && db) {
    return onSnapshot(doc(db, 'briefs', 'latest'), async (snapshot) => {
      if (!snapshot.exists()) {
        console.log("Firestore 'briefs/latest' doc is empty. Auto-seeding initial situation brief...");
        try {
          await setDoc(doc(db, 'briefs', 'latest'), { actions: defaultBriefActions, timestamp: Date.now() });
        } catch (err) {
          console.error("Failed to seed default situation brief:", err);
        }
        return;
      }
      callback(snapshot.data().actions as SituationAction[]);
    });
  } else {
    mockListeners.brief.add(callback);
    const localBrief = getLocalData('setu_latest_brief', defaultBriefActions);
    callback(localBrief);
    return () => {
      mockListeners.brief.delete(callback);
    };
  }
};

// 6. Facilities Telemetry
export interface FacilityStatus {
  id: string;
  name: string;
  type: 'restaurant' | 'merch' | 'restroom';
  occupancy: number;
  waitTime: string;
  status: 'clear' | 'moderate' | 'busy' | 'dense';
}

const defaultFacilities: FacilityStatus[] = [
  { id: 'lone-star-grill', name: 'Lone Star Grill (BBQ)', type: 'restaurant', occupancy: 75, waitTime: '12 mins', status: 'busy' },
  { id: 'verde-cantina', name: 'Verde Cantina (Tex-Mex)', type: 'restaurant', occupancy: 40, waitTime: '5 mins', status: 'moderate' },
  { id: 'green-bowl', name: 'The Green Bowl (Healthy)', type: 'restaurant', occupancy: 20, waitTime: '2 mins', status: 'clear' },
  { id: 'merch-store', name: 'Munchies & Merch', type: 'merch', occupancy: 45, waitTime: '6 mins', status: 'moderate' },
  { id: 'restrooms-114', name: 'Restrooms (Sec 114)', type: 'restroom', occupancy: 90, waitTime: '18 mins', status: 'dense' },
  { id: 'restrooms-130', name: 'Restrooms (Sec 130)', type: 'restroom', occupancy: 30, waitTime: '3 mins', status: 'clear' },
  { id: 'restrooms-205', name: 'Restrooms (Sec 205)', type: 'restroom', occupancy: 55, waitTime: '7 mins', status: 'moderate' },
  { id: 'restrooms-312', name: 'Restrooms (Sec 312)', type: 'restroom', occupancy: 15, waitTime: '1 min', status: 'clear' }
];

let mockFacilities: FacilityStatus[] = getLocalData('setu_facilities', defaultFacilities);

export const updateFacilityStatusInDB = async (facilityId: string, occupancy: number, waitTime: string, status: 'clear' | 'moderate' | 'busy' | 'dense'): Promise<void> => {
  if (isFirebaseConfigured && db) {
    const facilityDoc = doc(db, 'facilities', facilityId);
    await updateDoc(facilityDoc, { occupancy, waitTime, status });
  } else {
    mockFacilities = mockFacilities.map(f => f.id === facilityId ? { ...f, occupancy, waitTime, status } : f);
    saveLocalData('setu_facilities', mockFacilities);
    triggerSync('SYNC_FACILITIES', mockFacilities);
    mockListeners.facilities.forEach(cb => cb([...mockFacilities]));
  }
};

export const subscribeToFacilities = (callback: (facilities: FacilityStatus[]) => void) => {
  if (isFirebaseConfigured && db) {
    return onSnapshot(collection(db, 'facilities'), async (snapshot) => {
      if (snapshot.empty) {
        console.log("Firestore 'facilities' collection is empty. Auto-seeding default facilities telemetry...");
        try {
          for (const facility of defaultFacilities) {
            await setDoc(doc(db, 'facilities', facility.id), facility);
          }
        } catch (err) {
          console.error("Failed to seed default facilities:", err);
        }
        return;
      }
      const facilitiesList: FacilityStatus[] = [];
      snapshot.forEach((doc) => {
        facilitiesList.push(doc.data() as FacilityStatus);
      });
      callback(facilitiesList);
    });
  } else {
    mockListeners.facilities.add(callback);
    callback([...mockFacilities]);
    return () => {
      mockListeners.facilities.delete(callback);
    };
  }
};

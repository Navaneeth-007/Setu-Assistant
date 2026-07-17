import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  submitReport, 
  publishBroadcast, 
  updateGateStatusInDB,
  subscribeToReports,
  subscribeToBroadcasts,
  subscribeToGates
} from '../services/firebase';
import type { 
  FanReport, 
  BroadcastMessage, 
  GateStatus 
} from '../services/firebase';
import { triageReport } from '../services/gemini';

interface LiveDataContextType {
  reports: FanReport[];
  broadcasts: BroadcastMessage[];
  gates: GateStatus[];
  loadingData: boolean;
  addReport: (category: string, location: string, description: string) => Promise<void>;
  sendBroadcast: (message: string, author: string) => Promise<void>;
  updateGateStatus: (gateId: string, occupancy: number, waitTime: string, status: 'critical' | 'optimal' | 'steady' | 'clear') => Promise<void>;
}

const LiveDataContext = createContext<LiveDataContextType | undefined>(undefined);

export const LiveDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reports, setReports] = useState<FanReport[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [gates, setGates] = useState<GateStatus[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    // 1. Subscribe to reports
    const unsubReports = subscribeToReports((data) => {
      setReports(data);
    });

    // 2. Subscribe to broadcasts
    const unsubBroadcasts = subscribeToBroadcasts((data) => {
      setBroadcasts(data);
    });

    // 3. Subscribe to gates
    const unsubGates = subscribeToGates((data) => {
      setGates(data);
      setLoadingData(false);
    });

    return () => {
      unsubReports();
      unsubBroadcasts();
      unsubGates();
    };
  }, []);

  const addReport = async (category: string, location: string, description: string) => {
    try {
      // 1. Perform AI Triage first (runs client side with saved API key, falls back to mock logic if offline)
      const triage = await triageReport(category, location, description);
      
      // 2. Submit the triaged report to Firebase / MockDB
      await submitReport({
        category,
        location,
        description,
        severity: triage.severity,
        summary: triage.summary
      });
    } catch (e) {
      console.error("Failed to submit report:", e);
      throw e;
    }
  };

  const sendBroadcast = async (message: string, author: string) => {
    try {
      await publishBroadcast(message, author);
    } catch (e) {
      console.error("Failed to send broadcast:", e);
      throw e;
    }
  };

  const updateGateStatus = async (
    gateId: string, 
    occupancy: number, 
    waitTime: string, 
    status: 'critical' | 'optimal' | 'steady' | 'clear'
  ) => {
    try {
      await updateGateStatusInDB(gateId, occupancy, waitTime, status);
    } catch (e) {
      console.error("Failed to update gate status:", e);
      throw e;
    }
  };

  return (
    <LiveDataContext.Provider value={{ 
      reports, 
      broadcasts, 
      gates, 
      loadingData, 
      addReport, 
      sendBroadcast, 
      updateGateStatus 
    }}>
      {children}
    </LiveDataContext.Provider>
  );
};

export const useLiveData = () => {
  const context = useContext(LiveDataContext);
  if (!context) {
    throw new Error('useLiveData must be used within a LiveDataProvider');
  }
  return context;
};

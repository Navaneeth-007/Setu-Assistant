import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  submitReport, 
  publishBroadcast, 
  updateGateStatusInDB,
  subscribeToReports,
  subscribeToBroadcasts,
  subscribeToGates,
  subscribeToLatestBrief,
  saveLatestBrief,
  subscribeToFacilities,
  updateFacilityStatusInDB,
  updateReportStatusInDB
} from '../services/firebase';
import type { 
  FanReport, 
  BroadcastMessage, 
  GateStatus,
  SituationAction,
  FacilityStatus
} from '../services/firebase';
import { triageReport } from '../services/gemini';

interface LiveDataContextType {
  reports: FanReport[];
  broadcasts: BroadcastMessage[];
  gates: GateStatus[];
  briefActions: SituationAction[];
  facilities: FacilityStatus[];
  loadingData: boolean;
  addReport: (category: string, location: string, description: string) => Promise<void>;
  sendBroadcast: (message: string, author: string) => Promise<void>;
  updateGateStatus: (gateId: string, occupancy: number, waitTime: string, status: 'critical' | 'optimal' | 'steady' | 'clear') => Promise<void>;
  updateBriefActions: (actions: SituationAction[]) => Promise<void>;
  updateFacilityStatus: (facilityId: string, occupancy: number, waitTime: string, status: 'clear' | 'moderate' | 'busy' | 'dense') => Promise<void>;
  updateReportStatus: (reportId: string, status: 'pending' | 'checking' | 'resolving' | 'resolved') => Promise<void>;
}

const LiveDataContext = createContext<LiveDataContextType | undefined>(undefined);

export const LiveDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reports, setReports] = useState<FanReport[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [gates, setGates] = useState<GateStatus[]>([]);
  const [briefActions, setBriefActions] = useState<SituationAction[]>([]);
  const [facilities, setFacilities] = useState<FacilityStatus[]>([]);
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

    // 4. Subscribe to GenAI Situation Brief
    const unsubBrief = subscribeToLatestBrief((data) => {
      setBriefActions(data);
    });

    // 5. Subscribe to Facilities Telemetry
    const unsubFacilities = subscribeToFacilities((data) => {
      setFacilities(data);
    });

    return () => {
      unsubReports();
      unsubBroadcasts();
      unsubGates();
      unsubBrief();
      unsubFacilities();
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

  const updateBriefActions = async (actions: SituationAction[]) => {
    try {
      await saveLatestBrief(actions);
    } catch (e) {
      console.error("Failed to save latest brief:", e);
      throw e;
    }
  };

  const updateFacilityStatus = async (
    facilityId: string, 
    occupancy: number, 
    waitTime: string, 
    status: 'clear' | 'moderate' | 'busy' | 'dense'
  ) => {
    try {
      await updateFacilityStatusInDB(facilityId, occupancy, waitTime, status);
    } catch (e) {
      console.error("Failed to update facility status:", e);
      throw e;
    }
  };

  const updateReportStatus = async (reportId: string, status: 'pending' | 'checking' | 'resolving' | 'resolved') => {
    try {
      await updateReportStatusInDB(reportId, status);
    } catch (e) {
      console.error("Failed to update report status:", e);
      throw e;
    }
  };

  return (
    <LiveDataContext.Provider value={{ 
      reports, 
      broadcasts, 
      gates, 
      briefActions,
      facilities,
      loadingData, 
      addReport, 
      sendBroadcast, 
      updateGateStatus,
      updateBriefActions,
      updateFacilityStatus,
      updateReportStatus
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

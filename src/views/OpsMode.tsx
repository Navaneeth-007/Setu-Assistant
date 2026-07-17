import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLiveData } from '../context/LiveDataContext';
import { generateSituationBrief } from '../services/gemini';

interface OpsModeProps {
  onNavigateToSettings: () => void;
  onNavigateToFan: () => void; // Allow staff to toggle to Fan Mode
}

interface SituationAction {
  title: string;
  description: string;
  type: 'critical' | 'warning' | 'info';
}

export const OpsMode: React.FC<OpsModeProps> = ({ onNavigateToSettings, onNavigateToFan }) => {
  const { user, logout } = useAuth();
  const { reports, broadcasts, gates, sendBroadcast, updateGateStatus } = useLiveData();

  // Broadcast text state
  const [broadcastInput, setBroadcastInput] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Situation Brief states
  const [briefActions, setBriefActions] = useState<SituationAction[]>([
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
  ]);
  const [briefLoading, setBriefLoading] = useState(false);

  // Gate simulation states (to allow easy testing of real-time wait times)
  const [selectedGateSim, setSelectedGateSim] = useState<any>(null);
  const [simOccupancy, setSimOccupancy] = useState(50);
  const [simWaitTime, setSimWaitTime] = useState('10m');

  // Trigger Situation Brief generation
  const handleGenerateBrief = async () => {
    setBriefLoading(true);
    try {
      const brief = await generateSituationBrief(gates, reports);
      setBriefActions(brief.actions);
    } catch (e) {
      console.error("Failed to generate brief:", e);
    } finally {
      setBriefLoading(false);
    }
  };

  // Trigger Broadcast
  const handlePushBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastInput.trim()) return;

    setBroadcastSending(true);
    try {
      await sendBroadcast(broadcastInput, user?.fullName || "Ops Center");
      setBroadcastInput('');
      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setBroadcastSending(false);
    }
  };

  // Trigger Gate Status Update (Simulation)
  const handleGateSimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGateSim) return;

    let status: 'critical' | 'optimal' | 'steady' | 'clear' = 'steady';
    if (simOccupancy >= 80) status = 'critical';
    else if (simOccupancy <= 35) status = 'optimal';
    else if (simOccupancy <= 15) status = 'clear';

    try {
      await updateGateStatus(selectedGateSim.id, simOccupancy, simWaitTime, status);
      setSelectedGateSim(null);
    } catch (e) {
      console.error(e);
    }
  };

  const selectGateForSim = (gate: any) => {
    setSelectedGateSim(gate);
    setSimOccupancy(gate.occupancy);
    setSimWaitTime(gate.waitTime);
  };

  return (
    <div className="flex h-screen bg-surface-dim text-on-background font-body-md overflow-hidden relative">
      
      {/* Sidebar Navigation */}
      <aside className="hidden lg:flex flex-col w-64 h-full bg-surface-container-low border-r border-outline-variant py-lg gap-md shrink-0">
        <div className="px-lg mb-xl">
          <div className="flex items-center gap-sm mb-xs">
            <div className="w-8 h-8 flex items-center justify-center bg-secondary-container rounded-lg">
              <span className="material-symbols-outlined text-on-secondary-container text-body-md">security</span>
            </div>
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface">SETU</h1>
          </div>
          <div className="flex flex-col">
            <span className="font-label-caps text-[10px] text-on-surface tracking-[0.2em] opacity-80 uppercase">Ops Center</span>
            <span className="font-data-mono text-[10px] text-primary">Stadium Monitor</span>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          <a className="flex items-center gap-md px-lg py-md custom-active-nav text-primary font-bold" href="#dashboard">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-label-caps text-label-caps">Dashboard</span>
          </a>
          <button 
            onClick={onNavigateToFan}
            className="flex items-center gap-md px-lg py-md text-on-surface-variant hover:bg-surface-container-highest transition-all rounded w-full text-left cursor-pointer"
          >
            <span className="material-symbols-outlined">preview</span>
            <span className="font-label-caps text-label-caps">Preview Fan Mode</span>
          </button>
        </nav>

        <div className="mt-auto px-lg flex flex-col gap-xs pt-lg border-t border-outline-variant/30">
          <button 
            onClick={onNavigateToSettings}
            className="flex items-center gap-md py-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer w-full text-left"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-caps text-label-caps">Settings</span>
          </button>
          <button 
            onClick={logout}
            className="flex items-center gap-md py-sm text-error hover:brightness-110 transition-colors cursor-pointer w-full text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-caps text-label-caps">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-lg border-b border-outline-variant/30 bg-surface-dim/80 backdrop-blur-md z-40 shrink-0">
          <div className="flex items-center gap-xl">
            <h2 className="text-xl font-bold tracking-tight text-on-surface uppercase">Ops Command Center</h2>
            <div className="hidden md:flex items-center gap-md px-md py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/50">
              <div className="h-2 w-2 rounded-full bg-error animate-pulse shadow-[0_0_8px_rgba(255,180,171,0.6)]"></div>
              <span className="font-data-mono text-[11px] text-error font-bold uppercase tracking-wider">Live System Sync Active</span>
            </div>
          </div>

          <div className="flex items-center gap-lg">
            {/* Nav controls */}
            <button 
              onClick={onNavigateToSettings}
              className="p-1.5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              title="Settings"
            >
              <span className="material-symbols-outlined text-xl">settings</span>
            </button>
            <button 
              onClick={onNavigateToFan}
              className="px-md py-sm bg-primary-container text-on-primary-container font-label-caps text-label-caps rounded-lg border border-primary/20 hover:bg-surface-bright transition-colors cursor-pointer"
            >
              Fan View
            </button>

            <div className="flex items-center gap-md ml-sm border-l border-outline-variant/20 pl-lg">
              <div className="text-right hidden sm:block">
                <p className="font-label-caps text-[11px] text-primary leading-none">{user?.fullName}</p>
                <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Stadium Volunteer</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-primary-container p-0.5 flex items-center justify-center bg-surface-container-highest">
                <span className="material-symbols-outlined text-primary text-xl">person</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Panel */}
        <main className="flex-1 overflow-y-auto p-lg lg:p-xl space-y-lg">
          
          {/* Active Broadcast Banner */}
          {broadcasts.length > 0 && (
            <div className="w-full bg-secondary-container/40 border border-secondary-container text-on-secondary-container px-lg py-md rounded-xl flex items-center justify-between group shadow-lg">
              <div className="flex items-center gap-md">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                  <span className="material-symbols-outlined">campaign</span>
                </div>
                <div>
                  <p className="font-body-md text-sm font-semibold italic text-secondary-fixed">"{broadcasts[0].message}"</p>
                  <p className="text-[10px] opacity-60 uppercase font-data-mono">Active Broadcast pushed by {broadcasts[0].author}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-data-mono text-[11px] font-bold block">
                  {new Date(broadcasts[0].timestamp).toLocaleTimeString()}
                </span>
                <span className="text-[9px] uppercase tracking-widest opacity-50">Sent</span>
              </div>
            </div>
          )}

          <div className="ops-grid">
            
            {/* AI Situation Brief (Central Operational Support) */}
            <section className="col-span-12 lg:col-span-8 bg-surface-container-high ai-glow rounded-2xl p-xl overflow-hidden relative border border-primary/20">
              <div className="absolute -top-12 -right-12 p-lg opacity-[0.02]">
                <span className="material-symbols-outlined text-[160px]">psychology</span>
              </div>
              
              <div className="flex flex-col md:flex-row justify-between items-start mb-xl relative z-10">
                <div>
                  <div className="flex items-center gap-sm mb-xs">
                    <span className="material-symbols-outlined text-primary">auto_awesome</span>
                    <h3 className="font-headline-lg-mobile text-xl text-on-surface font-bold uppercase tracking-wide">GenAI Situation Brief</h3>
                  </div>
                  <p className="text-on-surface-variant font-body-md text-sm max-w-xl">
                    Reads real-time gate occupancy, wait times, and fan tickets to compile recommendations.
                  </p>
                </div>
                <button 
                  onClick={handleGenerateBrief}
                  disabled={briefLoading}
                  className="mt-md md:mt-0 flex items-center gap-sm bg-primary/10 border border-primary/30 text-primary px-lg py-md rounded-xl font-label-caps text-xs hover:bg-primary/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {briefLoading ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">refresh</span>
                      <span>Regenerate Brief</span>
                    </>
                  )}
                </button>
              </div>

              {/* Brief Content Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md relative z-10">
                {briefLoading ? (
                  <div className="col-span-2 py-xl text-center space-y-md">
                    <div className="flex items-center justify-center gap-md">
                      <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                      <span className="font-data-mono text-sm text-primary uppercase">RAG pipeline querying stadium logs...</span>
                    </div>
                  </div>
                ) : (
                  briefActions.map((action, i) => (
                    <div 
                      key={i}
                      className={`bg-surface-container-lowest/50 border p-md rounded-xl flex gap-md ${
                        action.type === 'critical' 
                          ? 'border-error/20' 
                          : action.type === 'warning' 
                            ? 'border-tertiary/20' 
                            : 'border-outline-variant/30'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        action.type === 'critical' 
                          ? 'bg-error/10 text-error' 
                          : action.type === 'warning' 
                            ? 'bg-tertiary/10 text-tertiary' 
                            : 'bg-primary/10 text-primary'
                      }`}>
                        <span className="material-symbols-outlined">
                          {action.type === 'critical' ? 'warning' : action.type === 'warning' ? 'build' : 'info'}
                        </span>
                      </div>
                      <div>
                        <h4 className={`font-label-caps text-[11px] mb-1 uppercase tracking-widest font-bold ${
                          action.type === 'critical' 
                            ? 'text-error' 
                            : action.type === 'warning' 
                              ? 'text-tertiary' 
                              : 'text-primary'
                        }`}>
                          {action.title}
                        </h4>
                        <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Broadcast Console */}
            <section className="col-span-12 lg:col-span-4 bg-surface-container-low p-xl rounded-2xl border border-outline-variant/30 flex flex-col h-full shadow-md">
              <h3 className="font-label-caps text-xs text-on-surface-variant mb-xl flex items-center gap-sm uppercase tracking-[0.15em] font-bold">
                <span className="material-symbols-outlined text-lg">broadcast_on_home</span>
                Push Fan Notification
              </h3>
              
              <form onSubmit={handlePushBroadcast} className="flex-1 flex flex-col justify-between gap-md">
                <textarea 
                  value={broadcastInput}
                  onChange={(e) => setBroadcastInput(e.target.value)}
                  className="flex-grow w-full bg-surface-container-lowest border border-outline-variant/50 p-md rounded-xl font-body-md text-sm text-on-surface focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:outline-none placeholder:text-outline-variant resize-none min-h-[110px]" 
                  placeholder="Type an announcement to broadcast immediately to all fan status strips..."
                  required
                />
                
                {broadcastSuccess && (
                  <div className="text-green-400 text-xs flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Broadcast successfully sent to spectators!
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={broadcastSending || !broadcastInput.trim()}
                  className="w-full bg-secondary-container text-on-secondary-container py-md rounded-xl font-label-caps text-sm hover:brightness-110 transition-all flex items-center justify-center gap-md shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">send</span>
                  <span>Push Broadcast</span>
                </button>
              </form>
            </section>

            {/* Real-time Gate Occupancy monitors */}
            <section className="col-span-12 lg:col-span-7 bg-surface-container-lowest/20 p-md rounded-xl border border-outline-variant/10">
              <div className="flex items-center justify-between mb-lg px-2">
                <h3 className="font-label-caps text-xs text-on-surface-variant flex items-center gap-sm uppercase tracking-[0.15em] font-bold">
                  <span className="material-symbols-outlined text-lg">sensor_door</span>
                  Gate Occupancy Telemetry
                </h3>
                <span className="text-[10px] text-on-surface-variant font-data-mono uppercase">Click a gate to simulate load</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                {gates.map(gate => (
                  <div 
                    key={gate.id}
                    onClick={() => selectGateForSim(gate)}
                    className={`bg-surface-container-low p-lg rounded-2xl border border-outline-variant/30 hover:border-primary/50 transition-all group cursor-pointer ${
                      selectedGateSim?.id === gate.id ? 'ring-2 ring-primary border-transparent' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center mb-lg">
                      <span className="font-headline-lg-mobile text-lg font-bold">{gate.name}</span>
                      <span className={`px-3 py-1 rounded-full font-data-mono text-[10px] font-bold uppercase tracking-wider border ${
                        gate.status === 'critical' 
                          ? 'bg-error/10 border-error/25 text-error' 
                          : gate.status === 'optimal' 
                            ? 'bg-primary/10 border-primary/25 text-primary' 
                            : gate.status === 'clear' 
                              ? 'bg-tertiary/10 border-tertiary/25 text-tertiary' 
                              : 'bg-surface-container-highest border-outline-variant/35 text-on-surface-variant'
                      }`}>
                        {gate.status}
                      </span>
                    </div>
                    <div className="space-y-md">
                      <div className="flex justify-between font-label-caps text-[11px] uppercase tracking-wide opacity-70">
                        <span>Intake Capacity</span>
                        <span className={`font-bold ${gate.status === 'critical' ? 'text-error' : 'text-on-surface'}`}>{gate.occupancy}%</span>
                      </div>
                      <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden p-0.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            gate.status === 'critical' ? 'bg-error' : 'bg-primary'
                          }`} 
                          style={{ width: `${gate.occupancy}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center pt-md border-t border-outline-variant/20">
                        <span className="text-on-surface-variant font-label-caps text-[10px] uppercase tracking-widest">Est. Wait</span>
                        <span className="font-data-mono text-on-surface font-bold">{gate.waitTime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Live Fan Reports feed */}
            <section className="col-span-12 lg:col-span-5 flex flex-col h-full overflow-hidden">
              <h3 className="font-label-caps text-xs text-on-surface-variant mb-lg flex items-center gap-sm uppercase tracking-[0.15em] font-bold">
                <span className="material-symbols-outlined text-lg">notifications_active</span>
                Fan Reports Stream
              </h3>

              <div className="flex-grow bg-surface-container-low rounded-2xl border border-outline-variant/30 flex flex-col overflow-hidden min-h-[400px]">
                <div className="px-md py-sm bg-surface-container border-b border-outline-variant/30 flex justify-between items-center">
                  <span className="font-data-mono text-[9px] uppercase text-on-surface-variant tracking-wider font-bold">Real-time Stream · AI Triaged</span>
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/10">
                  {reports.length === 0 ? (
                    <div className="py-20 text-center text-sm text-on-surface-variant italic">
                      No reports submitted by fans yet.
                    </div>
                  ) : (
                    reports.map(report => (
                      <div 
                        key={report.id}
                        className="p-md hover:bg-surface-bright/20 transition-colors group border-b border-outline-variant/10"
                      >
                        <div className="flex gap-md">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                            report.severity === 'critical' 
                              ? 'bg-error/10 text-error border-error/25' 
                              : report.severity === 'high' 
                                ? 'bg-error-container/20 text-error border-error-container/25'
                                : report.severity === 'medium'
                                  ? 'bg-primary-container/20 text-primary border-primary/20'
                                  : 'bg-surface-container text-on-surface-variant border-outline-variant/30'
                          }`}>
                            <span className="material-symbols-outlined text-lg">
                              {report.severity === 'critical' || report.severity === 'high' ? 'warning' : 'info'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className={`font-label-caps text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider border ${
                                report.severity === 'critical'
                                  ? 'bg-error/20 border-error/30 text-error animate-pulse'
                                  : report.severity === 'high'
                                    ? 'bg-error-container/30 border-error/30 text-error'
                                    : report.severity === 'medium'
                                      ? 'bg-primary/25 border-primary/30 text-primary'
                                      : 'bg-surface-variant border-outline-variant/30 text-on-surface-variant'
                              }`}>
                                {report.severity}
                              </span>
                              <span className="font-data-mono text-[10px] opacity-40">
                                {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-on-surface uppercase tracking-wide mb-0.5">{report.category}</h5>
                            <p className="text-xs font-semibold text-primary mb-1">Location: {report.location}</p>
                            <p className="font-body-md text-on-surface-variant text-xs italic leading-relaxed">
                              "{report.description}"
                            </p>
                            <div className="mt-xs text-[10px] text-primary font-data-mono uppercase">
                              AI Summary: {report.summary}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

          </div>
        </main>
      </div>

      {/* GATE TELEMETRY SIMULATION DIALOG OVERLAY */}
      {selectedGateSim && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-md z-[200]">
          <div className="bg-surface-container login-card-blur border border-outline-variant/30 rounded-xl p-lg max-w-sm w-full relative z-[210]">
            <h3 className="font-headline-lg-mobile text-lg text-on-surface font-bold uppercase mb-md">
              Simulate Gate Load: {selectedGateSim.name}
            </h3>
            
            <form onSubmit={handleGateSimSubmit} className="space-y-md">
              {/* Occupancy Slider */}
              <div className="space-y-xs">
                <div className="flex justify-between text-xs font-data-mono text-on-surface-variant">
                  <span>Occupancy</span>
                  <span className="text-primary font-bold">{simOccupancy}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={simOccupancy}
                  onChange={(e) => setSimOccupancy(Number(e.target.value))}
                  className="w-full accent-primary h-2 bg-surface-dim rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Wait Time Text Input */}
              <div className="space-y-xs">
                <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="sim_wait">Wait Time (formatted string)</label>
                <input 
                  type="text" 
                  id="sim_wait"
                  value={simWaitTime}
                  onChange={(e) => setSimWaitTime(e.target.value)}
                  placeholder="Ex: 14m 20s"
                  className="w-full bg-surface-dim border border-outline-variant rounded-lg p-md text-on-surface text-sm focus:ring-2 focus:ring-primary outline-none"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-md border-t border-outline-variant/20 flex gap-sm justify-end">
                <button 
                  type="button"
                  onClick={() => setSelectedGateSim(null)}
                  className="px-lg py-sm border border-outline-variant rounded-lg font-label-caps text-label-caps text-on-surface-variant hover:bg-surface-bright cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-xl py-sm bg-primary text-on-primary font-label-caps text-label-caps rounded-lg hover:scale-95 transition-transform cursor-pointer"
                >
                  Update Telemetry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile nav (Bottom) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 h-16 lg:hidden bg-surface-container/90 backdrop-blur-xl border-t border-outline-variant/30">
        <button className="flex flex-col items-center justify-center text-primary p-2 cursor-pointer">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[9px] uppercase font-bold tracking-widest mt-1">Status</span>
        </button>
        <button 
          onClick={onNavigateToFan}
          className="flex flex-col items-center justify-center text-on-surface-variant p-2 cursor-pointer"
        >
          <span className="material-symbols-outlined">preview</span>
          <span className="text-[9px] uppercase font-bold tracking-widest mt-1">Fan Mode</span>
        </button>
        <button 
          onClick={onNavigateToSettings}
          className="flex flex-col items-center justify-center text-on-surface-variant p-2 cursor-pointer"
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="text-[9px] uppercase font-bold tracking-widest mt-1">Settings</span>
        </button>
      </nav>

    </div>
  );
};

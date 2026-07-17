import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLiveData } from '../context/LiveDataContext';
import { chatWithAssistant } from '../services/gemini';

interface FanModeProps {
  onNavigateToSettings: () => void;
  onNavigateToOps?: () => void; // Provided if the user is staff
}

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

const WC_LANGUAGES = [
  { code: 'en', name: 'English (US)' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'pt', name: 'Português' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ar', name: 'العربية' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' }
];

export const FanMode: React.FC<FanModeProps> = ({ onNavigateToSettings, onNavigateToOps }) => {
  const { user, logout } = useAuth();
  const { broadcasts, gates, addReport } = useLiveData();

  // Language state
  const [selectedLanguage, setSelectedLanguage] = useState(WC_LANGUAGES[0]);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  // Chat states
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      text: "I'm monitoring the stadium in real-time. I can help with finding the nearest restroom, checking shuttle times, or navigating to your seat.",
      sender: 'ai',
      timestamp: Date.now()
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Report states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState('Medical Concern');
  const [reportLocation, setReportLocation] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Auto scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Handle Chat submit
  const handleChatSubmit = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Math.random().toString(36).substr(2, 9),
      text: messageText,
      sender: 'user',
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      // Build history format from state if needed, or send single message RAG
      const aiReply = await chatWithAssistant(messageText, selectedLanguage.name);
      
      const aiMsg: ChatMessage = {
        id: 'msg_' + Math.random().toString(36).substr(2, 9),
        text: aiReply,
        sender: 'ai',
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (e: any) {
      console.error(e);
      setChatMessages(prev => [...prev, {
        id: 'msg_err',
        text: "Sorry, I had trouble contacting my stadium node. Please verify your Gemini API key in settings.",
        sender: 'ai',
        timestamp: Date.now()
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Quick Chat Shortcuts
  const handleShortcutClick = (shortcutText: string) => {
    handleChatSubmit(shortcutText);
  };

  // Submit report
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportLocation || !reportDescription) return;

    setReportSubmitting(true);
    try {
      await addReport(reportCategory, reportLocation, reportDescription);
      setReportSuccess(true);
      setReportLocation('');
      setReportDescription('');
      setTimeout(() => {
        setReportSuccess(false);
        setShowReportModal(false);
      }, 2000);
    } catch (e) {
      console.error("Failed to submit report:", e);
    } finally {
      setReportSubmitting(false);
    }
  };

  // Busiest gate calculation
  const busiestGate = gates.reduce((max, gate) => gate.occupancy > max.occupancy ? gate : max, gates[0] || { name: 'None', occupancy: 0 });

  return (
    <div className="bg-surface-dim text-on-background min-h-screen flex flex-col font-body-md overflow-x-hidden pb-24 lg:pb-0">
      
      {/* Top Header */}
      <header className="bg-surface-container-high dark:bg-surface-container-highest shadow-sm docked full-width top-0 z-[100] flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-16 sticky">
        <div className="flex items-center gap-md">
          <span className="text-headline-lg-mobile font-headline-lg-mobile font-bold text-on-surface tracking-tight">SETU</span>
          <span className="bg-primary/10 border border-primary/20 text-primary px-sm py-0.5 rounded text-[10px] font-bold uppercase tracking-widest hidden sm:inline-block">Fan Assistant</span>
        </div>
        
        {/* Navigation - Language & Mode Toggle */}
        <div className="flex items-center gap-md">
          {/* Language Selector Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="flex items-center gap-sm bg-surface-container-low px-md py-xs rounded-full border border-outline-variant/30 hover:bg-surface-container-high transition-colors cursor-pointer group"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary">language</span>
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">{selectedLanguage.name}</span>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">expand_more</span>
            </button>

            {showLanguageDropdown && (
              <div className="absolute right-0 mt-sm w-48 bg-surface-container-high border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden py-1">
                {WC_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setSelectedLanguage(lang);
                      setShowLanguageDropdown(false);
                    }}
                    className="w-full text-left px-md py-sm font-label-caps text-label-caps hover:bg-surface-bright text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer block"
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings Trigger */}
          <button 
            onClick={onNavigateToSettings}
            className="material-symbols-outlined text-on-surface-variant hover:bg-surface-variant p-2 rounded-full transition-colors cursor-pointer"
          >
            settings
          </button>

          {/* Role Redirection Button (Only for staff users) */}
          {user?.role === 'staff' && onNavigateToOps && (
            <button 
              onClick={onNavigateToOps}
              className="bg-secondary-container text-on-secondary-container px-lg py-sm rounded-full font-label-caps text-label-caps active:scale-95 transition-transform duration-150 uppercase cursor-pointer border border-secondary/20"
            >
              Ops Mode
            </button>
          )}

          <button 
            onClick={logout}
            className="material-symbols-outlined text-error hover:bg-error-container/10 p-2 rounded-full transition-colors cursor-pointer"
            title="Log Out"
          >
            logout
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-lg grid grid-cols-12 gap-lg relative z-10">
        
        {/* Real-time Broadcast Status Strip */}
        <section className="col-span-12">
          {broadcasts.length > 0 ? (
            <div className="bg-surface-container-low border-l-4 border-primary px-lg py-md rounded shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-md animate-pulse-slow">
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined text-primary">campaign</span>
                <span className="font-medium text-on-surface leading-snug">
                  {broadcasts[0].message}
                </span>
              </div>
              <div className="flex gap-sm items-center self-start sm:self-auto shrink-0">
                <span className="font-data-mono text-[10px] text-on-surface-variant opacity-60">
                  {new Date(broadcasts[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="font-label-caps text-label-caps text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded">
                  OPS BROADCAST
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-low border-l-4 border-outline-variant px-lg py-md rounded shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined text-on-surface-variant">info</span>
                <span className="font-medium text-on-surface">No alerts active. Busiest entry point right now: <strong className="text-secondary">{busiestGate?.name}</strong>.</span>
              </div>
            </div>
          )}
        </section>

        {/* Left Column: Quick Actions & Report Incident */}
        <aside className="col-span-12 lg:col-span-4 flex flex-col gap-lg order-2 lg:order-1">
          
          {/* Quick Actions Shortcuts */}
          <div className="flex flex-col gap-sm">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant px-1">QUICK SHORTCUTS</h3>
            <div className="grid grid-cols-2 gap-sm">
              <button 
                onClick={() => handleShortcutClick("Where is the nearest restroom?")}
                className="flex flex-col items-center justify-center bg-surface-container py-lg rounded-xl hover:bg-surface-variant transition-all border border-outline-variant/30 group cursor-pointer"
              >
                <span className="material-symbols-outlined text-primary mb-2 group-hover:scale-115 transition-transform">wc</span>
                <span className="font-label-caps text-label-caps">RESTROOM</span>
              </button>
              <button 
                onClick={() => handleShortcutClick("How do I get to Gate D?")}
                className="flex flex-col items-center justify-center bg-surface-container py-lg rounded-xl hover:bg-surface-variant transition-all border border-outline-variant/30 group cursor-pointer"
              >
                <span className="material-symbols-outlined text-primary mb-2 group-hover:scale-115 transition-transform">directions</span>
                <span className="font-label-caps text-label-caps">DIRECTIONS</span>
              </button>
              <button 
                onClick={() => handleShortcutClick("Where can I find vegan food options?")}
                className="flex flex-col items-center justify-center bg-surface-container py-lg rounded-xl hover:bg-surface-variant transition-all border border-outline-variant/30 group cursor-pointer"
              >
                <span className="material-symbols-outlined text-primary mb-2 group-hover:scale-115 transition-transform">fastfood</span>
                <span className="font-label-caps text-label-caps">FOOD OPTIONS</span>
              </button>
              <button 
                onClick={() => handleShortcutClick("What is the shuttle schedule to the Metro Station after the game?")}
                className="flex flex-col items-center justify-center bg-surface-container py-lg rounded-xl hover:bg-surface-variant transition-all border border-outline-variant/30 group cursor-pointer"
              >
                <span className="material-symbols-outlined text-primary mb-2 group-hover:scale-115 transition-transform">home</span>
                <span className="font-label-caps text-label-caps">GETTING HOME</span>
              </button>
            </div>
          </div>

          {/* Quick Report Section */}
          <div className="bg-surface-container-low rounded-xl border border-outline-variant/20 p-md flex flex-col gap-sm">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-xs">REPORT A CONCERN</h3>
            <p className="text-xs text-on-surface-variant opacity-80 leading-relaxed mb-xs">
              Spotted an issue nearby? Submit it directly to stadium staff. Our AI will instantly route it based on severity.
            </p>
            <button 
              onClick={() => setShowReportModal(true)}
              className="flex items-center justify-center gap-md bg-error-container/20 text-on-error-container border border-error/30 p-md rounded-lg hover:bg-error-container/30 transition-colors w-full cursor-pointer font-bold"
            >
              <span className="material-symbols-outlined text-error">campaign</span>
              <span>Submit Incident Report</span>
            </button>
          </div>

          {/* Ambient Security/Crowd Feed */}
          <div className="relative overflow-hidden rounded-xl border border-outline-variant/20 aspect-video shadow-md">
            <div 
              className="w-full h-full bg-cover bg-center brightness-[0.7] contrast-[1.1]"
              style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBUPdcZiF0t51HGqowsl8mg0sdpjZWleg93OI26NgsvgFoL_dcIDa7zzv3wNdUwhKnaXR_5Ztfayf4cX9DkqC3_fhKdWb-qlq3gtjKYUhJ7rmfePfvrnsAxNjdu6wMzHqujZknm-JDSj6Ap3xNMnjzHYSEVLPpP-q_P0cIJNv5GoT7wgV1SJs96_tAc1L3Z0t4c0k4pvj2YiNEndYLG5-VPoYDS-m_ZTLQz8xwkcx4F0UHVO3OGSj9DNcVEzkvuil3ps5gb0TsIvv8')` }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-surface-dim to-transparent flex flex-col justify-end p-md">
              <div className="flex items-center gap-xs mb-xs">
                <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                <span className="font-label-caps text-[10px] text-error font-bold">AMBIENT STADIUM CAM: SEC 302</span>
              </div>
              <p className="text-xs font-medium text-on-surface">Visual AI monitoring is active for crowd density management.</p>
            </div>
          </div>
        </aside>

        {/* Center Column: Chat Assistant & Bento Stats & Map */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-lg order-1 lg:order-2">
          
          {/* AI Conversational Panel */}
          <div className="glass-panel ai-glow-border rounded-xl p-lg flex flex-col min-h-[460px] max-h-[500px]">
            {/* AI Title Banner */}
            <div className="flex items-center justify-between mb-md pb-md border-b border-outline-variant/20 shrink-0">
              <div className="flex items-center gap-md">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary">
                  <span className="material-symbols-outlined">psychology</span>
                </div>
                <div>
                  <h2 className="font-headline-lg text-lg text-on-surface font-semibold">Stadium RAG Assistant</h2>
                  <div className="flex items-center gap-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <p className="font-data-mono text-data-mono text-primary text-[10px]">GROUNDED IN DALLAS STADIUM MANUAL</p>
                  </div>
                </div>
              </div>
              {!localStorage.getItem('setu_gemini_api_key') && (
                <span className="font-data-mono text-[9px] text-tertiary bg-tertiary-container/30 px-2 py-1 rounded border border-tertiary/20">
                  GEMINI KEY NOT SET · SIMULATING
                </span>
              )}
            </div>

            {/* Chat message stream */}
            <div className="flex-1 overflow-y-auto space-y-md pr-2 mb-md">
              {chatMessages.map(msg => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`p-md rounded-xl max-w-[85%] border text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-secondary-container text-on-secondary-container border-secondary/20 rounded-br-none'
                        : 'bg-surface-variant/30 text-on-surface border-outline-variant/20 rounded-bl-none'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className="block text-right text-[9px] opacity-40 mt-1 font-data-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-variant/30 border border-outline-variant/20 p-md rounded-xl rounded-bl-none flex items-center gap-sm">
                    <span className="material-symbols-outlined animate-spin text-primary text-[18px]">progress_activity</span>
                    <span className="text-xs text-on-surface-variant font-data-mono uppercase">Retrieving stadium knowledge...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Inputs */}
            <div className="flex flex-col gap-md shrink-0">
              {/* Shortcut tags */}
              <div className="flex flex-wrap gap-xs">
                <button 
                  onClick={() => handleShortcutClick("Are bags allowed?")}
                  className="bg-surface-container-high hover:bg-surface-bright text-on-surface px-md py-xs rounded-full text-[11px] border border-outline-variant/20 transition-all flex items-center gap-xs cursor-pointer"
                >
                  Bag Policy
                </button>
                <button 
                  onClick={() => handleShortcutClick("Where can I catch public transit?")}
                  className="bg-surface-container-high hover:bg-surface-bright text-on-surface px-md py-xs rounded-full text-[11px] border border-outline-variant/20 transition-all flex items-center gap-xs cursor-pointer"
                >
                  ATL Train Location
                </button>
                <button 
                  onClick={() => handleShortcutClick("Do you have vegan options in cantina?")}
                  className="bg-surface-container-high hover:bg-surface-bright text-on-surface px-md py-xs rounded-full text-[11px] border border-outline-variant/20 transition-all flex items-center gap-xs cursor-pointer"
                >
                  Tex-Mex Food
                </button>
              </div>

              {/* Text Input */}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleChatSubmit(chatInput); }}
                className="relative"
              >
                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-md pl-md pr-16 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                  placeholder="Ask about gates, food, restrooms, rideshare..."
                  disabled={chatLoading}
                />
                <button 
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="absolute right-sm top-1/2 -translate-y-1/2 bg-primary text-on-primary w-9 h-9 rounded-lg flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </form>
            </div>
          </div>

          {/* Bento grids for wait time dynamics */}
          <div className="grid grid-cols-12 gap-lg">
            <div className="col-span-12 md:col-span-4 bg-surface-container rounded-xl p-md border border-outline-variant/20 shadow-sm">
              <div className="flex justify-between items-start mb-md">
                <h4 className="font-label-caps text-label-caps text-on-surface-variant">BBQ & FOOD COURT</h4>
                <span className="font-data-mono text-[11px] text-primary font-bold">BUSY</span>
              </div>
              <div className="flex gap-1 mb-sm">
                <div className="segmented-progress-item active"></div>
                <div className="segmented-progress-item active"></div>
                <div className="segmented-progress-item active"></div>
                <div className="segmented-progress-item active"></div>
                <div className="segmented-progress-item active"></div>
                <div className="segmented-progress-item active"></div>
                <div className="segmented-progress-item"></div>
                <div className="segmented-progress-item"></div>
              </div>
              <p className="text-xs text-on-surface-variant">Est. wait: <span className="text-on-surface font-bold">12 mins</span></p>
            </div>

            <div className="col-span-12 md:col-span-4 bg-surface-container rounded-xl p-md border border-outline-variant/20 shadow-sm">
              <div className="flex justify-between items-start mb-md">
                <h4 className="font-label-caps text-label-caps text-on-surface-variant">MERCH STORES</h4>
                <span className="font-data-mono text-[11px] text-secondary font-bold">MODERATE</span>
              </div>
              <div className="flex gap-1 mb-sm">
                <div className="segmented-progress-item active"></div>
                <div className="segmented-progress-item active"></div>
                <div className="segmented-progress-item active"></div>
                <div className="segmented-progress-item"></div>
                <div className="segmented-progress-item"></div>
                <div className="segmented-progress-item"></div>
                <div className="segmented-progress-item"></div>
                <div className="segmented-progress-item"></div>
              </div>
              <p className="text-xs text-on-surface-variant">Est. wait: <span className="text-on-surface font-bold">5 mins</span></p>
            </div>

            <div className="col-span-12 md:col-span-4 bg-surface-container rounded-xl p-md border border-outline-variant/20 shadow-sm">
              <div className="flex justify-between items-start mb-md">
                <h4 className="font-label-caps text-label-caps text-on-surface-variant">RESTROOMS (SEC 114)</h4>
                <span className="font-data-mono text-[11px] text-error font-bold">DENSE</span>
              </div>
              <div className="flex gap-1 mb-sm">
                <div className="segmented-progress-item warning"></div>
                <div className="segmented-progress-item warning"></div>
                <div className="segmented-progress-item warning"></div>
                <div className="segmented-progress-item warning"></div>
                <div className="segmented-progress-item warning"></div>
                <div className="segmented-progress-item warning"></div>
                <div className="segmented-progress-item warning"></div>
                <div className="segmented-progress-item warning"></div>
              </div>
              <p className="text-xs text-on-surface-variant">Est. wait: <span className="text-on-surface font-bold">18 mins</span></p>
            </div>
          </div>

          {/* Interactive Map card */}
          <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/20 shadow-lg">
            <div className="p-md border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-high">
              <h4 className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider font-bold">Stadium Interactive Blueprint</h4>
              <div className="flex gap-sm">
                <button className="bg-surface-variant hover:bg-surface-bright px-sm py-1 rounded text-[10px] font-bold cursor-pointer">L1</button>
                <button className="bg-primary/20 text-primary border border-primary/30 px-sm py-1 rounded text-[10px] font-bold cursor-pointer">L2</button>
                <button className="bg-surface-variant hover:bg-surface-bright px-sm py-1 rounded text-[10px] font-bold cursor-pointer">L3</button>
              </div>
            </div>
            <div className="h-80 relative">
              <div 
                className="w-full h-full bg-cover bg-center brightness-[0.8]"
                style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDFRqi0y5_ay-Gm8E4nlXvcZ4tR90AxTub_SxvO7vZZDNR0icYsK8qtY95v8VP7YwoRMiI-dwm03q8p7YrGgM7qwAvQPdR5Vb5VXGWYMqxKhRdlVI0M_-gLVSwKaypvmqV09Ki1wEXzhR_neoATvZXfnWDY1jr2ris46mLU_MfpIzeSS_ohsj93pqUwQp_un6QR2cNHg9RZpatU0bNHocmIaYueXmK-dz-00BudlTzgP8GeBIlEH_xDzIwbuy6mwD3sihpq62P8MrM')` }}
              ></div>
              {/* AI Suggestion Tooltip Overlay */}
              <div className="absolute top-1/4 left-1/3 glass-panel p-md rounded-lg shadow-xl ai-glow-border max-w-[220px]">
                <div className="flex items-center gap-xs mb-1">
                  <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
                  <span className="font-label-caps text-[10px] text-primary font-bold">AI ROUTING TIP</span>
                </div>
                <p className="text-[11px] font-medium text-on-surface leading-snug">
                  Exit via Gate D to avoid the bottleneck currently forming at the North-East Plaza.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* REPORT AN INCIDENT MODAL OVERLAY */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-md z-[200] animate-fade-in">
          <div className="bg-surface-container login-card-blur border border-outline-variant/30 rounded-xl p-lg max-w-md w-full relative z-[210] animate-in scale-in duration-300">
            <div className="flex justify-between items-start mb-lg">
              <div>
                <h3 className="font-headline-lg-mobile text-lg text-on-surface font-bold uppercase">Submit Incident Report</h3>
                <p className="text-xs text-on-surface-variant">Triaged in real-time by operations GenAI</p>
              </div>
              <button 
                onClick={() => setShowReportModal(false)}
                className="material-symbols-outlined text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                close
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-xl text-center space-y-md">
                <span className="material-symbols-outlined text-6xl text-green-400">check_circle</span>
                <h4 className="font-headline-lg-mobile text-lg text-on-surface">Report Submitted</h4>
                <p className="text-xs text-on-surface-variant max-w-[280px] mx-auto">
                  Your report has been triaged and sent directly to operations staff. Thank you for helping keep Dallas Stadium safe!
                </p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-md">
                {/* Category Select */}
                <div className="space-y-xs">
                  <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="rep_cat">Category</label>
                  <select 
                    id="rep_cat"
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg p-md text-on-surface text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="Medical Emergency">Medical Emergency</option>
                    <option value="Security Threat / Fight">Security Concern</option>
                    <option value="Crowd Overcrowding">Overcrowding</option>
                    <option value="Accessibility Barrier">Accessibility Barrier</option>
                    <option value="Facility Broken">Broken Facility / Leak</option>
                    <option value="Lost Person / Item">Lost Person or Item</option>
                  </select>
                </div>

                {/* Location Input */}
                <div className="space-y-xs">
                  <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="rep_loc">Location (e.g. Section 112, Aisle K)</label>
                  <input 
                    type="text" 
                    id="rep_loc"
                    value={reportLocation}
                    onChange={(e) => setReportLocation(e.target.value)}
                    placeholder="Ex: Section 105, Row M"
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg p-md text-on-surface text-sm focus:ring-2 focus:ring-primary outline-none"
                    required
                  />
                </div>

                {/* Description Textarea */}
                <div className="space-y-xs">
                  <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="rep_desc">Short Description</label>
                  <textarea 
                    id="rep_desc"
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Describe what is happening..."
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg p-md text-on-surface text-sm h-24 focus:ring-2 focus:ring-primary outline-none resize-none"
                    required
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-md border-t border-outline-variant/20 flex gap-sm justify-end">
                  <button 
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-lg py-sm border border-outline-variant rounded-lg font-label-caps text-label-caps text-on-surface-variant hover:bg-surface-bright cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={reportSubmitting}
                    className="px-xl py-sm bg-primary text-on-primary font-label-caps text-label-caps rounded-lg hover:scale-95 transition-transform flex items-center gap-xs cursor-pointer disabled:opacity-50"
                  >
                    {reportSubmitting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Report</span>
                        <span className="material-symbols-outlined text-[16px]">send</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Mobile nav (Bottom) */}
      <nav className="fixed bottom-0 left-0 w-full z-[90] flex justify-around items-center px-4 pb-safe h-16 lg:hidden bg-surface-container/95 backdrop-blur-md border-t border-outline-variant/20">
        <button className="flex flex-col items-center justify-center text-primary p-2 cursor-pointer">
          <span className="material-symbols-outlined">home</span>
          <span className="text-[9px] uppercase font-bold tracking-widest mt-1">Home</span>
        </button>
        <button 
          onClick={() => setShowReportModal(true)}
          className="flex flex-col items-center justify-center bg-error-container text-on-error-container w-12 h-12 rounded-full -mt-6 shadow-xl border-4 border-surface-dim cursor-pointer active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-xl">campaign</span>
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

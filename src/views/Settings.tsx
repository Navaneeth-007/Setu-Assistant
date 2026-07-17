import React, { useState, useEffect } from 'react';
import { getGeminiApiKey, saveGeminiApiKey } from '../services/gemini';
import { useAuth } from '../context/AuthContext';

interface SettingsProps {
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const { user, logout } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const key = getGeminiApiKey();
    if (key) {
      setApiKey(key);
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveGeminiApiKey(apiKey);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="flex min-h-screen bg-surface-dim text-on-background font-body-md">
      {/* Side Navigation (Desktop) */}
      <aside className="flex flex-col h-full py-lg gap-md bg-surface-container-low dark:bg-surface-container-lowest border-r border-outline-variant fixed left-0 top-0 w-64 hidden lg:flex z-40">
        <div className="px-md mb-xl flex items-center gap-sm">
          <div className="w-10 h-10 bg-primary-container rounded flex items-center justify-center overflow-hidden">
            <span className="material-symbols-outlined text-primary text-xl">stadium</span>
          </div>
          <div>
            <h2 className="font-headline-lg text-lg text-on-surface tracking-tight leading-none">SETU</h2>
            <p className="font-label-caps text-label-caps text-on-surface-variant opacity-70">Stadium Monitor</p>
          </div>
        </div>
        <nav className="flex-1 flex flex-col px-sm gap-xs">
          <button 
            onClick={onBack}
            className="flex items-center gap-md px-md py-sm text-on-surface-variant font-medium hover:bg-surface-container-highest transition-all rounded w-full text-left cursor-pointer"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-label-caps text-label-caps">Dashboard</span>
          </button>
        </nav>
        <div className="px-sm mt-auto flex flex-col gap-xs pt-lg border-t border-outline-variant/30">
          <a className="flex items-center gap-md px-md py-sm active-nav rounded" href="#settings">
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-caps text-label-caps">Settings</span>
          </a>
          <button 
            onClick={logout}
            className="flex items-center gap-md px-md py-sm text-error hover:bg-error-container/10 transition-all rounded w-full text-left cursor-pointer mt-md"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-caps text-label-caps">Log Out</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col lg:pl-64">
        {/* Top bar */}
        <header className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-16 sticky top-0 z-30 bg-surface dark:bg-surface-dim border-b border-outline-variant/10">
          <div className="flex items-center gap-md">
            <span className="text-headline-lg-mobile font-headline-lg-mobile font-bold text-on-surface tracking-tighter">SETU</span>
            <div className="hidden md:flex gap-md ml-lg">
              <button onClick={onBack} className="text-on-surface-variant hover:text-on-surface font-medium font-label-caps text-label-caps py-2 cursor-pointer">
                Monitor
              </button>
              <span className="text-on-surface-variant font-medium font-label-caps text-label-caps py-2 border-b-2 border-primary">
                Settings
              </span>
            </div>
          </div>
          <div className="flex items-center gap-sm">
            <div className="hidden md:flex items-center bg-surface-container-high px-sm py-1 rounded gap-sm mr-md">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="font-data-mono text-[11px] text-on-surface-variant uppercase tracking-widest">System Online</span>
            </div>
            <button 
              onClick={onBack}
              className="ml-sm px-md py-sm bg-primary-container text-on-primary-container font-label-caps text-label-caps rounded-lg border border-primary/20 hover:bg-surface-bright transition-colors cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-margin-mobile md:p-margin-desktop max-w-5xl">
          <div className="mb-xl">
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-sm">Settings</h1>
            <p className="text-on-surface-variant font-body-md max-w-2xl">
              Configure your SETU instance for the FIFA 2026 Stadium Network. Manage secure API connections and system preferences below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
            {/* API Key Management */}
            <section className="md:col-span-8 space-y-lg">
              <div className="setting-card">
                <div className="flex items-center gap-sm mb-lg">
                  <span className="material-symbols-outlined text-secondary">vpn_key</span>
                  <h3 className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">API Key Management</h3>
                </div>

                <form onSubmit={handleSave} className="space-y-md">
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant mb-xs" htmlFor="api-key">
                      Gemini API Key
                    </label>
                    <div className="relative">
                      <input 
                        className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-data-mono text-data-mono px-md py-sm rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all pr-xl" 
                        id="api-key" 
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your Gemini API key (sk-fifa-...)"
                      />
                      <button 
                        className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer" 
                        id="toggle-password" 
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showKey ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-md p-md bg-primary-container/50 border border-primary/10 rounded">
                    <span className="material-symbols-outlined text-primary text-[20px]">info</span>
                    <div className="font-body-md text-on-primary-container text-sm">
                      <p className="font-semibold mb-xs">Secured locally on your device</p>
                      <p>
                        Your API key is saved locally in your browser's local storage and is only used to connect to Google Gemini AI. If no key is supplied, a local mock simulator will be used for testing.
                      </p>
                    </div>
                  </div>

                  {success && (
                    <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-md rounded text-sm flex items-center gap-xs animate-fade-in">
                      <span className="material-symbols-outlined">check_circle</span>
                      Gemini API Key successfully updated!
                    </div>
                  )}

                  <div className="pt-md border-t border-outline-variant/30 flex justify-end">
                    <button 
                      type="submit"
                      className="px-xl py-sm bg-primary text-on-primary font-label-caps text-label-caps rounded-lg hover:scale-95 transition-transform duration-150 cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>

              {/* Alert thresholds (mock details) */}
              <div className="setting-card opacity-60">
                <div className="flex items-center gap-sm mb-lg">
                  <span className="material-symbols-outlined text-on-surface-variant">notifications_active</span>
                  <h3 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Alert Thresholds</h3>
                </div>
                <p className="font-data-mono text-xs italic">Configuration available for Supervisor Level accounts only.</p>
              </div>
            </section>

            {/* Sidebar info */}
            <aside className="md:col-span-4 space-y-lg">
              <div className="setting-card h-full">
                <div className="mb-lg">
                  <div className="w-full h-32 bg-surface-container-lowest rounded overflow-hidden relative mb-md border border-outline-variant/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-primary opacity-60">stadium</span>
                  </div>
                  <h3 className="font-headline-lg text-headline-lg-mobile text-on-surface mb-xs">About SETU</h3>
                  <p className="text-on-surface-variant font-body-md text-sm leading-relaxed mb-lg">
                    SETU is the official high-performance infrastructure assistant for the FIFA World Cup 2026. Designed to bridge the gap between complex stadium telemetry and real-time operational response, SETU ensures a seamless experience for fans and staff alike.
                  </p>
                </div>
                <div className="space-y-md border-t border-outline-variant/30 pt-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">User role</span>
                    <span className="font-data-mono text-data-mono text-secondary uppercase font-bold">{user?.role}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">User name</span>
                    <span className="font-data-mono text-data-mono text-primary">{user?.fullName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">Version</span>
                    <span className="font-data-mono text-data-mono text-secondary">v2.4.0-STABLE</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">Environment</span>
                    <span className="font-data-mono text-data-mono text-green-500">Local Dev Sync</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* Mobile nav (Bottom) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 h-16 lg:hidden bg-surface-container backdrop-blur-xl border-t border-outline-variant/30">
        <button onClick={onBack} className="flex flex-col items-center justify-center text-on-surface-variant p-2 cursor-pointer">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[9px] uppercase font-bold tracking-widest mt-1">Status</span>
        </button>
        <button onClick={logout} className="flex flex-col items-center justify-center text-error p-2 cursor-pointer">
          <span className="material-symbols-outlined">logout</span>
          <span className="text-[9px] uppercase font-bold tracking-widest mt-1">Logout</span>
        </button>
      </nav>
    </div>
  );
};

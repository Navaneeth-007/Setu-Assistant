import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface LoginProps {
  onNavigateToSignUp: () => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigateToSignUp }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signIn(email, password);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-dim text-on-background font-body-md min-h-screen flex flex-col overflow-hidden relative">
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 stadium-mesh"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-secondary-container opacity-5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary opacity-5 blur-[100px] rounded-full"></div>
        <svg className="absolute bottom-0 left-0 w-full h-64 opacity-[0.03] text-on-surface" fill="none" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 256L48 229.3C96 202.7 192 149.3 288 154.7C384 160 480 224 576 218.7C672 213.3 768 138.7 864 128C960 117.3 1056 170.7 1152 197.3C1248 224 1344 224 1392 224L1440 224V320H1392C1344 320 1248 320 1152 320C1056 320 960 320 864 320C768 320 672 320 576 320C480 320 384 320 288 320C192 320 96 320 48 320H0V256Z" fill="currentColor"></path>
        </svg>
      </div>

      <header className="relative z-10 flex justify-end items-center px-margin-mobile md:px-margin-desktop h-16">
        <div className="flex items-center gap-sm bg-surface-container-low px-md py-xs rounded-full border border-outline-variant/30 hover:bg-surface-container-high transition-colors cursor-pointer group">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary">language</span>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">English (US)</span>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center relative z-10 px-margin-mobile">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col items-center mb-xl text-center">
            <div className="w-20 h-20 mb-md bg-surface-container-highest rounded-xl p-3 flex items-center justify-center ai-verified-glow border border-primary/20">
              <span className="material-symbols-outlined text-4xl text-primary font-bold">stadium</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-xs">SETU Portal Access</h1>
            <p className="font-body-md text-on-surface-variant opacity-80">FIFA World Cup 2026™ Stadium System</p>
          </div>

          <div className="bg-surface-container login-card-blur rounded-xl p-lg shadow-2xl border border-outline-variant/20">
            <form onSubmit={handleSubmit} className="space-y-md">
              {error && (
                <div className="bg-error-container/20 border border-error/50 text-error p-md rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-xs">
                <label className="font-label-caps text-label-caps text-on-surface-variant block uppercase px-1" htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">mail</span>
                  <input 
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg pl-11 pr-md py-md text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
                    id="email" 
                    type="email" 
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-xs">
                <div className="flex justify-between items-center px-1">
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="password">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">lock</span>
                  <input 
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg pl-11 pr-md py-md text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
                    id="password" 
                    type="password" 
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-xs py-xs">
                <div className="w-2 h-2 rounded-full bg-secondary-fixed-dim shadow-[0_0_8px_#b2c5ff]"></div>
                <span className="font-data-mono text-data-mono text-on-surface-variant/70 text-[11px]">ENCRYPTED SECURITY CONNECTION ACTIVE</span>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-secondary-container hover:bg-secondary-container/80 text-on-secondary-container font-bold py-md rounded-lg flex items-center justify-center gap-sm transition-all transform active:scale-[0.98] mt-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    <span className="font-label-caps text-label-caps uppercase">Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span className="font-label-caps text-label-caps tracking-widest uppercase">Sign In to Dashboard</span>
                    <span className="material-symbols-outlined">login</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-xl pt-lg border-t border-outline-variant/30 text-center">
              <p className="font-label-caps text-label-caps text-on-surface-variant mb-md uppercase">New to SETU?</p>
              <button 
                onClick={onNavigateToSignUp}
                className="w-full py-md border border-outline-variant rounded-lg hover:bg-surface-bright transition-colors text-on-surface-variant font-label-caps text-label-caps tracking-wider uppercase cursor-pointer"
              >
                Create an Account
              </button>
            </div>
          </div>

          <div className="mt-lg flex items-center justify-center gap-md">
            <div className="flex items-center gap-xs">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">System Live</span>
            </div>
            <div className="h-1 w-1 rounded-full bg-outline-variant"></div>
            <div className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant">public</span>
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">Node: US-SOUTH</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-margin-mobile md:px-margin-desktop py-md border-t border-outline-variant/10 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-md">
          <p className="font-label-caps text-[10px] text-on-surface-variant opacity-60 uppercase tracking-widest">
            © 2026 FIFA Operations & Logistics | Stadium Management Systems
          </p>
          <div className="flex items-center gap-xs">
            <span className="font-data-mono text-[10px] text-on-primary-container">SETU v2.4.0-STABLE</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

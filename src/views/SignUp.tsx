import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface SignUpProps {
  onNavigateToLogin: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onNavigateToLogin }) => {
  const { signUp, signInWithGoogle } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'fan' | 'staff'>('fan');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignUp = async () => {
    if (role === 'staff' && !inviteCode.toUpperCase().startsWith('STAFF')) {
      setError("Please enter a valid Staff Invite Code first to sign up as Staff (e.g. STAFF-2026).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle(role);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to sign up with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError("Please fill out all fields.");
      return;
    }

    if (role === 'staff' && !inviteCode.toUpperCase().startsWith('STAFF')) {
      setError("Invalid Staff Invite Code. Use code 'STAFF-2026' for testing.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signUp(email, password, fullName, role);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-dim text-on-background font-body-md min-h-screen flex items-center justify-center p-gutter-fan md:p-margin-desktop relative overflow-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-secondary/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-primary/5 blur-[100px] rounded-full"></div>
      </div>

      <main className="relative z-10 w-full max-w-[480px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col items-center mb-xl">
          <div className="w-20 h-20 mb-md p-xs bg-surface-container-high rounded-xl shadow-lg border border-outline-variant/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-primary">stadium</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-xs">Join SETU</h1>
          <p className="text-on-surface-variant font-body-md text-center max-w-[320px]">
            Official FIFA 2026 intelligence for fans and stadium infrastructure.
          </p>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-lg md:p-xl shadow-2xl backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-lg" id="signupForm">
            {error && (
              <div className="bg-error-container/20 border border-error/50 text-error p-md rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Access Level Selector */}
            <div className="space-y-sm">
              <label className="font-label-caps text-label-caps text-on-surface-variant">Access Level</label>
              <div className="grid grid-cols-2 gap-sm p-xs bg-surface-container-highest rounded-lg border border-outline-variant/10">
                <button 
                  type="button"
                  onClick={() => setRole('fan')}
                  className={`py-sm rounded-md font-label-caps text-label-caps transition-all flex items-center justify-center gap-xs cursor-pointer ${
                    role === 'fan' 
                      ? 'bg-secondary-container text-on-secondary-container shadow-sm' 
                      : 'text-on-surface-variant hover:bg-surface-bright'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">stadium</span>
                  Fan
                </button>
                <button 
                  type="button"
                  onClick={() => setRole('staff')}
                  className={`py-sm rounded-md font-label-caps text-label-caps transition-all flex items-center justify-center gap-xs cursor-pointer ${
                    role === 'staff' 
                      ? 'bg-secondary-container text-on-secondary-container shadow-sm' 
                      : 'text-on-surface-variant hover:bg-surface-bright'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">badge</span>
                  Staff
                </button>
              </div>
            </div>

            {/* Input Fields */}
            <div className="space-y-md">
              <div className="group">
                <label className="font-label-caps text-label-caps text-on-surface-variant mb-xs block" htmlFor="full_name">
                  Full Name
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline text-[20px]">person</span>
                  <input 
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 pl-11 pr-md text-on-surface placeholder:text-outline font-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                    id="full_name" 
                    type="text" 
                    placeholder="Enzo Fernandez"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="group">
                <label className="font-label-caps text-label-caps text-on-surface-variant mb-xs block" htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
                  <input 
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 pl-11 pr-md text-on-surface placeholder:text-outline font-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                    id="email" 
                    type="email" 
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Conditional Staff Invite Code */}
              {role === 'staff' && (
                <div className="group animate-in slide-in-from-top-2 duration-300">
                  <label className="font-label-caps text-label-caps text-tertiary mb-xs block flex items-center gap-xs" htmlFor="invite_code">
                    Staff Invite Code
                    <span className="material-symbols-outlined text-[14px]">info</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-tertiary text-[20px]">key</span>
                    <input 
                      className="w-full bg-surface-container-lowest border border-tertiary/30 rounded-lg py-3 pl-11 pr-md text-on-surface placeholder:text-outline font-data-mono text-data-mono focus:ring-2 focus:ring-tertiary focus:border-transparent outline-none transition-all" 
                      id="invite_code" 
                      type="text" 
                      placeholder="Use code: STAFF-2026"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="group">
                <label className="font-label-caps text-label-caps text-on-surface-variant mb-xs block" htmlFor="password">
                  Security Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline text-[20px]">lock</span>
                  <input 
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 pl-11 pr-md text-on-surface placeholder:text-outline font-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                    id="password" 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-sm space-y-md">
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-secondary-container text-on-secondary-container hover:bg-on-secondary-fixed-variant font-bold py-md rounded-lg flex items-center justify-center gap-md transition-all group overflow-hidden relative shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span className="relative z-10">Create Account</span>
                    <span className="material-symbols-outlined text-[20px] relative z-10 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </>
                )}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-outline-variant/30"></div>
                <span className="flex-shrink mx-4 font-label-caps text-[10px] text-on-surface-variant uppercase">Or</span>
                <div className="flex-grow border-t border-outline-variant/30"></div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleSignUp}
                disabled={loading}
                className="w-full flex items-center justify-center gap-sm py-md border border-outline-variant rounded-lg hover:bg-surface-bright transition-all cursor-pointer text-on-surface hover:border-primary/50 disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-1 text-on-surface" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="font-label-caps text-label-caps tracking-wider uppercase font-bold">Sign Up with Google</span>
              </button>
            </div>
          </form>


        </div>

        <p className="mt-xl text-center text-on-surface-variant font-body-md">
          Already have an account? 
          <button onClick={onNavigateToLogin} className="text-primary font-bold hover:underline ml-xs cursor-pointer">
            Sign In
          </button>
        </p>

        <div className="mt-xl flex flex-col items-center opacity-40">
          <div className="flex items-center gap-xs font-data-mono text-[10px] uppercase tracking-widest text-outline">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            System Operational | Stadium Nodes Active
          </div>
          <div className="mt-xs text-[10px] text-outline">© 2026 FIFA World Cup Infrastructure Div.</div>
        </div>
      </main>
    </div>
  );
};

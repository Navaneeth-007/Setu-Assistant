import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LiveDataProvider } from './context/LiveDataContext';
import { Login } from './views/Login';
import { SignUp } from './views/SignUp';
import { Settings } from './views/Settings';
import { FanMode } from './views/FanMode';
import { OpsMode } from './views/OpsMode';

// The routing controller inside the Auth context
const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  
  // Local toggle for staff to preview the Fan Mode interface
  const [staffPreviewFanMode, setStaffPreviewFanMode] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-screen bg-[#081425] items-center justify-center">
        <div className="flex flex-col items-center gap-md">
          <span className="material-symbols-outlined text-5xl text-primary animate-spin">progress_activity</span>
          <span className="font-data-mono text-sm text-primary uppercase tracking-widest">
            Booting SETU Nodes...
          </span>
        </div>
      </div>
    );
  }

  // Not logged in: Show Login or Sign Up
  if (!user) {
    if (authView === 'signup') {
      return <SignUp onNavigateToLogin={() => setAuthView('login')} />;
    }
    return <Login onNavigateToSignUp={() => setAuthView('signup')} />;
  }

  // Logged in: Show Settings if active
  if (currentTab === 'settings') {
    return <Settings onBack={() => setCurrentTab('dashboard')} />;
  }

  // Logged in & Dashboard active: route by user role
  if (user.role === 'staff') {
    if (staffPreviewFanMode) {
      // Staff previewing Fan Mode
      return (
        <FanMode 
          onNavigateToSettings={() => setCurrentTab('settings')}
          onNavigateToOps={() => setStaffPreviewFanMode(false)}
        />
      );
    }
    
    // Default Staff view: Ops Command Center
    return (
      <OpsMode 
        onNavigateToSettings={() => setCurrentTab('settings')}
        onNavigateToFan={() => setStaffPreviewFanMode(true)}
      />
    );
  }

  // Default Fan view
  return (
    <FanMode 
      onNavigateToSettings={() => setCurrentTab('settings')}
    />
  );
};

function App() {
  return (
    <AuthProvider>
      <LiveDataProvider>
        <MainApp />
      </LiveDataProvider>
    </AuthProvider>
  );
}

export default App;

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Home, Zap, User as UserIcon, LogIn } from 'lucide-react';
import { UserStats } from './types';
import * as firebaseService from './services/firebaseService';
import { User } from 'firebase/auth';
import SharedPlanView from './components/SharedPlanView';
import PlannerView from './components/PlannerView';
import HomeView from './components/HomeView';
import ProfileView from './components/ProfileView';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />} />
      <Route path="/plan/:shareId" element={<SharedPlanView />} />
    </Routes>
  );
}

type Tab = 'home' | 'planner' | 'profile';

function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>('planner');
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);

  useEffect(() => {
    // Seed demo users asynchronously for friend requests
    firebaseService.seedDemoUsers();

    const unsubscribe = firebaseService.onAuthChange((user) => {
      setUser(user);
      setIsAuthReady(true);
      if (user) {
        fetchSavedPlans(user.uid);
        fetchUserStats(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserStats = async (uid: string) => {
    try {
      const data = await firebaseService.getUserStats(uid);
      setStats(data as UserStats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchSavedPlans = async (uid: string) => {
    try {
      const plans = await firebaseService.getSavedPlans(uid);
      setSavedPlans(plans);
    } catch (error) {
      console.error("Failed to fetch saved plans:", error);
    }
  };

  const handleSignIn = async () => {
    try {
      await firebaseService.signIn();
    } catch (error: any) {
      console.error("Sign in failed:", error);
      alert(`Sign in failed: ${error.message || error.code || error}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseService.signOut();
      setSavedPlans([]);
      setStats(null);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-primary flex flex-col">
      {/* Header */}
      <header className="py-4 px-6 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-md z-40 border-b border-muted/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full" />
          </div>
          <span className="font-medium tracking-tight text-lg">Frictionless AI</span>
        </div>
        
        <div className="flex items-center gap-4">
          <nav className="bg-surface/50 border border-muted/10 rounded-2xl flex items-center p-1">
            <TabButton 
              active={activeTab === 'home'} 
              onClick={() => setActiveTab('home')}
              icon={Home}
              label="Home"
            />
            <TabButton 
              active={activeTab === 'planner'} 
              onClick={() => setActiveTab('planner')}
              icon={Zap}
              label="Planner"
            />
            <TabButton 
              active={activeTab === 'profile'} 
              onClick={() => setActiveTab('profile')}
              icon={UserIcon}
              label="Profile"
            />
          </nav>

          {isAuthReady && !user && activeTab !== 'profile' && (
            <button 
              onClick={handleSignIn}
              className="text-xs font-bold uppercase tracking-widest text-primary bg-surface border border-muted/10 px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <LogIn className="w-3 h-3" />
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area with Persistence */}
      <main className="flex-1 relative">
        <div className={activeTab === 'home' ? 'block' : 'hidden'}>
          <HomeView 
            user={user} 
            stats={stats} 
            savedPlans={savedPlans}
            onNavigate={(tab) => {
              setActiveTab(tab);
              window.scrollTo(0, 0);
            }} 
          />
        </div>
        
        <div className={activeTab === 'planner' ? 'block' : 'hidden'}>
          <PlannerView 
            user={user}
            stats={stats}
            savedPlans={savedPlans}
            onFetchSavedPlans={fetchSavedPlans}
            onUpdateStats={setStats}
            onSignIn={handleSignIn}
          />
        </div>

        <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
          <ProfileView 
            user={user}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
          />
        </div>
      </main>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}

function TabButton({ active, onClick, icon: Icon, label }: TabButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`relative flex flex-row items-center gap-2 px-4 py-1.5 rounded-xl transition-all ${
        active ? 'text-primary' : 'text-muted hover:text-primary/60'
      }`}
    >
      {active && (
        <motion.div 
          layoutId="activeTab"
          className="absolute inset-0 bg-primary/5 rounded-xl"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
      <Icon className={`w-4 h-4 transition-transform ${active ? 'scale-110' : 'scale-100'}`} />
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}

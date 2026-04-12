import React, { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Settings, Shield, Bell, CreditCard, LogOut, ChevronRight, Activity, Zap, ArrowLeft, Check, Camera, Loader2 } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import * as firebaseService from '../services/firebaseService';

interface ProfileViewProps {
  user: FirebaseUser | null;
  onSignOut: () => void;
  onSignIn: () => void;
}

type SubView = 'none' | 'personal' | 'notifications';

export default function ProfileView({ user, onSignOut, onSignIn }: ProfileViewProps) {
  const [activeSubView, setActiveSubView] = useState<SubView>('none');
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [notifsEnabled, setNotifsEnabled] = useState(true);
  const [streakAlerts, setStreakAlerts] = useState(true);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await firebaseService.updateUserProfile(displayName, photoURL);
      setActiveSubView('none');
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (activeSubView === 'personal') {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="p-6 md:p-12 max-w-2xl mx-auto pb-32"
      >
        <button 
          onClick={() => setActiveSubView('none')}
          className="flex items-center gap-2 text-muted hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </button>

        <h2 className="text-2xl font-medium mb-8">Personal Information</h2>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="flex flex-col items-center mb-8">
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-muted/20">
                {photoURL ? (
                  <img src={photoURL} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted/10 flex items-center justify-center">
                    <User className="w-10 h-10 text-muted" />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-muted mt-2">Tap to change photo URL</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted px-1">Display Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-surface border border-muted/10 rounded-xl p-4 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted px-1">Photo URL</label>
            <input 
              type="text" 
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              className="w-full bg-surface border border-muted/10 rounded-xl p-4 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="https://example.com/photo.jpg"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted px-1">Email Address</label>
            <input 
              type="email" 
              value={user?.email || ''} 
              disabled
              className="w-full bg-muted/5 border border-muted/10 rounded-xl p-4 text-sm text-muted cursor-not-allowed"
            />
            <p className="text-[10px] text-muted px-1">Email is managed via Google Account.</p>
          </div>

          <button 
            type="submit"
            disabled={isSaving}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Changes
          </button>
        </form>
      </motion.div>
    );
  }

  if (activeSubView === 'notifications') {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="p-6 md:p-12 max-w-2xl mx-auto pb-32"
      >
        <button 
          onClick={() => setActiveSubView('none')}
          className="flex items-center gap-2 text-muted hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </button>

        <h2 className="text-2xl font-medium mb-8">Notifications</h2>

        <div className="space-y-4">
          <div className="bg-surface border border-muted/10 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="font-semibold">Meal Protocol Alerts</p>
              <p className="text-xs text-muted">Get reminded when it's time for your next metabolic meal.</p>
            </div>
            <button 
              onClick={() => setNotifsEnabled(!notifsEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative ${notifsEnabled ? 'bg-secondary' : 'bg-muted/20'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifsEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="bg-surface border border-muted/10 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="font-semibold">Streak Milestones</p>
              <p className="text-xs text-muted">Celebrate when you hit new personal bests and milestones.</p>
            </div>
            <button 
              onClick={() => setStreakAlerts(!streakAlerts)}
              className={`w-12 h-6 rounded-full transition-colors relative ${streakAlerts ? 'bg-secondary' : 'bg-muted/20'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${streakAlerts ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-12 max-w-4xl mx-auto pb-32 relative"
    >
      {/* Top Left Sign Out */}
      {user && (
        <button 
          onClick={onSignOut}
          className="absolute left-6 top-6 md:left-12 md:top-12 flex items-center gap-2 text-muted hover:text-error transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <LogOut className="w-3 h-3" />
          Sign Out
        </button>
      )}

      <header className="mb-12 flex flex-col items-center text-center pt-8">
        <div className="w-24 h-24 bg-muted/10 rounded-full flex items-center justify-center border-2 border-muted/20 mb-4 shadow-sm">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-muted" />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-medium mb-1">{user?.displayName || 'Guest User'}</h1>
          <p className="text-muted text-sm">{user?.email || 'Sign in to sync your data'}</p>
        </div>
      </header>

      {!user ? (
        <div className="bg-surface border border-muted/10 rounded-2xl p-8 text-center mb-12">
          <Zap className="w-12 h-12 text-secondary mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">Unlock Premium Features</h3>
          <p className="text-muted text-sm mb-8">Save your protocols, track streaks, and get clinical-grade insights.</p>
          <button 
            onClick={onSignIn}
            className="bg-primary text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors w-full md:w-auto"
          >
            Sign In with Google
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-12">
          <div className="bg-surface border border-muted/10 rounded-xl p-4 flex flex-col items-center text-center">
            <Activity className="w-5 h-5 text-secondary mb-2" />
            <span className="text-[10px] font-bold uppercase text-muted tracking-widest">Metabolic Type</span>
            <span className="text-sm font-medium">Efficient Burner</span>
          </div>
          <div className="bg-surface border border-muted/10 rounded-xl p-4 flex flex-col items-center text-center">
            <Zap className="w-5 h-5 text-accent mb-2" />
            <span className="text-[10px] font-bold uppercase text-muted tracking-widest">Plan Level</span>
            <span className="text-sm font-medium">Pro Clinical</span>
          </div>
        </div>
      )}

      <section className="space-y-4">
        <div className="px-2 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-1">Account Settings</h3>
          <p className="text-[10px] text-muted/60 uppercase tracking-tight">Manage your core profile and communication preferences.</p>
        </div>
        
        <button 
          onClick={() => setActiveSubView('personal')}
          className="w-full bg-surface border border-muted/10 rounded-2xl p-5 flex items-center justify-between hover:bg-muted/5 transition-all group text-left shadow-sm"
        >
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <User className="w-6 h-6" />
            </div>
            <div>
              <span className="text-base font-semibold block">Personal Information</span>
              <span className="text-xs text-muted">Manage your display name, email, and profile photo.</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted group-hover:translate-x-1 transition-transform" />
        </button>

        <button 
          onClick={() => setActiveSubView('notifications')}
          className="w-full bg-surface border border-muted/10 rounded-2xl p-5 flex items-center justify-between hover:bg-muted/5 transition-all group text-left shadow-sm"
        >
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <span className="text-base font-semibold block">Notifications</span>
              <span className="text-xs text-muted">Configure alerts for meal protocols and streak milestones.</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted group-hover:translate-x-1 transition-transform" />
        </button>
      </section>
    </motion.div>
  );
}

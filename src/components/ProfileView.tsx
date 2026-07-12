import React, { useState, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Settings, Shield, Bell, CreditCard, LogOut, ChevronRight, Activity, Zap, ArrowLeft, Check, Camera, Loader2 } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Form states
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [username, setUsername] = useState('');
  const [notifsEnabled, setNotifsEnabled] = useState(true);
  const [streakAlerts, setStreakAlerts] = useState(true);
  const [globalNotifs, setGlobalNotifs] = useState(true);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG/PNG/WEBP)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Please select an image smaller than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPhotoURL(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  useEffect(() => {
    if (user) {
      const fetchUserProfile = async () => {
        try {
          const snap = await getDoc(doc(firebaseService.db, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            setUsername(data.username || '');
            if (data.displayName) {
              setDisplayName(data.displayName);
            }
            if (data.photoURL) {
              setPhotoURL(data.photoURL);
            }
          } else {
            if (user.displayName) setDisplayName(user.displayName);
            if (user.photoURL) setPhotoURL(user.photoURL);
          }
        } catch (e) {
          console.error("Failed to load profile data from Firestore", e);
          if (user.displayName) setDisplayName(user.displayName);
          if (user.photoURL) setPhotoURL(user.photoURL);
        }
      };
      fetchUserProfile();
    }
  }, [user]);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await firebaseService.updateUserProfile(displayName, photoURL);
      if (username.trim()) {
        await firebaseService.claimUsername(user!.uid, username, displayName, photoURL);
      }
      setActiveSubView('none');
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert(error instanceof Error ? error.message : "Failed to update profile");
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
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/jpeg,image/png,image/webp" 
              className="hidden" 
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative group cursor-pointer w-28 h-28 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${
                isDragging ? 'border-primary bg-primary/5 scale-105' : 'border-muted/20 hover:border-primary/50 hover:bg-muted/5'
              }`}
            >
              <div className="w-24 h-24 rounded-full overflow-hidden">
                {photoURL ? (
                  <img src={photoURL} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted/10 flex items-center justify-center">
                    <User className="w-10 h-10 text-muted" />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold uppercase tracking-wider gap-1">
                <Camera className="w-5 h-5" />
                <span>Upload</span>
              </div>
            </div>
            <p className="text-[10px] text-muted mt-2 font-medium">Click, drag, or drop a JPEG/PNG/WEBP to change profile photo</p>
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
            <label className="text-xs font-bold uppercase tracking-widest text-muted px-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="w-full bg-surface border border-muted/10 rounded-xl p-4 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="Choose a unique username"
              required
            />
            <p className="text-[10px] text-muted px-1">Alphanumeric and underscores (3-15 chars). Used to search and add friends.</p>
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

        <div className="space-y-6">
          <div className="bg-surface border border-muted/10 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">Push Notifications</p>
                <p className="text-xs text-muted">Receive updates, streak reminders, and protocol notifications.</p>
              </div>
              <button 
                onClick={() => setGlobalNotifs(!globalNotifs)}
                className={`w-14 h-7 rounded-full transition-all duration-300 relative ${globalNotifs ? 'bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]' : 'bg-muted/20'}`}
              >
                <motion.div 
                  animate={{ x: globalNotifs ? 28 : 4 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm" 
                />
              </button>
            </div>
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
          {photoURL || user?.photoURL ? (
            <img src={photoURL || user.photoURL || ''} alt="Profile" className="w-full h-full rounded-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-muted" />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-medium mb-1">{displayName || user?.displayName || 'Guest User'}</h1>
          {username && <p className="text-secondary text-sm font-semibold mb-1">@{username}</p>}
          <p className="text-muted text-xs">{user?.email || 'Sign in to sync your data'}</p>
        </div>
      </header>

      {!user && (
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

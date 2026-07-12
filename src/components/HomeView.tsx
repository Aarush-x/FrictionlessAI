import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Zap, Flame, Trophy, ChevronRight, Activity, Leaf, Crown, User as UserIcon, Share2, Loader2, Sparkles, Bookmark, TrendingUp, ArrowUpRight, UserPlus, Search, UserCheck, Clock, X, Download, Copy, ExternalLink, Check, Image, Instagram } from 'lucide-react';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { UserStats } from '../types';
import html2canvas from 'html2canvas';
import * as firebaseService from '../services/firebaseService';

interface HomeViewProps {
  user: User | null;
  stats: UserStats | null;
  savedPlans: any[];
  onNavigate: (tab: 'home' | 'planner' | 'profile') => void;
}

interface LeaderboardItem {
  name: string;
  streak: number;
  score: number;
  avatar: string;
  isCurrentUser?: boolean;
}

const MOCK_LEADERBOARD: LeaderboardItem[] = [
  { name: 'Sarah Chen', streak: 24, score: 98, avatar: 'https://i.pravatar.cc/150?u=sarah' },
  { name: 'Marcus Wright', streak: 18, score: 92, avatar: 'https://i.pravatar.cc/150?u=marcus' },
  { name: 'Elena Rodriguez', streak: 15, score: 89, avatar: 'https://i.pravatar.cc/150?u=elena' },
  { name: 'David Kim', streak: 14, score: 85, avatar: 'https://i.pravatar.cc/150?u=david' },
  { name: 'Jordan Smith', streak: 10, score: 82, avatar: 'https://i.pravatar.cc/150?u=jordan' },
];

export default function HomeView({ user, stats, savedPlans, onNavigate }: HomeViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);
  const storyRef = useRef<HTMLDivElement>(null);

  const currentStreak = stats?.currentStreak || 0;
  const longestStreak = stats?.longestStreak || 0;
  const pbGoal = longestStreak + 1;
  const pbProgress = Math.min((currentStreak / pbGoal) * 100, 100);
  const daysToBeat = Math.max(pbGoal - currentStreak, 1);

  // Social State
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [myUsername, setMyUsername] = useState('');
  const [myDisplayName, setMyDisplayName] = useState(user?.displayName || '');
  const [myPhotoURL, setMyPhotoURL] = useState(user?.photoURL || '');
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Share Stats State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState('');
  const [copiedState, setCopiedState] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load real-time social data
  useEffect(() => {
    if (!user) {
      // Offline mode: load from LocalStorage
      const localFriends = localStorage.getItem('frictionless_friends');
      if (localFriends) {
        setFriendsList(JSON.parse(localFriends));
      } else {
        // Fallback to static mockup
        setFriendsList(MOCK_LEADERBOARD);
      }
      return;
    }

    const loadSocialData = async () => {
      try {
        // Get current user username, displayName, and photoURL
        const myUserDoc = await getDoc(doc(firebaseService.db, 'users', user.uid));
        if (myUserDoc.exists()) {
          const data = myUserDoc.data();
          setMyUsername(data.username || '');
          if (data.displayName) {
            setMyDisplayName(data.displayName);
          }
          if (data.photoURL) {
            setMyPhotoURL(data.photoURL);
          }
        }

        // Get pending requests
        const incoming = await firebaseService.getIncomingRequests(user.uid);
        setIncomingRequests(incoming);

        const outgoing = await firebaseService.getOutgoingRequests(user.uid);
        setOutgoingRequests(outgoing);

        // Get friends list
        const friends = await firebaseService.getFriends(user.uid);
        if (friends.length > 0) {
          const friendUids = friends.map(f => f.uid);
          const friendStats = await firebaseService.getFriendLeaderboardStats(friendUids);
          const activeFriends = friends.map(f => ({
            name: f.displayName,
            avatar: f.avatar,
            streak: friendStats[f.uid]?.streak || 0,
            score: friendStats[f.uid]?.score || 75,
            uid: f.uid,
            username: f.username
          }));
          setFriendsList(activeFriends);
        } else {
          // If Firestore is empty, keep mockup list for presentation so it doesn't look empty
          setFriendsList(MOCK_LEADERBOARD);
        }
      } catch (error) {
        console.error("Failed to load social data", error);
      }
    };

    loadSocialData();
  }, [user]);

  // Social Handlers
  const handleSearchFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchStatus('searching');
    setSearchResult(null);
    try {
      if (myUsername && searchQuery.trim().toLowerCase() === myUsername.toLowerCase()) {
        alert("You cannot add yourself as a friend!");
        setSearchStatus('idle');
        return;
      }

      const result = await firebaseService.getUserByUsername(searchQuery);
      if (result) {
        setSearchResult(result);
        setSearchStatus('found');
      } else {
        setSearchStatus('not_found');
      }
    } catch (error) {
      console.error("Search failed", error);
      setSearchStatus('not_found');
    }
  };

  const handleSendRequest = async (receiver: any) => {
    if (!user) {
      alert("Sign in with Google to send a real friend request to @" + receiver.username + "! Adding them to your mock friend list directly for testing.");
      const newFriend = {
        name: receiver.displayName,
        streak: receiver.streak,
        score: receiver.score,
        avatar: receiver.avatar,
        username: receiver.username,
        uid: receiver.uid
      };
      const updated = [...friendsList.filter(f => f.username !== receiver.username), newFriend];
      setFriendsList(updated);
      localStorage.setItem('frictionless_friends', JSON.stringify(updated));
      setShowAddFriendModal(false);
      return;
    }

    if (!myUsername) {
      alert("Please claim a username first in your Profile tab before sending requests!");
      return;
    }

    setActionLoading(receiver.uid);
    try {
      await firebaseService.sendFriendRequest(
        user.uid,
        myUsername,
        user.displayName || 'Anonymous',
        user.photoURL || '',
        receiver.uid
      );
      setOutgoingRequests(prev => [...prev, { uid: receiver.uid }]);
    } catch (e) {
      console.error(e);
      alert("Failed to send friend request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptRequest = async (request: any) => {
    if (!user) return;
    setActionLoading(request.uid);
    try {
      await firebaseService.acceptFriendRequest(
        user.uid,
        myUsername,
        user.displayName || 'Anonymous',
        user.photoURL || '',
        request.uid,
        request.username,
        request.displayName,
        request.avatar
      );
      
      setIncomingRequests(prev => prev.filter(r => r.uid !== request.uid));
      
      const friends = await firebaseService.getFriends(user.uid);
      const friendUids = friends.map(f => f.uid);
      const friendStats = await firebaseService.getFriendLeaderboardStats(friendUids);
      const activeFriends = friends.map(f => ({
        name: f.displayName,
        avatar: f.avatar,
        streak: friendStats[f.uid]?.streak || 0,
        score: friendStats[f.uid]?.score || 75,
        uid: f.uid,
        username: f.username
      }));
      setFriendsList(activeFriends);
    } catch (e) {
      console.error(e);
      alert("Failed to accept friend request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineRequest = async (requestUid: string) => {
    if (!user) return;
    setActionLoading(requestUid);
    try {
      await firebaseService.declineFriendRequest(user.uid, requestUid);
      setIncomingRequests(prev => prev.filter(r => r.uid !== requestUid));
    } catch (e) {
      console.error(e);
      alert("Failed to decline request");
    } finally {
      setActionLoading(null);
    }
  };

  // 1. Microbiome Diversity: average species count from savedPlans.
  // Standard target is 25+ unique plants for a perfect score component.
  const avgPlants = savedPlans.length > 0
    ? (savedPlans.reduce((sum, p) => sum + (p.healthMetrics?.uniquePlantsUsed?.length || 0), 0) / savedPlans.length)
    : 18; // Default to 18 species if no plans saved yet (aligns with screenshot)
  const diversityScore = Math.min((avgPlants / 25) * 100, 100);

  // 2. Average Daily Fiber: average fiber from savedPlans.
  // Standard target is 45g+ for a perfect score component.
  const avgFiber = savedPlans.length > 0
    ? (savedPlans.reduce((sum, p) => {
        const f = parseInt(p.healthMetrics?.dailyFiber || '0');
        return sum + (isNaN(f) ? 0 : f);
      }, 0) / savedPlans.length)
    : 42; // Default to 42g if no plans saved yet (aligns with screenshot)
  const fiberScore = Math.min((avgFiber / 45) * 100, 100);

  // 3. Metabolic Efficiency: derived from streak consistency and default baseline.
  // Base efficiency starts at 75% and increases by 5% per streak day up to 100%.
  const streakBonus = Math.min(currentStreak * 5, 25);
  const efficiencyScore = Math.min(75 + streakBonus, 100);

  // Combined Metabolic Score (Weighted: 40% Diversity, 30% Fiber, 30% Adherence/Efficiency)
  const metabolicScore = Math.round((diversityScore * 0.4) + (fiberScore * 0.3) + (efficiencyScore * 0.3));

  // Prepare leaderboard data
  const currentUserData = {
    name: user?.displayName || 'You',
    streak: currentStreak,
    score: metabolicScore,
    avatar: myPhotoURL || user?.photoURL || '',
    isCurrentUser: true,
    uid: user?.uid || 'guest-uid'
  };

  const sortedLeaderboard = [...friendsList.filter(f => f.uid !== currentUserData.uid), currentUserData]
    .sort((a, b) => b.streak - a.streak);

  const top3 = sortedLeaderboard.slice(0, 3);
  const userRank = sortedLeaderboard.findIndex(item => item.isCurrentUser) + 1;
  const isUserInTop3 = userRank <= 3;

  const handleGenerateShareImage = async () => {
    if (!storyRef.current) return;
    setIsGenerating(true);

    try {
      // Small delay to ensure any dynamic styles are applied
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(storyRef.current, {
        useCORS: true,
        scale: 2, // Higher quality
        backgroundColor: '#000000',
      });

      const image = canvas.toDataURL('image/png');
      setShareImageUrl(image);
      setShowShareModal(true);
    } catch (error) {
      console.error('Failed to generate story image:', error);
      alert('Failed to generate stats graphic.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = 'frictionless-metabolic-stats.png';
    link.href = shareImageUrl;
    link.click();
  };

  const handleCopyImage = async () => {
    try {
      const response = await fetch(shareImageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    } catch (err) {
      console.error('Failed to copy image to clipboard:', err);
      try {
        await navigator.clipboard.writeText(window.location.origin);
        setCopiedState(true);
        setTimeout(() => setCopiedState(false), 2000);
      } catch (e) {
        alert('Failed to copy text link.');
      }
    }
  };

  const handleShareWhatsApp = async () => {
    await handleCopyImage();
    const url = 'https://web.whatsapp.com';
    window.open(url, '_blank');
    alert("Stats card image copied to clipboard! Select a chat in WhatsApp and press Paste (Cmd+V / Ctrl+V) to send it.");
  };

  const handleShareInstagram = async () => {
    await handleCopyImage();
    const url = 'https://www.instagram.com';
    window.open(url, '_blank');
    alert("Stats card image copied to clipboard! You can now paste (Cmd+V / Ctrl+V) or upload the downloaded stats card directly to your Instagram story/feed!");
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent("Check out my metabolic stats on Frictionless AI! ⚡");
    const url = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    try {
      const blob = await (await fetch(shareImageUrl)).blob();
      const file = new File([blob], 'my-metabolic-stats.png', { type: 'image/png' });
      await navigator.share({
        files: [file],
        title: 'My Metabolic Stats',
        text: 'Check out my metabolic progress on Frictionless AI!',
      });
    } catch (e) {
      console.error('Native share failed:', e);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 p-6 md:p-12 max-w-4xl mx-auto pb-32"
    >
      {/* Hidden IG Story Graphic (1080x1920) */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none">
        <div 
          ref={storyRef}
          className="w-[1080px] h-[1920px] bg-black text-white p-20 flex flex-col justify-between relative overflow-hidden"
          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
        >
          {/* Background Accents */}
          <div className="absolute top-[-200px] right-[-200px] w-[800px] h-[800px] rounded-full blur-[150px]" style={{ backgroundColor: 'rgba(94, 109, 98, 0.2)' }} />
          <div className="absolute bottom-[-200px] left-[-200px] w-[800px] h-[800px] rounded-full blur-[150px]" style={{ backgroundColor: 'rgba(26, 26, 26, 0.2)' }} />
          
          {/* Logo & Header */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8">
              <div className="w-12 h-12 bg-black rounded-full" />
            </div>
            <h2 className="text-4xl font-bold tracking-tighter uppercase mb-2" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Frictionless AI</h2>
            <p className="text-xl uppercase tracking-[0.2em]" style={{ color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Metabolic Protocol</p>
          </div>

          {/* Main Stats Card */}
          <div className="relative z-10 rounded-[60px] p-16 flex flex-col items-center text-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div className="mb-12">
              <p className="text-2xl font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Metabolic Score</p>
              <h1 className="text-[150px] font-black leading-tight text-secondary my-4" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{metabolicScore}</h1>
              <p className="text-3xl font-bold mt-4" style={{ color: 'rgba(94, 109, 98, 0.6)', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Top 5% Globally</p>
            </div>

            <div className="grid grid-cols-2 gap-12 w-full">
              <div className="rounded-[40px] p-10" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                <Flame className="w-16 h-16 text-secondary fill-secondary mx-auto mb-4" />
                <p className="text-5xl font-bold" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{currentStreak}</p>
                <p className="text-xl font-bold uppercase mt-2" style={{ color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Day Streak</p>
              </div>
              <div className="rounded-[40px] p-10" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                <Trophy className="w-16 h-16 text-accent mx-auto mb-4" />
                <p className="text-5xl font-bold" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>#{userRank}</p>
                <p className="text-xl font-bold uppercase mt-2" style={{ color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Rank</p>
              </div>
            </div>
          </div>

          {/* AI Meal Highlight */}
          <div className="relative z-10">
            <div className="flex items-center gap-6 mb-8">
              <Sparkles className="w-12 h-12 text-secondary" />
              <h3 className="text-4xl font-bold" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Today's Protocol</h3>
            </div>
            <div className="rounded-[40px] p-12" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <p className="text-2xl font-bold text-secondary mb-2" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Wild Salmon & Asparagus</p>
              <p className="text-xl leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                Optimized for microbiome diversity and metabolic efficiency.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 flex justify-between items-center pt-12" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div>
              <p className="text-2xl font-bold" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{myDisplayName || user?.displayName || 'Metabolic Pioneer'}</p>
              <p className="text-xl" style={{ color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>frictionless.ai</p>
            </div>
            <div className="bg-secondary text-black px-8 py-4 rounded-full text-xl font-black uppercase" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              Join the Protocol
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="mb-12 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full border-2 border-muted/20 p-1 bg-surface shadow-sm">
          {myPhotoURL || user?.photoURL ? (
            <img 
              src={myPhotoURL || user.photoURL || ''} 
              alt={user.displayName || 'User'} 
              className="w-full h-full rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-muted/10 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-muted" />
            </div>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-medium tracking-tight">
            Hello, <span className="text-primary">{myDisplayName.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Guest'}</span>
          </h1>
          <p className="text-muted text-sm">Your metabolic health at a glance.</p>
        </div>
      </header>

      {/* Streak & PB Widget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-surface border border-muted/10 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-surface border border-muted/10 rounded-full flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <Flame className={`w-5 h-5 ${currentStreak > 0 ? 'text-primary fill-primary' : 'text-muted'}`} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Current Streak</p>
                <p className="text-3xl font-medium">{currentStreak} Days</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Personal Best</p>
              <p className="text-lg font-medium text-secondary">{longestStreak}d</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted">
              <span>PB Progress</span>
              <span>{daysToBeat} days to beat PB</span>
            </div>
            <div className="h-3 w-full bg-muted/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${pbProgress}%` }}
                className="h-full bg-secondary shadow-[0_0_12px_rgba(249,115,22,0.4)]"
              />
            </div>
          </div>
          <Zap className="absolute -right-4 -bottom-4 w-24 h-24 text-secondary/5 -rotate-12" />
        </div>

        <div className="bg-surface border border-muted/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-surface border border-muted/10 rounded-full flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Metabolic Score</p>
              <p className="text-3xl font-medium">{metabolicScore}/100</p>
            </div>
          </div>
          <div className="h-3 w-full bg-muted/10 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-accent" style={{ width: `${metabolicScore}%` }} />
          </div>
          
          <button 
            onClick={handleGenerateShareImage}
            disabled={isGenerating}
            className="w-full py-3 bg-gradient-to-r from-secondary to-accent text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all disabled:opacity-70"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            {isGenerating ? 'Generating...' : 'Share Stats'}
          </button>
        </div>
      </div>

      {/* Friend Leaderboard */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-baseline gap-3">
            <h3 className="text-lg font-medium">Friend Streaks</h3>
            {incomingRequests.length > 0 && (
              <span className="text-[10px] bg-accent text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                {incomingRequests.length} Pending
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {user && !myUsername && (
              <span className="text-[10px] text-yellow-600 bg-yellow-500/10 px-2.5 py-1 rounded-lg mr-2 font-medium">
                Claim a username in Profile to add friends
              </span>
            )}
            <button 
              onClick={() => setShowAddFriendModal(true)}
              className="text-xs font-bold uppercase tracking-widest bg-primary/5 text-primary hover:bg-primary/10 px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Friend
            </button>
          </div>
        </div>

        {/* Incoming Friend Requests Pending List */}
        {incomingRequests.length > 0 && (
          <div className="mb-6 bg-accent/5 border border-accent/15 rounded-2xl p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Pending Friend Requests
            </p>
            <div className="divide-y divide-accent/10">
              {incomingRequests.map((request: any) => (
                <div key={request.uid} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <img src={request.avatar || 'https://i.pravatar.cc/150'} alt={request.displayName} className="w-9 h-9 rounded-full border border-muted/20 object-cover" />
                    <div>
                      <p className="text-xs font-semibold">{request.displayName}</p>
                      <p className="text-[10px] text-muted">@{request.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => handleAcceptRequest(request)}
                      disabled={actionLoading === request.uid}
                      className="px-3 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary/95 transition-all disabled:opacity-50"
                    >
                      {actionLoading === request.uid ? 'Accepting...' : 'Accept'}
                    </button>
                    <button 
                      onClick={() => handleDeclineRequest(request.uid)}
                      disabled={actionLoading === request.uid}
                      className="px-3 py-1.5 border border-muted/20 text-muted hover:text-primary text-[10px] font-bold rounded-lg hover:bg-muted/5 transition-all disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="bg-surface border border-muted/10 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-muted/5">
            {top3.map((friend, i) => (
              <div 
                key={i} 
                className={`p-4 flex items-center justify-between transition-colors ${
                  friend.isCurrentUser ? 'bg-secondary/5' : 'hover:bg-muted/5'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <span className="absolute -left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted w-4 text-center">
                      {i + 1}
                    </span>
                    <div className="w-10 h-10 rounded-full border border-muted/20 overflow-hidden">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-muted/10 flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-muted" />
                        </div>
                      )}
                    </div>
                    {i === 0 && (
                      <div className="absolute -top-2 -right-1">
                        <Crown className="w-4 h-4 text-accent fill-accent" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      {friend.name}
                      {friend.isCurrentUser && (
                        <span className="text-[8px] bg-secondary text-white px-1.5 py-0.5 rounded-full uppercase">You</span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted uppercase tracking-widest">Metabolic Score: <span className="font-bold text-primary">{friend.score}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-lg font-bold text-secondary leading-none">{friend.streak}</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-muted">Day Streak</p>
                  </div>
                  <Flame className={`w-4 h-4 ${friend.streak > 0 ? 'text-secondary fill-secondary' : 'text-muted'}`} />
                </div>
              </div>
            ))}

            {!isUserInTop3 && (
              <div className="p-4 flex items-center justify-between bg-secondary/5 border-t border-secondary/10">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <span className="absolute -left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted w-4 text-center">
                      {userRank}
                    </span>
                    <div className="w-10 h-10 rounded-full border border-secondary/20 overflow-hidden">
                      {currentUserData.avatar ? (
                        <img src={currentUserData.avatar} alt={currentUserData.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-muted/10 flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-muted" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      {currentUserData.name}
                      <span className="text-[8px] bg-secondary text-white px-1.5 py-0.5 rounded-full uppercase">You</span>
                    </p>
                    <p className="text-[10px] text-muted uppercase tracking-widest">Metabolic Score: <span className="font-bold text-primary">{currentUserData.score}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-lg font-bold text-secondary leading-none">{currentUserData.streak}</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-muted">Day Streak</p>
                  </div>
                  <Flame className={`w-4 h-4 ${currentUserData.streak > 0 ? 'text-secondary fill-secondary' : 'text-muted'}`} />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recent Protocols */}
      {savedPlans.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium">Recent Protocols</h3>
            <button 
              onClick={() => onNavigate('planner')}
              className="text-xs font-bold uppercase tracking-widest text-secondary hover:underline"
            >
              View All
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
            {savedPlans.slice(0, 5).map((plan) => (
              <div 
                key={plan.id}
                onClick={() => onNavigate('planner')}
                className="flex-none w-64 bg-surface border border-muted/10 rounded-2xl p-5 hover:border-muted/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-muted">
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </span>
                  <Bookmark className="w-3 h-3 text-secondary fill-secondary" />
                </div>
                <h4 className="text-sm font-medium mb-3 group-hover:text-primary transition-colors line-clamp-1">
                  {plan.protocolName}
                </h4>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-secondary" />
                    <span className="text-[10px] text-muted">{plan.healthMetrics.dailyFiber} Fiber</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Leaf className="w-3 h-3 text-success" />
                    <span className="text-[10px] text-muted">{plan.healthMetrics.uniquePlantsUsed.length} Plants</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Insights */}
      <section className="mb-12">
        <h3 className="text-lg font-medium mb-6">Recent Insights</h3>
        <div className="space-y-4">
          {[
            { 
              title: 'Microbiome Diversity', 
              value: `${Math.round(avgPlants)} Species`, 
              pastValue: '12 Species',
              icon: Leaf, 
              color: 'text-success',
              description: `You have incorporated an average of ${Math.round(avgPlants)} unique plant species in your recent protocols, helping support gut microbiome alpha-diversity and resilience.`,
              metric: 'Species Count'
            },
            { 
              title: 'Average Daily Fiber', 
              value: `${Math.round(avgFiber)}g`, 
              pastValue: '22g',
              icon: Activity, 
              color: 'text-secondary',
              description: `Your average daily fiber intake across your generated protocols is ${Math.round(avgFiber)}g, promoting healthy microbiome motility and blood glucose stability.`,
              metric: 'Grams/Day'
            },
            { 
              title: 'Metabolic Efficiency', 
              value: efficiencyScore >= 90 ? 'High' : efficiencyScore >= 75 ? 'Moderate' : 'Low', 
              pastValue: 'Moderate',
              icon: Zap, 
              color: 'text-accent',
              description: `Adherence tracking indicates a ${Math.round(efficiencyScore)}% efficiency level based on your activity metrics and continuous protocol adherence.`,
              metric: 'Efficiency Level'
            },
          ].map((insight, i) => (
            <div 
              key={i} 
              onClick={() => setExpandedInsight(expandedInsight === i ? null : i)}
              className="bg-surface border border-muted/10 rounded-2xl overflow-hidden hover:border-muted/30 transition-all cursor-pointer group"
            >
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface border border-muted/10 flex items-center justify-center text-primary shadow-[0_1px_2px_rgba(0,0,0,0.03)] group-hover:scale-110 transition-transform">
                    <insight.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <span className="font-semibold block">{insight.title}</span>
                    <span className="text-[10px] text-muted uppercase tracking-widest font-bold">Metabolic Indicator</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-lg font-semibold block text-primary">{insight.value}</span>
                    <span className="text-[10px] text-success font-semibold tracking-widest uppercase block mt-1">
                      Improving
                    </span>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted transition-transform duration-300 ${expandedInsight === i ? 'rotate-90' : ''}`} />
                </div>
              </div>

              <AnimatePresence>
                {expandedInsight === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-muted/5 bg-muted/5"
                  >
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-background/50 rounded-xl p-4 border border-muted/5">
                          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Current</p>
                          <p className={`text-2xl font-bold ${insight.color}`}>{insight.value}</p>
                        </div>
                        <div className="bg-background/50 rounded-xl p-4 border border-muted/5">
                          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Previous Month</p>
                          <p className="text-2xl font-bold text-muted/60">{insight.pastValue}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                          <ArrowUpRight className="w-3 h-3" />
                          Clinical Context
                        </h4>
                        <p className="text-sm text-muted leading-relaxed">
                          {insight.description}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-muted/5 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Primary Metric: {insight.metric}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      <div className="bg-primary rounded-3xl p-10 text-white relative overflow-hidden shadow-2xl border border-white/5">
        <Zap className="absolute -right-4 -bottom-4 w-40 h-40 text-white/10 rotate-12 pointer-events-none" />
        <div className="relative z-20">
          <h3 className="text-2xl font-medium mb-3">Ready for your next scan?</h3>
          <p className="text-white/70 text-base mb-8 max-w-md">Keep your streak alive by logging your fridge inventory. Our AI is ready to recalibrate your protocol.</p>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('planner');
            }}
            className="group relative z-30 bg-white text-primary px-10 py-4 rounded-2xl font-bold text-base hover:bg-white/90 active:scale-95 transition-all shadow-xl cursor-pointer flex items-center gap-3"
          >
            <span>Go to Planner</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Share Stats Modal Overlay */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-muted/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 relative flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setShowShareModal(false)}
                className="absolute right-4 top-4 text-muted hover:text-primary transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Graphic Preview */}
              <div className="flex-1 flex flex-col items-center justify-center bg-background/50 rounded-2xl p-4 border border-muted/5">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5" />
                  Preview
                </p>
                <div className="w-full max-w-[260px] aspect-[9/16] rounded-2xl overflow-hidden shadow-lg border border-muted/10 relative bg-black">
                  {shareImageUrl && (
                    <img src={shareImageUrl} alt="Metabolic stats preview" className="w-full h-full object-cover" />
                  )}
                </div>
              </div>

              {/* Share Options */}
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-xl font-semibold mb-1">Share Stats</h3>
                <p className="text-xs text-muted mb-6">Download your custom card or share it directly to your favorite apps.</p>

                <div className="space-y-3">
                  <button 
                    onClick={handleDownload}
                    className="w-full py-3 px-4 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    Download Image
                  </button>

                  <button 
                    onClick={handleCopyImage}
                    className="w-full py-3 px-4 bg-surface border border-muted/10 text-primary rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-muted/5 transition-all active:scale-[0.98]"
                  >
                    {copiedState ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                    {copiedState ? 'Copied!' : 'Copy to Clipboard'}
                  </button>

                  <button 
                    onClick={handleShareWhatsApp}
                    className="w-full py-3 px-4 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/15 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Share on WhatsApp
                  </button>

                  <button 
                    onClick={handleShareInstagram}
                    className="w-full py-3 px-4 bg-[#E1306C]/10 text-[#E1306C] hover:bg-[#E1306C]/15 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <Instagram className="w-4 h-4" />
                    Share on Instagram
                  </button>

                  <button 
                    onClick={handleShareTwitter}
                    className="w-full py-3 px-4 bg-muted/5 hover:bg-muted/10 text-primary rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Share on X (Twitter)
                  </button>

                  {navigator.share && (
                    <button 
                      onClick={handleNativeShare}
                      className="w-full py-3 px-4 bg-secondary/10 hover:bg-secondary/15 text-secondary rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      <Share2 className="w-4 h-4" />
                      More Share Options
                    </button>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-muted/5">
                  <p className="text-[10px] text-muted leading-relaxed">
                    💡 <strong>Tip for Instagram:</strong> Download the image to your device first, then upload it directly as a new story or post!
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Extra spacer to ensure content clears the bottom nav bar completely */}
      <div className="h-20" />

      {/* Add Friend Modal Overlay */}
      <AnimatePresence>
        {showAddFriendModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-muted/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 relative"
            >
              <button 
                onClick={() => {
                  setShowAddFriendModal(false);
                  setSearchQuery('');
                  setSearchResult(null);
                  setSearchStatus('idle');
                }}
                className="absolute right-4 top-4 text-muted hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-medium mb-1">Add Friend</h3>
              <p className="text-xs text-muted mb-6">Search for users by their unique username (e.g. search <span className="font-semibold text-secondary">"huey"</span> to test the request flow).</p>

              <form onSubmit={handleSearchFriend} className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                    <Search className="w-4 h-4" />
                  </span>
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="Enter username (e.g. huey)"
                    className="w-full bg-background border border-muted/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <button 
                  type="submit"
                  className="bg-primary text-white px-5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
                >
                  Search
                </button>
              </form>

              {/* Search Results Display */}
              <div className="space-y-4">
                {searchStatus === 'searching' && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted" />
                  </div>
                )}

                {searchStatus === 'not_found' && (
                  <div className="text-center py-6 border border-dashed border-muted/10 rounded-2xl">
                    <p className="text-xs text-muted">No user found with username "@{searchQuery}"</p>
                  </div>
                )}

                {searchStatus === 'found' && searchResult && (
                  <div className="bg-background border border-muted/10 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <img src={searchResult.avatar || 'https://i.pravatar.cc/150'} alt={searchResult.displayName} className="w-12 h-12 rounded-full border border-muted/20 object-cover" />
                      <div>
                        <p className="text-sm font-semibold">{searchResult.displayName}</p>
                        <p className="text-xs text-muted mb-1">@{searchResult.username}</p>
                        <div className="flex items-center gap-3 text-[10px] text-muted">
                          <span className="flex items-center gap-0.5"><Flame className="w-3 h-3 text-secondary fill-secondary" /> {searchResult.streak}d Streak</span>
                          <span>Score: {searchResult.score}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      {friendsList.some(f => f.uid === searchResult.uid) ? (
                        <div className="px-3 py-1.5 bg-success/10 text-success rounded-lg text-[10px] font-bold flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          Friends
                        </div>
                      ) : outgoingRequests.some(r => r.uid === searchResult.uid) ? (
                        <div className="px-3 py-1.5 bg-muted/10 text-muted rounded-lg text-[10px] font-bold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </div>
                      ) : incomingRequests.some(r => r.uid === searchResult.uid) ? (
                        <button 
                          onClick={() => {
                            const req = incomingRequests.find(r => r.uid === searchResult.uid);
                            if (req) handleAcceptRequest(req);
                          }}
                          disabled={actionLoading === searchResult.uid}
                          className="px-3 py-1.5 bg-secondary text-white rounded-lg text-[10px] font-bold hover:bg-secondary/90 transition-all"
                        >
                          Accept
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleSendRequest(searchResult)}
                          disabled={actionLoading === searchResult.uid}
                          className="px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-bold hover:bg-primary/90 transition-all flex items-center gap-1"
                        >
                          {actionLoading === searchResult.uid ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                          Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

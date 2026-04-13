import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Zap, Flame, Trophy, ChevronRight, Activity, Leaf, Crown, User as UserIcon, Share2, Loader2, Sparkles, Bookmark, TrendingUp, ArrowUpRight } from 'lucide-react';
import { User } from 'firebase/auth';
import { UserStats } from '../types';
import html2canvas from 'html2canvas';

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

  // Prepare leaderboard data
  const currentUserData = {
    name: user?.displayName || 'You',
    streak: currentStreak,
    score: 85, // Mock score for now
    avatar: user?.photoURL || '',
    isCurrentUser: true
  };

  const sortedLeaderboard = [...MOCK_LEADERBOARD, currentUserData]
    .sort((a, b) => b.streak - a.streak);

  const top3 = sortedLeaderboard.slice(0, 3);
  const userRank = sortedLeaderboard.findIndex(item => item.isCurrentUser) + 1;
  const isUserInTop3 = userRank <= 3;

  const handleShareToIG = async () => {
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
      
      if (navigator.share) {
        const blob = await (await fetch(image)).blob();
        const file = new File([blob], 'my-metabolic-stats.png', { type: 'image/png' });
        
        await navigator.share({
          files: [file],
          title: 'My Metabolic Stats',
          text: 'Check out my metabolic progress on Frictionless AI!',
        });
      } else {
        // Fallback: Download the image
        const link = document.createElement('a');
        link.download = 'frictionless-stats.png';
        link.href = image;
        link.click();
      }
    } catch (error) {
      console.error('Failed to generate story image:', error);
    } finally {
      setIsGenerating(false);
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
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {/* Background Accents */}
          <div className="absolute top-[-200px] right-[-200px] w-[800px] h-[800px] rounded-full blur-[150px]" style={{ backgroundColor: 'rgba(94, 109, 98, 0.2)' }} />
          <div className="absolute bottom-[-200px] left-[-200px] w-[800px] h-[800px] rounded-full blur-[150px]" style={{ backgroundColor: 'rgba(26, 26, 26, 0.2)' }} />
          
          {/* Logo & Header */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8">
              <div className="w-12 h-12 bg-black rounded-full" />
            </div>
            <h2 className="text-4xl font-bold tracking-tighter uppercase mb-2">Frictionless AI</h2>
            <p className="text-xl uppercase tracking-[0.2em]" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Metabolic Protocol</p>
          </div>

          {/* Main Stats Card */}
          <div className="relative z-10 rounded-[60px] p-16 flex flex-col items-center text-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div className="mb-12">
              <p className="text-2xl font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Metabolic Score</p>
              <h1 className="text-[180px] font-black leading-none text-secondary">94</h1>
              <p className="text-3xl font-bold mt-4" style={{ color: 'rgba(94, 109, 98, 0.6)' }}>Top 5% Globally</p>
            </div>

            <div className="grid grid-cols-2 gap-12 w-full">
              <div className="rounded-[40px] p-10" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                <Flame className="w-16 h-16 text-secondary fill-secondary mx-auto mb-4" />
                <p className="text-5xl font-bold">{currentStreak}</p>
                <p className="text-xl font-bold uppercase mt-2" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Day Streak</p>
              </div>
              <div className="rounded-[40px] p-10" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                <Trophy className="w-16 h-16 text-accent mx-auto mb-4" />
                <p className="text-5xl font-bold">#{userRank}</p>
                <p className="text-xl font-bold uppercase mt-2" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Rank</p>
              </div>
            </div>
          </div>

          {/* AI Meal Highlight */}
          <div className="relative z-10">
            <div className="flex items-center gap-6 mb-8">
              <Sparkles className="w-12 h-12 text-secondary" />
              <h3 className="text-4xl font-bold">Today's Protocol</h3>
            </div>
            <div className="rounded-[40px] p-12" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <p className="text-2xl font-bold text-secondary mb-2">Wild Salmon & Asparagus</p>
              <p className="text-xl leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                Optimized for microbiome diversity and metabolic efficiency.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 flex justify-between items-center pt-12" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div>
              <p className="text-2xl font-bold">{user?.displayName || 'Metabolic Pioneer'}</p>
              <p className="text-xl" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>frictionless.ai</p>
            </div>
            <div className="bg-secondary text-black px-8 py-4 rounded-full text-xl font-black uppercase">
              Join the Protocol
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="mb-12 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full border-2 border-muted/20 p-1 bg-surface shadow-sm">
          {user?.photoURL ? (
            <img 
              src={user.photoURL} 
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
            Hello, <span className="text-primary">{user?.displayName?.split(' ')[0] || 'Guest'}</span>
          </h1>
          <p className="text-muted text-sm">Your metabolic health at a glance.</p>
        </div>
      </header>

      {/* Streak & PB Widget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-surface border border-muted/10 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                <Flame className={`w-6 h-6 ${currentStreak > 0 ? 'text-secondary fill-secondary' : 'text-muted'}`} />
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
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Metabolic Score</p>
              <p className="text-3xl font-medium">94/100</p>
            </div>
          </div>
          <div className="h-3 w-full bg-muted/10 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-accent w-[94%]" />
          </div>
          
          <button 
            onClick={handleShareToIG}
            disabled={isGenerating}
            className="w-full py-3 bg-gradient-to-r from-secondary to-accent text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all disabled:opacity-70"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            {isGenerating ? 'Generating Story...' : 'Share Stats to IG'}
          </button>
        </div>
      </div>

      {/* Friend Leaderboard */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Friend Streaks</h3>
          <button className="text-xs font-bold uppercase tracking-widest text-secondary hover:underline">View All</button>
        </div>
        
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
                    <p className="text-[10px] text-muted uppercase tracking-widest">Diet Score: <span className="font-bold text-primary">{friend.score}</span></p>
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
                    <p className="text-[10px] text-muted uppercase tracking-widest">Diet Score: <span className="font-bold text-primary">{currentUserData.score}</span></p>
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
              value: '+12%', 
              pastValue: '+4%',
              icon: Leaf, 
              color: 'text-success',
              description: 'Increased plant variety from 12 to 28 species. Your gut microbiome is showing higher resilience and metabolic flexibility.',
              metric: 'Species Count'
            },
            { 
              title: 'Average Daily Fiber', 
              value: '42g', 
              pastValue: '22g',
              icon: Activity, 
              color: 'text-secondary',
              description: 'Significant shift from processed grains to whole legumes and tubers. This is supporting better blood glucose stability.',
              metric: 'Grams/Day'
            },
            { 
              title: 'Metabolic Efficiency', 
              value: 'High', 
              pastValue: 'Moderate',
              icon: Zap, 
              color: 'text-accent',
              description: 'Improved insulin sensitivity through consistent protein-pacing and optimized meal timing.',
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
                  <div className={`w-12 h-12 rounded-xl bg-background flex items-center justify-center ${insight.color} group-hover:scale-110 transition-transform`}>
                    <insight.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-semibold block">{insight.title}</span>
                    <span className="text-[10px] text-muted uppercase tracking-widest font-bold">Metabolic Indicator</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={`text-lg font-bold block ${insight.color}`}>{insight.value}</span>
                    <div className="flex items-center gap-1 justify-end">
                      <TrendingUp className="w-3 h-3 text-success" />
                      <span className="text-[10px] text-success font-bold">Improving</span>
                    </div>
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
                        <button className="text-[10px] font-bold text-secondary uppercase tracking-widest hover:underline">View Full Report</button>
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

      {/* Extra spacer to ensure content clears the bottom nav bar completely */}
      <div className="h-20" />
    </motion.div>
  );
}

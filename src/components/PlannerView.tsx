import { useState, useRef, ChangeEvent, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { Camera, Check, ShoppingCart, Loader2, ChevronRight, Info, X, Zap, Activity, Leaf, Bookmark, Trash2, LogIn, Share2, Flame, Trophy } from 'lucide-react';
import { DietPlanResponse, UserPreferences, UserStats } from '../types';
import * as firebaseService from '../services/firebaseService';
import { generateDietPlan } from '../services/geminiService';
import { User } from 'firebase/auth';

type AppState = 'idle' | 'loading' | 'results';
type CheckoutStatus = 'idle' | 'processing' | 'success';

interface PlannerViewProps {
  user: User | null;
  stats: UserStats | null;
  savedPlans: any[];
  onFetchSavedPlans: (uid: string) => void;
  onUpdateStats: (stats: UserStats) => void;
  onSignIn: () => void;
}

export default function PlannerView({ 
  user, 
  stats, 
  savedPlans, 
  onFetchSavedPlans, 
  onUpdateStats,
  onSignIn 
}: PlannerViewProps) {
  const location = useLocation();
  const [state, setState] = useState<AppState>('idle');
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>('idle');
  const [dietGoal, setDietGoal] = useState<string>('Maintenance');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [favoriteCuisine, setFavoriteCuisine] = useState<string>('Mediterranean');
  const [age, setAge] = useState<number>(30);
  const [weight, setWeight] = useState<number>(75);
  const [height, setHeight] = useState<number>(175);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'active' | 'athlete'>('light');
  const [exerciseDuration, setExerciseDuration] = useState<number>(30);
  const [exerciseIntensity, setExerciseIntensity] = useState<'low' | 'moderate' | 'high'>('moderate');
  const [microbiomeTarget, setMicrobiomeTarget] = useState<boolean>(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dietPlan, setDietPlan] = useState<DietPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<{
    day: string;
    meal: {
      type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
      name: string;
      description: string;
      recipe?: string;
      ingredients?: string[];
    }
  } | null>(null);
  const [instacartUrl, setInstacartUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [forkedPlan, setForkedPlan] = useState<DietPlanResponse | null>(null);

  // Handle Forking
  useEffect(() => {
    const plan = (location.state as any)?.forkedPlan;
    if (plan) {
      setForkedPlan(plan);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.state]);

  const handleSharePlan = async () => {
    if (!user) {
      onSignIn();
      return;
    }
    if (!dietPlan) return;
    setIsSharing(true);
    try {
      const shareId = await firebaseService.shareMealPlan(user.uid, dietPlan);
      const shareUrl = `${window.location.origin}/plan/${shareId}`;
      await navigator.clipboard.writeText(shareUrl);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to share plan:", error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleSavePlan = async () => {
    if (!user) {
      onSignIn();
      return;
    }
    if (!dietPlan) return;

    setIsSaving(true);
    try {
      await firebaseService.saveMealPlan(user.uid, dietPlan);
      setSaveSuccess(true);
      onFetchSavedPlans(user.uid);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save plan:", error);
      setError("Failed to save plan. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!user) return;
    try {
      await firebaseService.deletePlan(user.uid, planId);
      onFetchSavedPlans(user.uid);
    } catch (error) {
      console.error("Failed to delete plan:", error);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setTimeout(() => startAnalysis(file, base64), 500);
      };
      reader.readAsDataURL(file);
    }
  };

  const tdee = useMemo(() => {
    const bmr = (10 * weight) + (6.25 * height) - (5 * age) + (gender === 'male' ? 5 : -161);
    const factors = { sedentary: 1.2, light: 1.375, active: 1.55, athlete: 1.725 };
    const baseTdee = bmr * factors[activityLevel];
    const intensityMultipliers = { low: 3.5, moderate: 7.0, high: 10.5 };
    const exerciseKcal = exerciseDuration * intensityMultipliers[exerciseIntensity];
    return Math.round(baseTdee + exerciseKcal);
  }, [weight, height, age, gender, activityLevel, exerciseDuration, exerciseIntensity]);

  const startAnalysis = async (file: File, base64Image: string) => {
    setState('loading');
    setError(null);
    const userPreferences: UserPreferences = {
      dietGoal, dietaryRestrictions, favoriteCuisine, age, weight, height, gender,
      activityLevel, exerciseDuration, exerciseIntensity, tdee, microbiomeTarget
    };
    try {
      const { plan, instacartUrl: url } = await generateDietPlan(base64Image, userPreferences, forkedPlan || undefined);
      setDietPlan(plan);
      setInstacartUrl(url);
      setState('results');
      setForkedPlan(null);
      if (user) {
        const newStats = await firebaseService.updateUserStreak(user.uid);
        onUpdateStats(newStats as UserStats);
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      setState('idle');
      setError(error instanceof Error ? error.message : "An unexpected error occurred during analysis.");
    }
  };

  const toggleRestriction = (restriction: string) => {
    setDietaryRestrictions(prev => prev.includes(restriction) ? prev.filter(r => r !== restriction) : [...prev, restriction]);
  };

  const resetApp = () => {
    setState('idle');
    setCheckoutStatus('idle');
    setImagePreview(null);
    setDietPlan(null);
    setError(null);
    setSelectedMeal(null);
    setInstacartUrl(null);
  };

  const handleCheckout = () => {
    setCheckoutStatus('processing');
    setTimeout(() => setCheckoutStatus('success'), 2500);
  };

  return (
    <div className="pb-32 relative">
      {/* Saved Plans Trigger */}
      {user && (
        <button 
          onClick={() => setShowSavedPlans(true)}
          className="fixed top-24 right-6 z-30 bg-surface/80 backdrop-blur-md border border-muted/10 p-3 rounded-2xl shadow-lg hover:scale-105 transition-all group"
          title="View Saved Protocols"
        >
          <Bookmark className="w-5 h-5 text-primary group-hover:fill-primary transition-all" />
          {savedPlans.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-secondary text-white text-[8px] font-bold flex items-center justify-center rounded-full border-2 border-surface">
              {savedPlans.length}
            </span>
          )}
        </button>
      )}

      <main className="max-w-7xl mx-auto w-full px-6 md:px-12">
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.section
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-12 md:mt-24 max-w-3xl mx-auto text-center"
            >
              {forkedPlan && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-accent/10 border border-accent/20 rounded-2xl p-6 mb-12 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Recalibration Mode</p>
                      <p className="text-sm text-primary">Adapting <b>{forkedPlan.protocolName}</b> for your body.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setForkedPlan(null)}
                    className="text-xs font-bold uppercase tracking-widest text-muted hover:text-error transition-colors"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
              <h1 className="text-5xl md:text-7xl font-medium leading-tight mb-6">
                Good morning. <br />
                <span className="text-muted">Let's see what we're working with.</span>
              </h1>
              
              <p className="text-muted text-lg mb-12 max-w-xl mx-auto">
                Upload a photo of your fridge or pantry. Our AI will craft a clinical-grade meal plan based on your unique biology and current inventory.
              </p>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-error/10 border border-error/20 rounded-xl p-4 mb-8 text-error text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Info className="w-4 h-4" />
                  {error}
                </motion.div>
              )}

              {/* Personalization Panel */}
              <div className="max-w-2xl mx-auto mb-16 text-left bg-surface border border-muted/10 rounded-xl p-8 shadow-sm">
                <div className="space-y-10">
                  {/* Diet Goal */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-muted mb-4 block">Primary Health Goal</label>
                    <div className="flex flex-wrap gap-3">
                      {['Muscle Building', 'Weight Loss', 'Weight Gain', 'Maintenance'].map((goal) => (
                        <button
                          key={goal}
                          onClick={() => setDietGoal(goal)}
                          className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                            dietGoal === goal
                              ? 'bg-primary text-white shadow-md'
                              : 'bg-background text-muted hover:bg-muted/10'
                          }`}
                        >
                          {goal}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dietary Restrictions */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-muted mb-4 block">Dietary Restrictions</label>
                    <div className="flex flex-wrap gap-2">
                      {['Vegan', 'Keto', 'Gluten-Free', 'Dairy-Free', 'Paleo', 'Low Carb'].map((diet) => (
                        <button
                          key={diet}
                          onClick={() => toggleRestriction(diet)}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                            dietaryRestrictions.includes(diet)
                              ? 'bg-secondary/10 border-secondary text-secondary'
                              : 'bg-transparent border-muted/20 text-muted hover:border-muted/40'
                          }`}
                        >
                          {diet}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Favorite Cuisine */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-muted mb-4 block">Preferred Cuisine</label>
                    <div className="relative">
                      <select
                        value={favoriteCuisine}
                        onChange={(e) => setFavoriteCuisine(e.target.value)}
                        className="w-full bg-background border border-muted/20 rounded-lg px-4 py-3 text-sm font-medium appearance-none focus:outline-none focus:border-secondary transition-colors cursor-pointer"
                      >
                        {['Mediterranean', 'Italian', 'Mexican', 'Indian', 'Japanese', 'Thai', 'French'].map((cuisine) => (
                          <option key={cuisine} value={cuisine}>{cuisine}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronRight className="w-4 h-4 text-muted rotate-90" />
                      </div>
                    </div>
                  </div>

              {/* Gamification Widget */}
              {user && stats && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-surface border border-muted/10 rounded-2xl p-6 shadow-sm flex items-center gap-6 mb-12"
                >
                  <div className="flex items-center gap-4 border-r border-muted/10 pr-6">
                    <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center relative">
                      <Flame className={`w-6 h-6 ${stats.currentStreak > 0 ? 'text-secondary fill-secondary' : 'text-muted'}`} />
                      {stats.currentStreak > 0 && (
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-secondary rounded-full border-2 border-surface flex items-center justify-center text-[8px] font-bold text-white"
                        >
                          {stats.currentStreak}
                        </motion.div>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Current Streak</p>
                      <p className="text-xl font-medium">{stats.currentStreak} Days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Longest Streak</p>
                      <p className="text-xl font-medium">{stats.longestStreak} Days</p>
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-success bg-success/5 px-3 py-1.5 rounded-full">
                    <Zap className="w-3 h-3" />
                    Metabolic Elite
                  </div>
                </motion.div>
              )}

              {/* Metabolic Profile */}
                  <div className="pt-6 border-t border-muted/10">
                    <div className="flex items-center gap-2 mb-6">
                      <Zap className="w-4 h-4 text-secondary" />
                      <h3 className="text-sm font-bold uppercase tracking-widest">Metabolic Profile</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-muted mb-2 block">Age</label>
                        <input 
                          type="number" 
                          value={age} 
                          onChange={(e) => setAge(Number(e.target.value))}
                          className="w-full bg-background border border-muted/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-muted mb-2 block">Weight (kg)</label>
                        <input 
                          type="number" 
                          value={weight} 
                          onChange={(e) => setWeight(Number(e.target.value))}
                          className="w-full bg-background border border-muted/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-muted mb-2 block">Height (cm)</label>
                        <input 
                          type="number" 
                          value={height} 
                          onChange={(e) => setHeight(Number(e.target.value))}
                          className="w-full bg-background border border-muted/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-muted mb-2 block">Gender</label>
                        <select 
                          value={gender} 
                          onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                          className="w-full bg-background border border-muted/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-6">
                      <label className="text-[10px] font-bold uppercase text-muted mb-2 block">Lifestyle Activity Level</label>
                      <select 
                        value={activityLevel} 
                        onChange={(e) => setActivityLevel(e.target.value as any)}
                        className="w-full bg-background border border-muted/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary"
                      >
                        <option value="sedentary">Sedentary (Office job, little exercise)</option>
                        <option value="light">Light (1-3 days/week exercise)</option>
                        <option value="active">Active (3-5 days/week exercise)</option>
                        <option value="athlete">Athlete (6-7 days/week intense exercise)</option>
                      </select>
                    </div>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-muted mb-2 block">Daily Exercise (min)</label>
                        <input 
                          type="number" 
                          value={exerciseDuration} 
                          onChange={(e) => setExerciseDuration(Number(e.target.value))}
                          className="w-full bg-background border border-muted/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-muted mb-2 block">Exercise Intensity</label>
                        <select 
                          value={exerciseIntensity} 
                          onChange={(e) => setExerciseIntensity(e.target.value as any)}
                          className="w-full bg-background border border-muted/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary"
                        >
                          <option value="low">Low (Walking, Yoga)</option>
                          <option value="moderate">Moderate (Jogging, Cycling)</option>
                          <option value="high">High (HIIT, Heavy Lifting)</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-8 bg-background/50 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-muted">Calculated TDEE</p>
                        <p className="text-xl font-medium">{tdee} <span className="text-xs text-muted">kcal/day</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-muted">Mifflin-St Jeor</p>
                        <p className="text-[10px] text-muted italic">Clinical Precision</p>
                      </div>
                    </div>
                  </div>

                  {/* Microbiome Optimization */}
                  <div className="pt-6 border-t border-muted/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                        <Leaf className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest">Microbiome Target</h3>
                        <p className="text-xs text-muted">Optimize for gut health & plant diversity</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setMicrobiomeTarget(!microbiomeTarget)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${microbiomeTarget ? 'bg-success' : 'bg-muted/30'}`}
                    >
                      <motion.div 
                        animate={{ x: microbiomeTarget ? 24 : 4 }}
                        className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Scan Area */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="bg-surface border-2 border-dashed border-muted/30 rounded-xl p-12 mb-12 transition-all hover:border-secondary group cursor-pointer relative overflow-hidden"
              >
                {imagePreview ? (
                  <div className="relative aspect-video w-full max-w-md mx-auto rounded-lg overflow-hidden shadow-lg">
                    <img src={imagePreview} alt="Fridge Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <p className="text-white font-medium">Image Captured</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Camera className="w-8 h-8 text-secondary" />
                    </div>
                    <div>
                      <p className="text-lg font-medium">Scan your fridge</p>
                      <p className="text-sm text-muted">Drag and drop or click to upload</p>
                    </div>
                  </div>
                )}
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange}
                  accept="image/*"
                />
              </div>

              {/* Vitality Indicators */}
              <div className="mt-24 flex flex-wrap justify-center gap-12 border-t border-muted/10 pt-12">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  <span className="text-xs font-medium uppercase tracking-tighter text-muted">AI Readiness</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-success rounded-full" />
                  <span className="text-xs font-medium uppercase tracking-tighter text-muted">Nutritional Sync</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-success rounded-full" />
                  <span className="text-xs font-medium uppercase tracking-tighter text-muted">Clinical Database</span>
                </div>
              </div>
            </motion.section>
          )}

          {state === 'loading' && (
            <motion.section
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-32 flex flex-col items-center text-center"
            >
              <div className="relative w-32 h-32 mb-12">
                <motion.div 
                  className="absolute inset-0 border-4 border-secondary/20 rounded-full"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-secondary animate-spin" />
                </div>
              </div>
              <h2 className="text-3xl font-medium mb-4">Analyzing Inventory</h2>
              <p className="text-muted max-w-sm">
                Our clinical engine is identifying ingredients and cross-referencing with your dietary protocol...
              </p>
              
              {/* Skeleton Loader */}
              <div className="mt-16 w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-surface rounded-xl p-6 h-64 animate-pulse">
                    <div className="w-1/2 h-4 bg-muted/10 rounded mb-4" />
                    <div className="w-full h-32 bg-muted/5 rounded mb-4" />
                    <div className="w-3/4 h-4 bg-muted/10 rounded" />
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {state === 'results' && dietPlan && (
            <motion.section
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12"
            >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-secondary/10 text-secondary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Clinical Protocol V2</div>
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={handleSavePlan}
                        disabled={isSaving || saveSuccess}
                        className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all min-w-[120px] ${
                          saveSuccess ? 'text-success' : 'text-muted hover:text-primary'
                        }`}
                      >
                        {isSaving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Bookmark className={`w-3 h-3 transition-transform ${saveSuccess ? 'fill-success scale-110' : 'group-hover:scale-110'}`} />
                        )}
                        <span>{saveSuccess ? 'Saved' : 'Save Plan'}</span>
                      </button>
                      <button 
                        onClick={handleSharePlan}
                        disabled={isSharing || shareSuccess}
                        className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all min-w-[120px] ${
                          shareSuccess ? 'text-accent' : 'text-muted hover:text-primary'
                        }`}
                      >
                        {isSharing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Share2 className={`w-3 h-3 transition-transform ${shareSuccess ? 'scale-110' : 'group-hover:scale-110'}`} />
                        )}
                        <span>{shareSuccess ? 'Copied' : 'Share & Fork'}</span>
                      </button>
                    </div>
                  </div>
                  <h2 className="text-5xl font-medium">{dietPlan.protocolName}</h2>
                  <p className="text-muted mt-4 max-w-2xl">{dietPlan.analysisSummary}</p>
                </div>
                <button 
                  onClick={resetApp}
                  className="text-sm font-medium text-muted hover:text-primary flex items-center gap-1"
                >
                  Start new scan <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Health Scorecard */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className="bg-surface border border-muted/10 rounded-2xl p-8 flex items-center gap-6 shadow-sm">
                  <div className="w-16 h-16 rounded-full border-4 border-secondary flex items-center justify-center relative">
                    <Activity className="w-6 h-6 text-secondary" />
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/5" />
                      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="175" strokeDashoffset="40" className="text-secondary" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Daily Fiber Target</p>
                    <p className="text-2xl font-medium">Achieved <span className="text-secondary">({dietPlan.healthMetrics.dailyFiber})</span></p>
                    <p className="text-xs text-muted mt-1">Optimized for microbiome motility</p>
                  </div>
                </div>
                <div className="bg-surface border border-muted/10 rounded-2xl p-8 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Plant Diversity Score</p>
                      <p className="text-2xl font-medium">{dietPlan.healthMetrics.uniquePlantsUsed.length} <span className="text-muted text-sm">Unique Species</span></p>
                    </div>
                    <div className="bg-success/10 text-success text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Optimal</div>
                  </div>
                  
                  {/* Dynamic Plant Cloud */}
                  <div className="flex-1 flex flex-wrap gap-2 content-start overflow-y-auto scrollbar-thin pr-2 max-h-32 mb-6">
                    {dietPlan.healthMetrics.uniquePlantsUsed.map((plant, i) => {
                      const sizes = ['text-[10px]', 'text-[11px]', 'text-[12px]'];
                      const colors = [
                        'bg-success/5 text-success border-success/10', 
                        'bg-secondary/5 text-secondary border-secondary/10', 
                        'bg-accent/5 text-accent border-accent/10', 
                        'bg-primary/5 text-primary border-primary/10'
                      ];
                      const size = sizes[i % sizes.length];
                      const color = colors[(i * 7) % colors.length];
                      
                      return (
                        <motion.span 
                          key={i}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.5 + (i * 0.03) }}
                          className={`${size} ${color} px-2.5 py-1 rounded-full font-medium border whitespace-nowrap`}
                        >
                          {plant}
                        </motion.span>
                      );
                    })}
                  </div>

                  {/* Diversity Index Bar */}
                  <div className="mt-auto pt-4 border-t border-muted/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold uppercase text-muted tracking-widest">Microbiome Diversity Index</span>
                      <span className="text-[10px] font-bold text-success uppercase tracking-widest">Target: 15+</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((dietPlan.healthMetrics.uniquePlantsUsed.length / 20) * 100, 100)}%` }}
                        transition={{ duration: 1, delay: 1 }}
                        className="h-full bg-success"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Dynamic Meal Plan Cards */}
                {dietPlan.mealPlan.map((plan, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-surface rounded-xl p-8 shadow-sm border border-muted/5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-8">
                      <span className="text-xs font-bold uppercase tracking-widest text-muted">{plan.day}</span>
                      <div className="flex items-center gap-1 text-xs text-muted">
                        <Info className="w-3 h-3" />
                        <span>{plan.calories} kcal</span>
                      </div>
                    </div>
                    <h3 className="text-2xl mb-6">{plan.title}</h3>
                    <ul className="space-y-4">
                      {plan.meals.map((meal, mIdx) => (
                        <li 
                          key={mIdx} 
                          onClick={() => setSelectedMeal({ day: plan.day, meal })}
                          className="flex items-start gap-3 group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-background transition-colors"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 group-hover:scale-150 transition-transform" />
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-muted uppercase tracking-tighter">{meal.type}</span>
                            <span className="text-sm text-primary font-medium group-hover:text-secondary transition-colors">{meal.name}</span>
                            <span className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">{meal.description}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>

              {/* Dynamic Grocery List Summary */}
              <div className="mt-16 bg-surface rounded-xl p-8 md:p-12 border border-muted/10">
                <div className="flex flex-col md:flex-row gap-12">
                  <div className="flex-1">
                    <h3 className="text-2xl mb-6">Missing Essentials</h3>
                    <p className="text-muted mb-8">We've identified {dietPlan.groceryList.length} items missing from your inventory to complete this protocol.</p>
                    <div className="grid grid-cols-2 gap-4">
                      {dietPlan.groceryList.map(item => (
                        <div key={item.id} className="flex items-center gap-2 text-sm text-muted">
                          <div className="w-1 h-1 bg-muted rounded-full" />
                          <span className="font-medium text-primary">{item.name}</span>
                          <span className="text-xs opacity-60">({item.quantity})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="w-full md:w-80 bg-background rounded-lg p-6 flex flex-col justify-center items-center text-center">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                      <ShoppingCart className="w-6 h-6 text-accent" />
                    </div>
                    <p className="text-sm font-medium mb-2">Instacart Integration</p>
                    <p className="text-xs text-muted mb-6">Estimated delivery: 45 mins</p>
                    
                    {checkoutStatus === 'success' ? (
                      <div className="w-full py-3 bg-success/10 text-success border border-success/20 rounded-lg text-xs font-bold px-2">
                        Order Placed Successfully! (Simulated for V1 Prototype)
                      </div>
                    ) : (
                      <button 
                        onClick={handleCheckout}
                        disabled={checkoutStatus === 'processing'}
                        className="w-full py-3 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {checkoutStatus === 'processing' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Building Cart...
                          </>
                        ) : (
                          'Send Missing Items to Instacart'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Saved Plans Modal */}
      <AnimatePresence>
        {showSavedPlans && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSavedPlans(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-surface rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-muted/10 flex justify-between items-center bg-background/50">
                <div>
                  <h3 className="text-xl font-medium">Saved Meal Plans</h3>
                  <p className="text-xs text-muted">Your personalized metabolic protocols</p>
                </div>
                <button 
                  onClick={() => setShowSavedPlans(false)}
                  className="w-8 h-8 rounded-full bg-background flex items-center justify-center hover:bg-muted/10 transition-colors"
                >
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-thin p-8">
                {!user ? (
                  <div className="text-center py-20">
                    <LogIn className="w-12 h-12 text-muted mx-auto mb-4" />
                    <h4 className="text-lg font-medium mb-2">Sign in to view saved plans</h4>
                    <p className="text-sm text-muted mb-8">Securely store and access your metabolic protocols anywhere.</p>
                    <button onClick={onSignIn} className="bg-primary text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors">
                      Sign In with Google
                    </button>
                  </div>
                ) : savedPlans.length === 0 ? (
                  <div className="text-center py-20">
                    <Bookmark className="w-12 h-12 text-muted mx-auto mb-4" />
                    <h4 className="text-lg font-medium mb-2">No saved plans yet</h4>
                    <p className="text-sm text-muted">Generate and save your first plan to see it here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {savedPlans.map((plan) => (
                      <div key={plan.id} className="bg-background border border-muted/10 rounded-xl p-6 relative group">
                        <button 
                          onClick={() => handleDeletePlan(plan.id)}
                          className="absolute top-4 right-4 p-2 text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="mb-4">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                            {new Date(plan.createdAt).toLocaleDateString()}
                          </span>
                          <h4 className="text-lg font-medium mt-1">{plan.protocolName}</h4>
                        </div>
                        <div className="flex items-center gap-4 mb-6">
                          <div className="flex items-center gap-1">
                            <Leaf className="w-3 h-3 text-success" />
                            <span className="text-xs text-muted">{plan.healthMetrics.uniquePlantsUsed.length} Plants</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="w-3 h-3 text-secondary" />
                            <span className="text-xs text-muted">{plan.healthMetrics.dailyFiber} Fiber</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setDietPlan(plan);
                            setState('results');
                            setShowSavedPlans(false);
                          }}
                          className="w-full py-2 bg-muted/5 hover:bg-muted/10 text-primary text-sm font-medium rounded-lg transition-colors"
                        >
                          View Protocol
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Meal Detail Modal */}
      <AnimatePresence>
        {selectedMeal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMeal(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-surface rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-muted/10 flex justify-between items-center bg-background/50">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{selectedMeal.day} • {selectedMeal.meal.type}</span>
                  <h3 className="text-xl font-medium">{selectedMeal.meal.name}</h3>
                </div>
                <button 
                  onClick={() => setSelectedMeal(null)}
                  className="w-8 h-8 rounded-full bg-background flex items-center justify-center hover:bg-muted/10 transition-colors"
                >
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-thin p-8 space-y-8">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Description</h4>
                  <p className="text-sm text-primary leading-relaxed">{selectedMeal.meal.description}</p>
                </div>

                {selectedMeal.meal.ingredients && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Ingredients</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedMeal.meal.ingredients.map((ing, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-1 h-1 bg-secondary rounded-full" />
                          <span>{ing}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedMeal.meal.recipe && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Preparation</h4>
                    <div className="bg-background/50 rounded-xl p-6 border border-muted/5">
                      <p className="text-sm text-primary leading-relaxed whitespace-pre-line">
                        {selectedMeal.meal.recipe}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-muted/10 bg-background/50 flex justify-end">
                <button 
                  onClick={() => setSelectedMeal(null)}
                  className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sticky Footer Action */}
      <AnimatePresence>
        {state === 'results' && (
          <motion.footer
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-32 left-4 right-4 bg-surface/90 backdrop-blur-xl border border-muted/20 py-4 px-6 rounded-3xl z-40 shadow-2xl"
          >
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="hidden md:block">
                <p className="text-sm font-medium tracking-tight">Protocol Ready</p>
                <p className="text-[10px] text-muted uppercase tracking-widest font-bold">{dietPlan?.groceryList.length} items identified</p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                {checkoutStatus === 'success' ? (
                  <div className="flex-1 md:flex-none px-6 py-3 bg-success text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-success/20">
                    <Check className="w-4 h-4" />
                    Order Placed
                  </div>
                ) : (
                  <button 
                    onClick={handleCheckout}
                    disabled={checkoutStatus === 'processing'}
                    className="flex-1 md:flex-none px-6 py-3 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                  >
                    {checkoutStatus === 'processing' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-4 h-4" />
                    )}
                    {checkoutStatus === 'processing' ? 'Processing...' : 'Instacart'}
                  </button>
                )}
                
                <div className="flex gap-2 flex-1 md:flex-none">
                  <button 
                    onClick={handleSavePlan}
                    disabled={isSaving || saveSuccess}
                    className={`flex-1 md:flex-none px-5 py-3 border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 min-w-[100px] active:scale-[0.98] ${
                      saveSuccess 
                        ? 'bg-success/10 border-success/30 text-success' 
                        : 'bg-background/50 border-muted/20 hover:bg-background text-primary'
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bookmark className={`w-4 h-4 transition-transform ${saveSuccess ? 'fill-success scale-110' : ''}`} />
                    )}
                    <span>{saveSuccess ? 'Saved' : 'Save'}</span>
                  </button>
                  
                  <button 
                    onClick={handleSharePlan}
                    disabled={isSharing || shareSuccess}
                    className={`flex-1 md:flex-none px-5 py-3 border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 min-w-[100px] active:scale-[0.98] ${
                      shareSuccess 
                        ? 'bg-accent/10 border-accent/30 text-accent' 
                        : 'bg-background/50 border-muted/20 hover:bg-background text-primary'
                    }`}
                  >
                    {isSharing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Share2 className={`w-4 h-4 transition-transform ${shareSuccess ? 'fill-accent scale-110' : ''}`} />
                    )}
                    <span>{shareSuccess ? 'Copied' : 'Fork'}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Loader2, Activity, Leaf, Info, Zap, ChevronRight, Share2 } from 'lucide-react';
import * as firebaseService from '../services/firebaseService';
import { DietPlanResponse } from '../types';

export default function SharedPlanView() {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<DietPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!shareId) return;
      try {
        const data = await firebaseService.getSharedPlan(shareId);
        if (data) {
          setPlan(data as any);
        } else {
          setError("Plan not found");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load shared plan");
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <Loader2 className="w-12 h-12 text-secondary animate-spin mb-4" />
        <p className="text-muted">Fetching shared protocol...</p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-6">
          <Info className="w-8 h-8 text-error" />
        </div>
        <h2 className="text-2xl font-medium mb-2">{error || "Plan not found"}</h2>
        <p className="text-muted mb-8">This shared link might have expired or is incorrect.</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-primary text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
        >
          Create Your Own Plan
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
            <span className="font-medium tracking-tight text-lg">Frictionless AI</span>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="text-sm font-medium text-muted hover:text-primary flex items-center gap-1"
          >
            Back to Dashboard <ChevronRight className="w-4 h-4" />
          </button>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <div className="bg-secondary/10 text-secondary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest mb-4 w-fit flex items-center gap-2">
            <Share2 className="w-3 h-3" />
            Shared Protocol
          </div>
          <h1 className="text-5xl font-medium mb-4">{plan.protocolName}</h1>
          <p className="text-muted max-w-2xl text-lg leading-relaxed">{plan.analysisSummary}</p>
        </motion.div>

        {/* Health Scorecard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-surface border border-muted/10 rounded-2xl p-8 flex items-center gap-6 shadow-sm">
            <div className="w-16 h-16 rounded-full border-4 border-secondary flex items-center justify-center relative">
              <Activity className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Daily Fiber Target</p>
              <p className="text-2xl font-medium">{plan.healthMetrics.dailyFiber}</p>
            </div>
          </div>
          <div className="bg-surface border border-muted/10 rounded-2xl p-8 flex items-center gap-6 shadow-sm">
            <div className="w-16 h-16 rounded-full border-4 border-success flex items-center justify-center relative">
              <Leaf className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Plant Diversity</p>
              <p className="text-2xl font-medium">{plan.healthMetrics.uniquePlantsUsed.length} Species</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-24">
          {plan.mealPlan.map((day, idx) => (
            <div key={idx} className="bg-surface rounded-xl p-8 shadow-sm border border-muted/5">
              <span className="text-xs font-bold uppercase tracking-widest text-muted mb-4 block">{day.day}</span>
              <h3 className="text-2xl mb-6">{day.title}</h3>
              <ul className="space-y-4">
                {day.meals.map((meal, mIdx) => (
                  <li key={mIdx} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-2" />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-muted uppercase tracking-tighter">{meal.type}</span>
                      <span className="text-sm text-primary font-medium">{meal.name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Viral Hook CTA */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-primary rounded-3xl p-12 text-center text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-secondary/20 to-transparent pointer-events-none" />
          <Zap className="w-12 h-12 text-secondary mx-auto mb-6" />
          <h2 className="text-4xl font-medium mb-4">Like this protocol?</h2>
          <p className="text-white/60 max-w-xl mx-auto mb-12 text-lg">
            We can adapt this exact plan for your specific body metrics, activity level, and dietary goals in seconds.
          </p>
          <button 
            onClick={() => navigate('/', { state: { forkedPlan: plan } })}
            className="bg-white text-primary px-12 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform flex items-center gap-3 mx-auto"
          >
            Adapt this plan for my body
            <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}

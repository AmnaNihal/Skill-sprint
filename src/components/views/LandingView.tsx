import React from 'react';
import { useApp } from '../../context/AppContext';
import { IsometricHeroArt } from '../common/IsometricHeroArt';
import {
  Sparkles, Shield, ArrowRight, CheckCircle2,
  FileSearch, Cpu, CheckSquare, BarChart3,
  Layers, Users, Lock, ChevronRight
} from 'lucide-react';

export const LandingView: React.FC = () => {
  const { setCurrentView } = useApp();

  return (
    <div className="min-h-screen bg-[#0b0914] text-slate-100 flex flex-col selection:bg-purple-500 selection:text-white relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="relative z-20 border-b border-purple-900/30 backdrop-blur-md bg-slate-950/60 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('landing')}>
            <img src="/logo.png" alt="SkillSprint AI" className="h-12 w-auto object-contain rounded-xl drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]" />
            <span className="hidden sm:inline-block ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
              v2.4 Enterprise
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-purple-300 transition">Core Features</a>
            <a href="#workflow" className="hover:text-purple-300 transition">6-Step Engine</a>
            <a href="#compliance" className="hover:text-purple-300 transition">Dual Validation</a>
            <a href="#demo" className="hover:text-purple-300 transition">Interactive Demo</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('auth')}
              className="px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white transition"
            >
              Sign In
            </button>
            <button
              onClick={() => setCurrentView('auth')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-purple-600/30 transition ring-1 ring-purple-400/30 flex items-center gap-2"
            >
              <span>Launch App</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-20 lg:pt-16 lg:pb-32 flex-1 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left Column: Copy & CTAs */}
        <div className="flex-1 max-w-2xl text-center lg:text-left space-y-6">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold shadow-inner">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span>Dual AI & Deterministic Rule Engine</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
            AI for Smarter{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300">
              Workforce Training
            </span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed font-normal">
            Automate onboarding curriculum generation, audit compliance against internal technical docs, and guarantee 100% role-aligned skills mastery with mathematical rigor.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
            <button
              onClick={() => setCurrentView('auth')}
              className="w-full sm:w-auto px-7 py-4 rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-base font-bold shadow-xl shadow-purple-600/40 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-3 ring-1 ring-purple-400/40"
            >
              <span>Explore Admin Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => setCurrentView('auth')}
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-purple-800/40 text-base font-semibold transition flex items-center justify-center gap-2 hover:border-purple-600/60"
            >
              <Users className="w-5 h-5 text-purple-400" />
              <span>Learner Experience</span>
            </button>
          </div>

          {/* Social Proof / Metrics */}
          <div className="pt-8 border-t border-purple-900/30 grid grid-cols-3 gap-6 text-left">
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white">96.8%</p>
              <p className="text-xs text-slate-400 mt-0.5">Validation Accuracy</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-purple-400">10x</p>
              <p className="text-xs text-slate-400 mt-0.5">Faster Onboarding</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">0%</p>
              <p className="text-xs text-slate-400 mt-0.5">Knowledge Gaps</p>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Isometric Pedestal Illustration */}
        <div className="flex-1 w-full max-w-xl flex items-center justify-center">
          <IsometricHeroArt />
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section id="features" className="relative z-10 border-t border-purple-900/30 bg-slate-950/70 py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-bold text-purple-400 uppercase tracking-widest">Enterprise Architecture</h2>
            <h3 className="text-3xl font-bold text-white tracking-tight">Purpose-Built for High-Growth Engineering Teams</h3>
            <p className="text-slate-400 text-sm">
              Replace fragile manual wikis with an automated knowledge ingestion pipeline and deterministic role requirement engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-purple-900/30 hover:border-purple-600/50 transition space-y-3 group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition">
                <FileSearch className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Document Pipeline</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ingest PDF, Markdown, OpenAPI specs, and Confluence pages through a 6-stage semantic chunking engine.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-purple-900/30 hover:border-purple-600/50 transition space-y-3 group">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Role Matrix</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Define granular competency rubrics, P1-P3 priorities, and mandatory security prerequisites per job title.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-purple-900/30 hover:border-purple-600/50 transition space-y-3 group">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center group-hover:bg-pink-600 group-hover:text-white transition">
                <Shield className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Dual Validation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Compare LLM synthesis against strict deterministic Python rule checks to flag discrepancies before sign-off.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-purple-900/30 hover:border-purple-600/50 transition space-y-3 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Audit & Analytics</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Monitor curriculum coverage trajectories, department pass rates, and export verified compliance reports.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

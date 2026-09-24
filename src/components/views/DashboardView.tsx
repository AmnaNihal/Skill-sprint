import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText, Layers, CheckCircle2, Shield,
  ArrowRight, Plus, Upload, Play, Sparkles,
  TrendingUp, Clock, AlertTriangle, ChevronRight, UserCheck
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { documents, requirements, plans, validationItems, setCurrentView, setUploadModalOpen, setPlanReviewModalOpen, setSelectedPlanId } = useApp();

  const totalDocs = documents.length;
  const totalRoles = 10;
  const totalPlans = plans.length;
  const validationScore = 96;

  const recentActivities = [
    { title: 'Doc DOC-001 ingested', time: '10 mins ago', desc: 'Chunking & metadata extraction complete' },
    { title: 'Plan generated for Alice Johnson', time: '1 hour ago', desc: '4 modules synthesized with 98% rule match' },
    { title: 'Deterministic rule engine pass', time: '3 hours ago', desc: 'Validated REQ-001..REQ-007 against SOC2 requirements' },
    { title: 'Approved Senior SRE Onboarding Plan', time: 'Yesterday', desc: 'Signed off by John Doe' },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/70 border border-purple-800/40 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Admin Management Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Enterprise Workforce Overview
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Knowledge base pipelines, deterministic requirement matrices, and verified onboarding synthesis in real time.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-purple-900/40 text-sm font-semibold transition"
            >
              <Upload className="w-4 h-4 text-purple-400" />
              Upload Doc
            </button>
            <button
              onClick={() => setCurrentView('generatePlan')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-purple-600/30 transition ring-1 ring-purple-400/30"
            >
              <Sparkles className="w-4 h-4" />
              Generate Plan
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setCurrentView('documents')}
          className="bg-slate-900/70 border border-purple-900/30 hover:border-purple-600/50 rounded-2xl p-5 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Total Ingested Docs</p>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">{totalDocs}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-900/20 text-xs">
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> 100% Parsed
            </span>
            <span className="text-slate-400 group-hover:text-purple-300 flex items-center gap-1 transition">
              Manage →
            </span>
          </div>
        </div>

        <div
          onClick={() => setCurrentView('matrix')}
          className="bg-slate-900/70 border border-purple-900/30 hover:border-purple-600/50 rounded-2xl p-5 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Configured Roles</p>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">{totalRoles}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-900/20 text-xs">
            <span className="text-purple-400 font-medium">32 Competencies</span>
            <span className="text-slate-400 group-hover:text-purple-300 flex items-center gap-1 transition">
              Matrix →
            </span>
          </div>
        </div>

        <div
          onClick={() => setCurrentView('planDetails')}
          className="bg-slate-900/70 border border-purple-900/30 hover:border-purple-600/50 rounded-2xl p-5 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Active Onboarding Plans</p>
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 group-hover:bg-pink-600 group-hover:text-white transition">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">{totalPlans}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-900/20 text-xs">
            <span className="text-emerald-400 font-medium">6 In Progress</span>
            <span className="text-slate-400 group-hover:text-purple-300 flex items-center gap-1 transition">
              Inspect →
            </span>
          </div>
        </div>

        <div
          onClick={() => setCurrentView('validation')}
          className="bg-slate-900/70 border border-purple-900/30 hover:border-purple-600/50 rounded-2xl p-5 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Validation Score</p>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">{validationScore}%</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-900/20 text-xs">
            <span className="text-slate-400 font-medium">Deterministic Rule Match</span>
            <span className="text-slate-400 group-hover:text-purple-300 flex items-center gap-1 transition">
              Audit →
            </span>
          </div>
        </div>
      </div>

      {/* Main Row: Recent Plans + Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Onboarding Plans */}
        <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl border border-purple-900/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Active Onboarding Pipelines</h2>
            <button
              onClick={() => setCurrentView('generatePlan')}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
            >
              + Create New
            </button>
          </div>

          <div className="divide-y divide-purple-900/20">
            {plans.map(p => (
              <div
                key={p.id}
                onClick={() => { setSelectedPlanId(p.id); setCurrentView('planDetails'); }}
                className="py-4 flex items-center justify-between gap-4 hover:bg-purple-950/20 px-2 rounded-xl transition cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    {p.employeeName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition">
                      {p.employeeName}
                    </h3>
                    <p className="text-xs text-slate-400">{p.roleTitle} • {p.department}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold text-purple-300">{p.progress}% Completed</p>
                    <div className="w-24 bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div className="bg-purple-500 h-full rounded-full" style={{ width: p.progress + '%' }} />
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {p.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-300" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Activity Stream & System Health */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/80 rounded-2xl border border-purple-900/30 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Activity Stream</h3>
            <div className="space-y-3">
              {recentActivities.map((act, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-purple-900/20">
                  <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-white">{act.title}</p>
                      <span className="text-[10px] text-slate-500">{act.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{act.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 rounded-2xl border border-purple-800/40 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Quick Action</span>
              <span className="text-xs text-emerald-400 font-semibold">1 Pending Review</span>
            </div>
            <h3 className="text-base font-bold text-white mb-2">Sign-Off Pending Onboarding Plans</h3>
            <p className="text-xs text-slate-300 mb-4">
              Review synthesized curriculum citations and deterministic validation scores before distributing to new hires.
            </p>
            <button
              onClick={() => setPlanReviewModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              Open Review Drawer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

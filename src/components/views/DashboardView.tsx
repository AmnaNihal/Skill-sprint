import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import {
  FileText, Layers, CheckCircle2, Shield,
  Sparkles, TrendingUp, ChevronRight, UserCheck, Upload, RefreshCw
} from 'lucide-react';

interface AdminDash {
  total_documents: number;
  approved_documents: number;
  total_roles: number;
  total_plans: number;
  total_requirements: number;
  mandatory_requirements: number;
  pending_reviews: number;
  flagged_items: number;
  total_employees: number;
  avg_coverage: number;
  plans_by_status: Record<string, number>;
}

interface PlanRow {
  id: string;
  employee_name: string;
  role_title: string;
  department?: string;
  status: string;
  progress: number;
  coverage_score?: number;
}

export const DashboardView: React.FC = () => {
  const { setUploadModalOpen, setPlanReviewModalOpen, addToast } = useApp();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminDash | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get<AdminDash>('/dashboard/admin'),
      api.get<PlanRow[]>('/plans'),
    ])
      .then(([s, p]) => {
        if (!alive) return;
        setStats(s);
        setPlans(p);
      })
      .catch(e => {
        if (alive) addToast(e instanceof Error ? e.message : 'Failed to load dashboard', 'error');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [addToast]);

  const recentActivities = [
    { title: 'Document ingestion pipeline ready', time: 'live', desc: 'PDF/DOCX parse → chunk → requirement extract' },
    { title: 'Dual pipeline online', time: 'live', desc: 'OpenAI GenAI + Python ground-truth validation' },
    { title: 'Supabase connected', time: 'live', desc: 'Auth, documents, matrix, plans, validation tables' },
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/70 border border-purple-800/40 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Admin Management Hub · FastAPI + Supabase</span>
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
              onClick={() => navigate('/generate')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-purple-600/30 transition ring-1 ring-purple-400/30"
            >
              <Sparkles className="w-4 h-4" />
              Generate Plan
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="p-8 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400 mb-2" />
          Loading live stats…
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/documents')}
          className="bg-slate-900/70 border border-purple-900/30 hover:border-purple-600/50 rounded-2xl p-5 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Total Ingested Docs</p>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">{stats?.total_documents ?? '—'}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-900/20 text-xs">
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> {stats?.approved_documents ?? 0} Approved
            </span>
            <span className="text-slate-400 group-hover:text-purple-300 flex items-center gap-1 transition">Manage →</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/matrix')}
          className="bg-slate-900/70 border border-purple-900/30 hover:border-purple-600/50 rounded-2xl p-5 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Configured Roles / Req</p>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">{stats?.total_roles ?? '—'}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-900/20 text-xs">
            <span className="text-purple-400 font-medium">{stats?.total_requirements ?? 0} Requirements</span>
            <span className="text-slate-400 group-hover:text-purple-300 flex items-center gap-1 transition">Matrix →</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/plans')}
          className="bg-slate-900/70 border border-purple-900/30 hover:border-purple-600/50 rounded-2xl p-5 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Active Onboarding Plans</p>
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 group-hover:bg-pink-600 group-hover:text-white transition">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">{stats?.total_plans ?? '—'}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-900/20 text-xs">
            <span className="text-emerald-400 font-medium">Avg coverage {stats?.avg_coverage ?? 0}%</span>
            <span className="text-slate-400 group-hover:text-purple-300 flex items-center gap-1 transition">Inspect →</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/validation')}
          className="bg-slate-900/70 border border-purple-900/30 hover:border-purple-600/50 rounded-2xl p-5 cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Flagged / Reviews</p>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">{stats?.flagged_items ?? '—'}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-900/20 text-xs">
            <span className="text-slate-400 font-medium">{stats?.pending_reviews ?? 0} pending sign-offs</span>
            <span className="text-slate-400 group-hover:text-purple-300 flex items-center gap-1 transition">Audit →</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl border border-purple-900/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Active Onboarding Pipelines</h2>
            <button
              onClick={() => navigate('/generate')}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
            >
              + Create New
            </button>
          </div>

          <div className="divide-y divide-purple-900/20">
            {plans.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/plans/${p.id}`)}
                className="py-4 flex items-center justify-between gap-4 hover:bg-purple-950/20 px-2 rounded-xl transition cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    {(p.employee_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition">
                      {p.employee_name}
                    </h3>
                    <p className="text-xs text-slate-400">{p.role_title}{p.department ? ` • ${p.department}` : ''}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold text-purple-300">{p.progress}% Completed</p>
                    <div className="w-24 bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div className="bg-purple-500 h-full rounded-full" style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {p.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-300" />
                </div>
              </div>
            ))}
            {!loading && plans.length === 0 && (
              <p className="text-slate-500 text-sm py-6 text-center">
                No plans yet — upload docs, then generate a plan.
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/80 rounded-2xl border border-purple-900/30 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">System Status</h3>
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
              <span className="text-xs text-emerald-400 font-semibold">
                {stats?.pending_reviews ?? 0} Pending Review
              </span>
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

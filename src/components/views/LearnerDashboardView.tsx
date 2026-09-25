import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  CheckCircle2, Clock, Award, BookOpen,
  Sparkles, TrendingUp, Shield, HelpCircle, RefreshCw, PlayCircle
} from 'lucide-react';

interface LearnerDash {
  plan: {
    id: string;
    employee_name: string;
    role_title: string;
    target_completion: string;
    progress: number;
    status: string;
    verification_status?: string;
    coverage_score?: number;
  };
  modules: {
    id: string;
    title: string;
    description?: string;
    due_stage?: string;
    status?: string;
    estimated_hours?: number;
    tasks: { id: string; title: string; description?: string; estimated_minutes?: number; completed: boolean }[];
  }[];
  tasks_total: number;
  tasks_completed: number;
  quizzes_total: number;
  progress: number;
}

export const LearnerDashboardView: React.FC = () => {
  const { setQuizModalOpen, setSelectedPlanId, addToast } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<LearnerDash | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const plans = await api.get<{ id: string; employee_name: string; role_title: string }[]>('/plans');
      if (!plans.length) {
        setError('No onboarding plan assigned yet. Ask your admin to generate one.');
        setData(null);
        return;
      }
      const preferred =
        plans.find(p => (user?.full_name && p.employee_name === user.full_name)) || plans[0];
      const dash = await api.get<LearnerDash>(`/dashboard/learner/${preferred.id}`);
      setData(dash);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load learner dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const toggleTask = async (taskId: string, completed: boolean) => {
    if (!data) return;
    try {
      const res = await api.post<{ progress: number }>('/plans/task/toggle', {
        plan_id: data.plan.id,
        task_id: taskId,
        completed,
      });
      addToast(completed ? 'Task completed!' : 'Task reopened', 'success');
      await load();
      setData(prev => (prev ? { ...prev, progress: res.progress } : prev));
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Toggle failed', 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-400 mb-3" />
        Loading curriculum…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-12 text-center text-slate-400">
        <BookOpen className="w-12 h-12 mx-auto text-purple-400 mb-3" />
        <p className="text-white font-semibold">{error || 'No active learner plan found.'}</p>
        <button
          onClick={() => navigate('/plans')}
          className="mt-4 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold"
        >
          Browse Plans
        </button>
      </div>
    );
  }

  const inProgressModule =
    data.modules.find(m => m.status === 'In Progress') ||
    data.modules.find(m => (m.tasks || []).some(t => !t.completed)) ||
    data.modules[0];

  const completedModules = data.modules.filter(m => m.status === 'Completed').length;

  return (
    <div className="space-y-6 pb-20">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/70 border border-purple-800/40 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Learner Experience Portal · {data.plan.id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Welcome back, {data.plan.employee_name}!
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              On track for your{' '}
              <span className="text-purple-300 font-semibold">{data.plan.role_title}</span> onboarding by{' '}
              <span className="text-white font-medium">{data.plan.target_completion}</span>.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-purple-800/40 rounded-2xl p-4 sm:p-5 flex items-center gap-5 shadow-lg min-w-[240px]">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-purple-500 transition-all duration-1000 ease-out"
                  strokeDasharray={`${data.progress}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-sm font-bold text-white">{data.progress}%</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Progress</p>
              <p className="text-base font-bold text-white">
                {data.tasks_completed} of {data.tasks_total} Tasks
              </p>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3" /> {data.plan.status}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Core Modules</p>
            <p className="text-xl font-bold text-white mt-1">
              {completedModules} / {data.modules.length}
            </p>
            <p className="text-[11px] text-purple-400 mt-0.5">Live from plan</p>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Tasks Done</p>
            <p className="text-xl font-bold text-white mt-1">
              {data.tasks_completed} / {data.tasks_total}
            </p>
            <p className="text-[11px] text-emerald-400 mt-0.5">{data.progress}% complete</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Quiz Questions</p>
            <p className="text-xl font-bold text-white mt-1">{data.quizzes_total}</p>
            <p className="text-[11px] text-amber-400 mt-0.5">Generated from sources</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Rule Compliance</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{data.plan.coverage_score ?? 0}%</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{data.plan.verification_status || 'Validated'}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Current Focus Module</h2>
            <span className="text-xs text-purple-400 font-medium">
              Step {Math.min(completedModules + 1, data.modules.length)} of {data.modules.length}
            </span>
          </div>

          {inProgressModule && (
            <div className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 relative overflow-hidden shadow-lg">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {inProgressModule.id}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-2">{inProgressModule.title}</h3>
                  <p className="text-xs text-slate-300 mt-1">{inProgressModule.description}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {inProgressModule.due_stage || 'Active'}
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {(inProgressModule.tasks || []).map(task => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id, !task.completed)}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-purple-900/20 hover:border-purple-700/40 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                          task.completed
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'border-slate-700 bg-slate-800 text-transparent hover:border-purple-500'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-400">{task.description}</p>
                      </div>
                    </div>
                    <span className="text-xs text-purple-400 font-mono whitespace-nowrap">
                      {task.estimated_minutes}m
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-purple-900/30 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Plan: <span className="text-purple-300 font-mono">{data.plan.id}</span>
                </span>
                <button
                  onClick={() => {
                    setSelectedPlanId(data.plan.id);
                    setQuizModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Take Module Quiz
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Module Milestones</h3>
            <div className="space-y-3">
              {data.modules.map((m, i) => (
                <div
                  key={m.id}
                  className={
                    'flex items-start gap-3 p-3 rounded-xl border ' +
                    (m.status === 'Completed'
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : m.status === 'In Progress' || i === completedModules
                        ? 'bg-purple-500/5 border-purple-500/20'
                        : 'bg-slate-800/40 border-slate-700/40 opacity-70')
                  }
                >
                  {m.status === 'Completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : m.status === 'In Progress' || i === completedModules ? (
                    <PlayCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-200">{m.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {m.status || 'Not Started'} · {(m.tasks || []).filter(t => t.completed).length}/
                      {(m.tasks || []).length} tasks · {m.due_stage}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-2xl border border-purple-800/40 p-6">
            <h3 className="text-sm font-bold text-white mb-2">Need Help or Clarification?</h3>
            <p className="text-xs text-slate-300 mb-4">
              Your plan is validated against company source documents with full citation traceability.
            </p>
            <button
              onClick={() => addToast('Mentor request sent to your manager!', 'success')}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-purple-900/40 transition"
            >
              Request Mentor Check-in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

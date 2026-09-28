import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  CheckCircle2, Clock, Award, BookOpen, Sparkles, TrendingUp, HelpCircle,
  RefreshCw, PlayCircle, CalendarClock, ClipboardList, Target, AlertTriangle,
  Lightbulb, ListChecks,
} from 'lucide-react';

interface Milestone {
  stage: string;
  tasks_total: number;
  tasks_completed: number;
  status: string;
}

interface UpcomingActivity {
  task_id?: string;
  title?: string;
  module_id?: string;
  due_stage?: string;
  estimated_minutes?: number;
}

interface ScoreRow {
  quiz_id?: string;
  assessment_id?: string;
  score: number;
}

interface Recommendation {
  type?: string;
  area?: string;
  reason?: string;
  activity?: string;
}

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
  checklists_total?: number;
  checklists_completed?: number;
  quizzes_total: number;
  progress: number;
  progress_status?: string;
  current_stage?: string;
  milestones?: Milestone[];
  upcoming_activities?: UpcomingActivity[];
  quiz_scores?: ScoreRow[];
  quiz_average?: number;
  assessment_scores?: ScoreRow[];
  assessment_average?: number;
  completed_modules?: number;
  weak_areas?: string[];
  recommendations?: Recommendation[];
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
        Loading your learning dashboard…
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

  const completedModules =
    data.completed_modules ??
    data.modules.filter(m => (m.tasks || []).length > 0 && (m.tasks || []).every(t => t.completed)).length;

  const statusColor =
    data.progress_status === 'Completed'
      ? 'text-emerald-400'
      : data.progress_status === 'Behind Schedule'
        ? 'text-rose-400'
        : data.progress_status === 'Requires Attention'
          ? 'text-amber-400'
          : 'text-purple-300';

  const statCards = [
    { label: 'Onboarding Progress', value: `${data.progress}%`, sub: data.progress_status || data.plan.status, icon: <TrendingUp className="w-5 h-5" />, tint: 'text-purple-400 bg-purple-500/10' },
    { label: 'Assigned Modules', value: String(data.modules.length), sub: `${data.plan.role_title}`, icon: <BookOpen className="w-5 h-5" />, tint: 'text-indigo-400 bg-indigo-500/10' },
    { label: 'Completed Modules', value: `${completedModules} / ${data.modules.length}`, sub: 'Finished', icon: <CheckCircle2 className="w-5 h-5" />, tint: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Tasks', value: `${data.tasks_completed} / ${data.tasks_total}`, sub: 'Completed', icon: <ClipboardList className="w-5 h-5" />, tint: 'text-sky-400 bg-sky-500/10' },
    { label: 'Quiz Average', value: `${data.quiz_average ?? 0}%`, sub: `${data.quizzes_total} questions`, icon: <Award className="w-5 h-5" />, tint: 'text-amber-400 bg-amber-500/10' },
    { label: 'Assessment Average', value: `${data.assessment_average ?? 0}%`, sub: `${(data.assessment_scores || []).length} assessments`, icon: <Target className="w-5 h-5" />, tint: 'text-pink-400 bg-pink-500/10' },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/70 border border-purple-800/40 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Employee Learning Dashboard · Plan {data.plan.id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Welcome back, {data.plan.employee_name}!
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              {data.plan.role_title} onboarding · target {data.plan.target_completion} · current stage{' '}
              <span className="text-purple-300 font-semibold">{data.current_stage || '—'}</span>.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-purple-800/40 rounded-2xl p-4 sm:p-5 flex items-center gap-5 shadow-lg min-w-[240px]">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-800" strokeWidth="3.5" stroke="currentColor" fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-purple-500 transition-all duration-1000 ease-out"
                  strokeDasharray={`${data.progress}, 100`} strokeWidth="3.5" strokeLinecap="round"
                  stroke="currentColor" fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <span className="absolute text-sm font-bold text-white">{data.progress}%</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Progress</p>
              <p className="text-base font-bold text-white">{data.tasks_completed} of {data.tasks_total} tasks</p>
              <p className={`text-[11px] flex items-center gap-1 mt-0.5 ${statusColor}`}>
                <TrendingUp className="w-3 h-3" /> {data.progress_status || data.plan.status}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(c => (
          <div key={c.label} className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">{c.label}</p>
              <p className="text-xl font-bold text-white mt-1">{c.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[10rem]">{c.sub}</p>
            </div>
            <div className={`p-2.5 rounded-xl ${c.tint}`}>{c.icon}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Current focus */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Current Focus Module</h2>
            <span className="text-xs text-purple-400 font-medium">
              Step {Math.min(completedModules + 1, data.modules.length)} of {data.modules.length}
            </span>
          </div>

          {inProgressModule ? (
            <div className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 shadow-lg">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {inProgressModule.id}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-2">{inProgressModule.title}</h3>
                  <p className="text-xs text-slate-300 mt-1">{inProgressModule.description}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 whitespace-nowrap">
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
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                        task.completed ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-700 bg-slate-800 text-transparent hover:border-purple-500'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>{task.title}</p>
                        <p className="text-xs text-slate-400">{task.description}</p>
                      </div>
                    </div>
                    <span className="text-xs text-purple-400 font-mono whitespace-nowrap">{task.estimated_minutes}m</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-purple-900/30 flex items-center justify-between">
                <span className="text-xs text-slate-400">Plan: <span className="text-purple-300 font-mono">{data.plan.id}</span></span>
                <button
                  onClick={() => { setSelectedPlanId(data.plan.id); setQuizModalOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition"
                >
                  <HelpCircle className="w-3.5 h-3.5" /> Take Module Quiz
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">All modules completed. 🎉</p>
          )}

          {/* Upcoming activities */}
          <div className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-purple-400" /> Upcoming Activities
            </h3>
            <div className="space-y-2">
              {(data.upcoming_activities || []).map((a, i) => (
                <div key={a.task_id || i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-purple-900/20">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate">{a.title || 'Task'}</p>
                    <p className="text-[11px] text-slate-500">{a.module_id} · {a.due_stage}</p>
                  </div>
                  <span className="text-xs text-purple-400 font-mono whitespace-nowrap ml-3">{a.estimated_minutes ?? 30}m</span>
                </div>
              ))}
              {(!data.upcoming_activities || data.upcoming_activities.length === 0) && (
                <p className="text-xs text-slate-500">No pending activities — you're all caught up.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Stage milestones */}
          <div className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" /> Milestones
            </h3>
            <div className="space-y-3">
              {(data.milestones || []).map(m => (
                <div key={m.stage} className="p-3 rounded-xl bg-slate-950/60 border border-purple-900/20">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-200">{m.stage}</p>
                    <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full border ' + (
                      m.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : m.status === 'In Progress' ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                    )}>{m.status}</span>
                  </div>
                  <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-emerald-400"
                      style={{ width: `${m.tasks_total ? Math.round((m.tasks_completed / m.tasks_total) * 100) : 0}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{m.tasks_completed}/{m.tasks_total} tasks</p>
                </div>
              ))}
              {(!data.milestones || data.milestones.length === 0) && (
                <p className="text-xs text-slate-500">No milestones yet.</p>
              )}
            </div>
          </div>

          {/* Quiz & assessment results */}
          <div className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" /> Quiz &amp; Assessment Results
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-950/60 border border-purple-900/20 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Quiz Avg</p>
                <p className="text-xl font-extrabold text-amber-400">{data.quiz_average ?? 0}%</p>
              </div>
              <div className="rounded-xl bg-slate-950/60 border border-purple-900/20 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Assessment Avg</p>
                <p className="text-xl font-extrabold text-pink-400">{data.assessment_average ?? 0}%</p>
              </div>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {(data.quiz_scores || []).map((s, i) => (
                <div key={s.quiz_id || i} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 truncate">{s.quiz_id || `Quiz ${i + 1}`}</span>
                  <span className={s.score >= 70 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>{s.score}%</span>
                </div>
              ))}
              {(!data.quiz_scores || data.quiz_scores.length === 0) && (
                <p className="text-xs text-slate-500">No quiz attempts recorded yet.</p>
              )}
            </div>
          </div>

          {/* Weak areas & recommendations */}
          <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-2xl border border-purple-800/40 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" /> Focus &amp; Recommendations
            </h3>
            {!!(data.weak_areas || []).length && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-amber-300 mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Areas to reinforce
                </p>
                <div className="flex flex-wrap gap-2">
                  {(data.weak_areas || []).map(w => (
                    <span key={w} className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-full">{w}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              {(data.recommendations || []).slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-xs bg-slate-950/40 rounded-lg border border-purple-900/20 p-3">
                  <ListChecks className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-slate-200 font-medium">{r.activity || r.type}</p>
                    <p className="text-[11px] text-slate-400">{r.reason}{r.area ? ` · ${r.area}` : ''}</p>
                  </div>
                </div>
              ))}
              {(!data.recommendations || data.recommendations.length === 0) && (
                <p className="text-xs text-slate-400">You're on track — keep going!</p>
              )}
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6">
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

      {/* Module list / milestones */}
      <div className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Assigned Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.modules.map((m, i) => {
            const done = (m.tasks || []).filter(t => t.completed).length;
            const total = (m.tasks || []).length;
            const complete = total > 0 && done === total;
            return (
              <div key={m.id} className={'flex items-start gap-3 p-3 rounded-xl border ' + (
                complete ? 'bg-emerald-500/5 border-emerald-500/20'
                  : (m.status === 'In Progress' || i === completedModules) ? 'bg-purple-500/5 border-purple-500/20'
                    : 'bg-slate-800/40 border-slate-700/40 opacity-80'
              )}>
                {complete ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  : (m.status === 'In Progress' || i === completedModules) ? <PlayCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    : <Clock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">{m.title}</p>
                  <p className="text-[11px] text-slate-400">{m.status || 'Not Started'} · {done}/{total} tasks · {m.due_stage}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

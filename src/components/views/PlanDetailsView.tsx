import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import {
  FileText, CheckCircle2, Clock, Shield, ChevronRight, UserCheck, Sparkles,
  BookOpen, Layers, CheckSquare, HelpCircle, Award, Search, AlertCircle, RefreshCw
} from 'lucide-react';

interface PlanTask {
  id: string;
  title: string;
  description?: string;
  task_type?: string;
  type?: string;
  difficulty?: string;
  estimated_minutes?: number;
  completed: boolean;
  source_document_id?: string;
  docCitation?: string;
  due_stage?: string;
}

interface PlanModule {
  id: string;
  title: string;
  description?: string;
  purpose?: string;
  estimated_hours?: number;
  status?: string;
  due_stage?: string;
  mandatory?: boolean;
  learning_objectives?: string[];
  source_document_id?: string;
  source_section_id?: string;
  source_citations?: string[];
  verification_status?: string;
  tasks: PlanTask[];
  quiz?: unknown[];
}

interface PlanDetail {
  id: string;
  employee_name: string;
  role_title: string;
  department?: string;
  target_completion: string;
  status: string;
  progress: number;
  verification_status?: string;
  coverage_score?: number;
  traceability_score?: number;
  consistency_score?: number;
  missing_count?: number;
  contradiction_count?: number;
  prompt_version?: string;
  model_used?: string;
  modules: PlanModule[];
  tasks: PlanTask[];
  quizzes: unknown[];
  checklists: unknown[];
  assessments: unknown[];
  validations: { id: string; requirement_id?: string; field_name?: string; validation_status?: string; detail?: string; result?: string }[];
  reviews: unknown[];
}

export const PlanDetailsView: React.FC = () => {
  const { plans, setPlanReviewModalOpen, setQuizModalOpen, setSelectedPlanId, addToast } = useApp();
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [allPlans, setAllPlans] = useState<{ id: string; employee_name: string; role_title: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'modules' | 'tasks' | 'quizzes' | 'citations' | 'validation'>('modules');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.get<{ id: string; employee_name: string; role_title: string; status: string }[]>('/plans')
      .then(setAllPlans)
      .catch(() => setAllPlans([]));
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    const id = planId || allPlans[0]?.id || plans[0]?.id;
    if (!id) {
      setLoading(false);
      setError('No onboarding plan selected.');
      return;
    }
    api.get<PlanDetail>(`/plans/${id}`)
      .then(data => {
        if (!alive) return;
        setPlan(data);
        setSelectedModuleId(data.modules?.[0]?.id || '');
      })
      .catch(e => {
        if (alive) setError(e instanceof Error ? e.message : 'Failed to load plan');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, plans.length]);

  const selectedModule =
    plan?.modules.find(m => m.id === selectedModuleId) || plan?.modules[0] || null;

  const toggleTask = async (task: PlanTask) => {
    if (!plan) return;
    const next = !task.completed;
    // optimistic
    setPlan(prev => {
      if (!prev) return prev;
      const patch = (t: PlanTask) => (t.id === task.id ? { ...t, completed: next } : t);
      return {
        ...prev,
        tasks: prev.tasks.map(patch),
        modules: prev.modules.map(m => ({ ...m, tasks: m.tasks.map(patch) })),
      };
    });
    try {
      const res = await api.post<{ progress: number; status: string }>('/plans/task/toggle', {
        plan_id: plan.id,
        task_id: task.id,
        completed: next,
      });
      setPlan(prev => (prev ? { ...prev, progress: res.progress, status: res.status } : prev));
      addToast(`Task ${next ? 'completed' : 'reopened'} · progress ${res.progress}%`, 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Toggle failed', 'error');
      setPlan(prev => {
        if (!prev) return prev;
        const patch = (t: PlanTask) => (t.id === task.id ? { ...t, completed: !next } : t);
        return {
          ...prev,
          tasks: prev.tasks.map(patch),
          modules: prev.modules.map(m => ({ ...m, tasks: m.tasks.map(patch) })),
        };
      });
    }
  };

  const revalidate = async () => {
    if (!plan) return;
    try {
      addToast('Re-running Python ground-truth validation…', 'info');
      const res = await api.post<{ summary: Record<string, unknown> }>(`/plans/${plan.id}/revalidate`);
      addToast(
        `Revalidated · coverage ${res.summary.coverage_score}% · ${res.summary.verification_status}`,
        'info',
      );
      const fresh = await api.get<PlanDetail>(`/plans/${plan.id}`);
      setPlan(fresh);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Revalidate failed', 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-400 mb-3" />
        Loading plan from API…
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="p-8 text-center text-slate-400">
        <AlertCircle className="w-12 h-12 mx-auto text-purple-400 mb-3" />
        <p>{error || 'No onboarding plan selected.'}</p>
        <p className="text-xs mt-2">Generate a plan first from the Generate Plan screen.</p>
        <button
          onClick={() => navigate('/generate')}
          className="mt-4 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold"
        >
          Go to Generate Plan
        </button>
      </div>
    );
  }

  const allTasks = plan.modules.flatMap(m => m.tasks || []);
  const filteredModules = plan.modules.filter(
    m =>
      !searchQuery ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const statusColor =
    plan.status === 'Approved'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      : plan.status === 'Pending Review'
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        : 'bg-purple-500/10 text-purple-300 border-purple-500/20';

  return (
    <div className="space-y-6 pb-20">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-800/40 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-purple-500/30 ring-2 ring-purple-400/30">
              {(plan.employee_name || 'U')
                .split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-white tracking-tight">{plan.employee_name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1 ${statusColor}`}>
                  <CheckCircle2 className="w-3 h-3" /> {plan.status}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" /> {plan.verification_status || 'Validated'}
                </span>
              </div>
              <p className="text-slate-400 text-sm flex flex-wrap items-center gap-2">
                <span className="text-purple-300 font-medium">{plan.role_title}</span>
                <span>•</span>
                <span>{plan.department}</span>
                <span>•</span>
                <span>ID: {plan.id}</span>
                <span>•</span>
                <span>Target: {plan.target_completion}</span>
                {plan.model_used && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-[11px]">{plan.model_used} / {plan.prompt_version}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
            <button
              onClick={revalidate}
              className="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition"
            >
              <RefreshCw className="w-4 h-4 text-purple-400" />
              Re-run Validation
            </button>
            <button
              onClick={() => setPlanReviewModalOpen(true)}
              className="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-purple-600/30 transition ring-1 ring-purple-400/30"
            >
              <UserCheck className="w-4 h-4" />
              Review & Sign Off
            </button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-purple-800/30 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">Curriculum Completion</span>
              <span className="text-purple-300 font-bold">{plan.progress}%</span>
            </div>
            <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden border border-purple-900/40">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 rounded-full transition-all duration-500 shadow-sm shadow-purple-500/50"
                style={{ width: `${plan.progress}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-800/40 rounded-xl p-3 border border-purple-900/30">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-xs text-slate-400">Total Modules</p>
              <p className="text-sm font-bold text-white">{plan.modules.length} Core Modules</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-800/40 rounded-xl p-3 border border-purple-900/30">
            <Shield className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-xs text-slate-400">Coverage / Traceability</p>
              <p className="text-sm font-bold text-emerald-400">
                {plan.coverage_score ?? 0}% / {plan.traceability_score ?? 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {allPlans.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Switch Plan:</span>
          {allPlans.map(p => (
            <button
              key={p.id}
              onClick={() => navigate(`/plans/${p.id}`)}
              className={
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border ' +
                (p.id === plan.id
                  ? 'bg-purple-600/30 text-purple-200 border-purple-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700')
              }
            >
              {p.employee_name} ({p.role_title.split(' ')[0]})
            </button>
          ))}
        </div>
      )}

      <div className="border-b border-purple-900/30 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(
            [
              ['modules', <Layers key="m" className="w-4 h-4" />, `Modules (${plan.modules.length})`],
              ['tasks', <CheckSquare key="t" className="w-4 h-4" />, `All Tasks (${allTasks.length})`],
              ['quizzes', <HelpCircle key="q" className="w-4 h-4" />, `Quizzes (${plan.quizzes?.length || 0})`],
              ['validation', <Shield key="v" className="w-4 h-4" />, `Validation (${plan.validations?.length || 0})`],
              ['citations', <FileText key="c" className="w-4 h-4" />, 'Source Citations'],
            ] as const
          ).map(([key, icon, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={
                'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition -mb-px ' +
                (activeTab === key
                  ? 'text-purple-300 border-purple-500'
                  : 'text-slate-400 border-transparent hover:text-slate-200')
              }
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search within plan..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {activeTab === 'modules' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider px-1">Curriculum Sequence</h2>
            {filteredModules.map((mod, index) => {
              const isSelected = mod.id === selectedModule?.id;
              const completedTasks = (mod.tasks || []).filter(t => t.completed).length;
              return (
                <div
                  key={mod.id}
                  onClick={() => setSelectedModuleId(mod.id)}
                  className={`cursor-pointer rounded-xl p-4 border transition-all duration-200 ${
                    isSelected
                      ? 'bg-purple-900/20 border-purple-500 shadow-lg shadow-purple-950/50'
                      : 'bg-slate-900/70 border-purple-900/30 hover:border-purple-700/50 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                          isSelected ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <h3 className="font-semibold text-white text-sm">{mod.title}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                      {mod.due_stage || 'Week 1'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">{mod.description || mod.purpose}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-purple-900/20">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-400" /> {mod.estimated_hours || 1}h
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {completedTasks}/{(mod.tasks || []).length} tasks
                    </span>
                    <span className="text-purple-400 flex items-center gap-1 text-[11px] font-medium">
                      Inspect <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedModule && (
            <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 space-y-6">
              <div className="flex items-start justify-between border-b border-purple-900/30 pb-4 gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {selectedModule.id}
                    </span>
                    <span className="text-xs text-slate-400">Duration: {selectedModule.estimated_hours || 1} Hours</span>
                    {selectedModule.due_stage && (
                      <span className="text-xs text-slate-400">Stage: {selectedModule.due_stage}</span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-white">{selectedModule.title}</h2>
                  <p className="text-sm text-slate-300 mt-1">{selectedModule.description || selectedModule.purpose}</p>
                  {selectedModule.learning_objectives && selectedModule.learning_objectives.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {selectedModule.learning_objectives.map((o, i) => (
                        <li key={i} className="text-xs text-slate-400 flex gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedPlanId(plan.id);
                    setQuizModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition whitespace-nowrap"
                >
                  <Award className="w-3.5 h-3.5" /> Start Module Quiz
                </button>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tasks & Action Items</h3>
                <div className="space-y-2.5">
                  {(selectedModule.tasks || []).length === 0 && (
                    <p className="text-xs text-slate-500">No tasks in this module.</p>
                  )}
                  {(selectedModule.tasks || []).map(task => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-purple-900/20 hover:border-purple-700/40 transition"
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task)}
                        className="mt-1 w-4 h-4 rounded border-purple-800 bg-slate-800 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-sm font-semibold ${task.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                            {task.title}
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            {task.task_type || task.type || 'Reading'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-400" /> {task.estimated_minutes || 30} mins
                          </span>
                          {(task.source_document_id || task.docCitation) && (
                            <span className="flex items-center gap-1 text-purple-400">
                              <FileText className="w-3 h-3" /> Ref: {task.source_document_id || task.docCitation}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {(selectedModule.source_citations?.length || selectedModule.source_document_id) && (
                <div className="pt-4 border-t border-purple-900/30">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Verified Citations</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(selectedModule.source_citations?.length
                      ? selectedModule.source_citations
                      : [`${selectedModule.source_document_id} / ${selectedModule.source_section_id || '—'}`]
                    ).map((citation, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-purple-900/30 text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-purple-400" />
                          <span className="font-mono text-purple-200">{citation}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300">Verified</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white">Full Onboarding Task Checklist</h2>
            <span className="text-xs text-purple-400">
              {allTasks.filter(t => t.completed).length} / {allTasks.length} Completed
            </span>
          </div>
          <div className="divide-y divide-purple-900/20">
            {allTasks.map(task => (
              <div key={task.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task)}
                    className="w-4 h-4 rounded border-purple-800 bg-slate-800 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <p className={`text-sm font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-slate-400">{task.description}</p>
                  </div>
                </div>
                <span className="text-xs text-purple-400 font-mono whitespace-nowrap">{task.estimated_minutes || 30}m</span>
              </div>
            ))}
            {allTasks.length === 0 && <p className="text-slate-500 text-sm py-4">No tasks found.</p>}
          </div>
        </div>
      )}

      {activeTab === 'quizzes' && (
        <div className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Generated Quizzes ({plan.quizzes?.length || 0})</h2>
            <button
              onClick={() => {
                setSelectedPlanId(plan.id);
                setQuizModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold"
            >
              Open Interactive Quiz
            </button>
          </div>
          <div className="space-y-3">
            {(plan.quizzes || []).slice(0, 20).map((q, i) => {
              const item = q as { question?: string; source_document_id?: string; difficulty?: string; question_type?: string };
              return (
                <div key={i} className="p-3 rounded-xl bg-slate-950/60 border border-purple-900/30 text-xs">
                  <p className="text-white font-semibold text-sm">{i + 1}. {item.question}</p>
                  <p className="text-slate-500 mt-1">
                    Source: <span className="text-purple-300 font-mono">{item.source_document_id || '—'}</span>
                    {' · '}{item.difficulty} · {item.question_type}
                  </p>
                </div>
              );
            })}
            {(plan.quizzes || []).length === 0 && <p className="text-slate-500 text-sm">No quizzes generated yet.</p>}
          </div>
        </div>
      )}

      {activeTab === 'validation' && (
        <div className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Python Ground-Truth Validation Findings</h2>
            <span className="text-xs text-slate-400">{plan.validations?.length || 0} findings</span>
          </div>
          <div className="space-y-2">
            {(plan.validations || []).slice(0, 100).map(v => (
              <div key={v.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-slate-950/60 border border-purple-900/20 text-xs">
                <div>
                  <span className="font-mono text-purple-300">{v.requirement_id || '—'}</span>
                  <span className="text-slate-500 ml-2">{v.field_name}</span>
                  <p className="text-slate-400 mt-0.5">{v.detail}</p>
                </div>
                <span
                  className={
                    'px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ' +
                    (v.result === 'Match'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400')
                  }
                >
                  {v.validation_status}
                </span>
              </div>
            ))}
            {(plan.validations || []).length === 0 && (
              <p className="text-slate-500 text-sm">No validation findings stored for this plan.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'citations' && (
        <div className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Source Documents & Audit Citations</h2>
            <span className="text-xs text-slate-400">Generated strictly from approved knowledge bases</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.modules
              .filter(m => m.source_document_id)
              .slice(0, 12)
              .map(m => (
                <div key={m.id} className="p-4 rounded-xl bg-slate-950/60 border border-purple-900/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-purple-300">
                      {m.source_document_id}
                      {m.source_section_id ? ` § ${m.source_section_id}` : ''}
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Cited</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">{m.title}</h4>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

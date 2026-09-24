import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText, CheckCircle2, Clock, AlertCircle, Shield,
  ChevronRight, Download, UserCheck, Sparkles,
  BookOpen, Layers, CheckSquare, HelpCircle, Award,
  Search
} from 'lucide-react';

export const PlanDetailsView: React.FC = () => {
  const { plans, selectedPlanId, setSelectedPlanId, setPlanReviewModalOpen, setQuizModalOpen, addToast } = useApp();
  const [activeTab, setActiveTab] = useState<'modules' | 'tasks' | 'checklists' | 'quizzes' | 'citations'>('modules');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('MOD-01');
  const [searchQuery, setSearchQuery] = useState('');

  const currentPlan = plans.find(p => p.id === selectedPlanId) || plans[0];

  if (!currentPlan) {
    return (
      <div className="p-8 text-center text-slate-400">
        <AlertCircle className="w-12 h-12 mx-auto text-purple-400 mb-3" />
        <p>No onboarding plan selected.</p>
      </div>
    );
  }

  const selectedModule = currentPlan.modules.find(m => m.id === selectedModuleId) || currentPlan.modules[0];

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner with Employee & Plan Info */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-800/40 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-purple-500/30 ring-2 ring-purple-400/30">
              {currentPlan.employeeName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-white tracking-tight">{currentPlan.employeeName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {currentPlan.status}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" /> AI Synthesized
                </span>
              </div>
              <p className="text-slate-400 text-sm flex items-center gap-2">
                <span className="text-purple-300 font-medium">{currentPlan.roleTitle}</span>
                <span>•</span>
                <span>{currentPlan.department}</span>
                <span>•</span>
                <span>ID: {currentPlan.id}</span>
                <span>•</span>
                <span>Target: {currentPlan.targetCompletion}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => addToast('Downloading customized PDF onboarding packet...', 'info')}
              className="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition"
            >
              <Download className="w-4 h-4 text-purple-400" />
              Export PDF
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

        {/* Progress bar in header */}
        <div className="mt-6 pt-6 border-t border-purple-800/30 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">Curriculum Completion</span>
              <span className="text-purple-300 font-bold">{currentPlan.progress}%</span>
            </div>
            <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden border border-purple-900/40">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 rounded-full transition-all duration-500 shadow-sm shadow-purple-500/50"
                style={{ width: currentPlan.progress + '%' }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-800/40 rounded-xl p-3 border border-purple-900/30">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-xs text-slate-400">Total Modules</p>
              <p className="text-sm font-bold text-white">{currentPlan.modules.length} Core Modules</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-800/40 rounded-xl p-3 border border-purple-900/30">
            <Shield className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-xs text-slate-400">Validation Score</p>
              <p className="text-sm font-bold text-emerald-400">98% Rule Compliant</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Selector */}
      {plans.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Switch Plan:</span>
          {plans.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlanId(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                p.id === currentPlan.id
                  ? 'bg-purple-600/30 text-purple-200 border-purple-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {p.employeeName} ({p.roleTitle.split(' ')[0]})
            </button>
          ))}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-purple-900/30 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('modules')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition -mb-px ${
              activeTab === 'modules'
                ? 'text-purple-300 border-purple-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Modules ({currentPlan.modules.length})
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition -mb-px ${
              activeTab === 'tasks'
                ? 'text-purple-300 border-purple-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            All Tasks ({currentPlan.modules.reduce((acc, m) => acc + m.tasks.length, 0)})
          </button>
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition -mb-px ${
              activeTab === 'quizzes'
                ? 'text-purple-300 border-purple-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Quizzes & Tests
          </button>
          <button
            onClick={() => setActiveTab('citations')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition -mb-px ${
              activeTab === 'citations'
                ? 'text-purple-300 border-purple-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Source Citations
          </button>
        </div>

        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within plan..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* TAB CONTENT: MODULES */}
      {activeTab === 'modules' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider px-1">Curriculum Sequence</h2>
            {currentPlan.modules.map((mod, index) => {
              const isSelected = mod.id === selectedModule?.id;
              const completedTasks = mod.tasks.filter(t => t.completed).length;
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
                      <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                        isSelected ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {index + 1}
                      </span>
                      <h3 className="font-semibold text-white text-sm">{mod.title}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      mod.status === 'Completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : mod.status === 'In Progress'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {mod.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">{mod.description}</p>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-purple-900/20">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-400" /> {mod.estimatedHours}h
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {completedTasks}/{mod.tasks.length} tasks
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
              <div className="flex items-start justify-between border-b border-purple-900/30 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {selectedModule.id}
                    </span>
                    <span className="text-xs text-slate-400">Duration: {selectedModule.estimatedHours} Hours</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{selectedModule.title}</h2>
                  <p className="text-sm text-slate-300 mt-1">{selectedModule.description}</p>
                </div>
                <button
                  onClick={() => setQuizModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition whitespace-nowrap"
                >
                  <Award className="w-3.5 h-3.5" /> Start Module Quiz
                </button>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tasks & Action Items</h3>
                <div className="space-y-2.5">
                  {selectedModule.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-purple-900/20 hover:border-purple-700/40 transition"
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => addToast('Task status toggled', 'info')}
                        className="mt-1 w-4 h-4 rounded border-purple-800 bg-slate-800 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-sm font-semibold ${task.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                            {task.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            task.type === 'hands-on' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                            task.type === 'quiz' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' :
                            'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          }`}>
                            {task.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-400" /> {task.estimatedMinutes} mins
                          </span>
                          {task.docCitation && (
                            <span className="flex items-center gap-1 text-purple-400 hover:text-purple-300 cursor-pointer">
                              <FileText className="w-3 h-3" /> Ref: {task.docCitation}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-purple-900/30">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Verified Citations</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedModule.sourceCitations.map((citation, i) => (
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
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: ALL TASKS */}
      {activeTab === 'tasks' && (
        <div className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white">Full Onboarding Task Checklist</h2>
            <span className="text-xs text-purple-400">
              {currentPlan.modules.flatMap(m => m.tasks).filter(t => t.completed).length} / {currentPlan.modules.flatMap(m => m.tasks).length} Completed
            </span>
          </div>
          <div className="divide-y divide-purple-900/20">
            {currentPlan.modules.flatMap(m => m.tasks).map(task => (
              <div key={task.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => addToast('Task status toggled', 'info')}
                    className="w-4 h-4 rounded border-purple-800 bg-slate-800 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <p className={`text-sm font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>{task.title}</p>
                    <p className="text-xs text-slate-400">{task.description}</p>
                  </div>
                </div>
                <span className="text-xs text-purple-400 font-mono whitespace-nowrap">{task.estimatedMinutes}m</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: QUIZZES */}
      {activeTab === 'quizzes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Assessment 1
                </span>
                <span className="text-xs text-emerald-400 font-semibold">Passed (100%)</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Cloud Security & IAM Principles</h3>
              <p className="text-xs text-slate-400 mb-4">
                Evaluates your understanding of AWS IAM roles, least-privilege architecture, and policy boundary validation.
              </p>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between"><span>Questions:</span><span className="font-semibold text-white">5 questions</span></div>
                <div className="flex justify-between"><span>Time limit:</span><span className="font-semibold text-white">10 minutes</span></div>
                <div className="flex justify-between"><span>Passing score:</span><span className="font-semibold text-white">80%</span></div>
              </div>
            </div>
            <button
              onClick={() => setQuizModalOpen(true)}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-purple-900/40 transition"
            >
              Review Quiz Submission
            </button>
          </div>

          <div className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Assessment 2
                </span>
                <span className="text-xs text-amber-400 font-semibold">Pending Attempt</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Kubernetes Production Observability</h3>
              <p className="text-xs text-slate-400 mb-4">
                Practical assessment on setting up Prometheus scrape jobs, Alertmanager routes, and Grafana dashboard alerts.
              </p>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between"><span>Questions:</span><span className="font-semibold text-white">5 questions</span></div>
                <div className="flex justify-between"><span>Time limit:</span><span className="font-semibold text-white">15 minutes</span></div>
                <div className="flex justify-between"><span>Passing score:</span><span className="font-semibold text-white">80%</span></div>
              </div>
            </div>
            <button
              onClick={() => setQuizModalOpen(true)}
              className="mt-6 w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition"
            >
              Start Interactive Quiz Now
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CITATIONS */}
      {activeTab === 'citations' && (
        <div className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Source Documents & Audit Citations</h2>
            <span className="text-xs text-slate-400">All content generated strictly from approved knowledge bases</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-purple-900/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-purple-300">DOC-001 (Rev 3.2)</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">100% Parsed</span>
              </div>
              <h4 className="text-sm font-semibold text-white">Company Infrastructure & Cloud Security Standards</h4>
              <p className="text-xs text-slate-400">
                Mandates IAM least-privilege, KMS key rotation, VPC peering topologies, and mandatory CloudWatch alarms.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-purple-900/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-purple-300">DOC-002 (Rev 1.8)</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">100% Parsed</span>
              </div>
              <h4 className="text-sm font-semibold text-white">Kubernetes Cluster Setup & Ingress Controller Guide</h4>
              <p className="text-xs text-slate-400">
                Covers Istio service mesh, Traefik ingress controller rules, cert-manager automated certificates, and pod security standards.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

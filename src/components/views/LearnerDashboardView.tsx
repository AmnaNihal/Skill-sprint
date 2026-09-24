import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  CheckCircle2, Clock, Award, BookOpen, AlertCircle,
  PlayCircle, ArrowRight, Sparkles, TrendingUp,
  FileCheck, Shield, ChevronRight, HelpCircle
} from 'lucide-react';

export const LearnerDashboardView: React.FC = () => {
  const { plans, setQuizModalOpen, toggleTaskCompletion, currentRole } = useApp();
  const alicePlan = plans[0]; // Alice Johnson's plan

  if (!alicePlan) {
    return <div className="p-6 text-slate-400">No active learner plan found.</div>;
  }

  const allTasks = alicePlan.modules.flatMap(m => m.tasks);
  const completedTasks = allTasks.filter(t => t.completed);
  const totalTasksCount = allTasks.length;
  const inProgressModule = alicePlan.modules.find(m => m.status === 'In Progress') || alicePlan.modules[0];

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/70 border border-purple-800/40 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Learner Experience Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Welcome back, {alicePlan.employeeName}!
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              You are currently on track to complete your <span className="text-purple-300 font-semibold">{alicePlan.roleTitle}</span> onboarding by <span className="text-white font-medium">{alicePlan.targetCompletion}</span>.
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
                  strokeDasharray={`${alicePlan.progress}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-sm font-bold text-white">{alicePlan.progress}%</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Progress</p>
              <p className="text-base font-bold text-white">{completedTasks.length} of {totalTasksCount} Tasks</p>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3" /> On Track (+12% this week)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Core Modules</p>
            <p className="text-xl font-bold text-white mt-1">
              {alicePlan.modules.filter(m => m.status === 'Completed').length} / {alicePlan.modules.length}
            </p>
            <p className="text-[11px] text-purple-400 mt-0.5">1 Currently Active</p>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Hours Invested</p>
            <p className="text-xl font-bold text-white mt-1">14.5 / 24 hrs</p>
            <p className="text-[11px] text-emerald-400 mt-0.5">60% completed</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Assessments Passed</p>
            <p className="text-xl font-bold text-white mt-1">1 / 2</p>
            <p className="text-[11px] text-amber-400 mt-0.5">1 Pending Quiz</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Rule Compliance</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">100%</p>
            <p className="text-[11px] text-slate-400 mt-0.5">SOC2 & IAM Certified</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content Grid: Current Focus Module + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Module Card */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Current Focus Module</h2>
            <span className="text-xs text-purple-400 font-medium">Step 2 of 4</span>
          </div>

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
                In Progress
              </span>
            </div>

            {/* Checklist items for this module */}
            <div className="space-y-3 pt-2">
              {inProgressModule.tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTaskCompletion(alicePlan.id, inProgressModule.id, task.id)}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-purple-900/20 hover:border-purple-700/40 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                      task.completed
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'border-slate-700 bg-slate-800 text-transparent hover:border-purple-500'
                    }`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-slate-400">{task.description}</p>
                    </div>
                  </div>
                  <span className="text-xs text-purple-400 font-mono whitespace-nowrap">{task.estimatedMinutes}m</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-purple-900/30 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Source Document: <span className="text-purple-300 font-mono">DOC-002 (K8s Setup Guide)</span>
              </span>
              <button
                onClick={() => setQuizModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Take Module Quiz
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Action Launchers & Milestones */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Milestone Checklist</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-300">Terraform & AWS Foundations</p>
                  <p className="text-[11px] text-slate-400">Completed on Apr 21 • Score 100%</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                <PlayCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-purple-300">Kubernetes Security & RBAC</p>
                  <p className="text-[11px] text-slate-400">Currently in progress • 3/5 tasks finished</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 opacity-70">
                <Clock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-300">SRE Observability & Prometheus</p>
                  <p className="text-[11px] text-slate-500">Scheduled for Apr 28</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 opacity-70">
                <Clock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-300">CI/CD Production Deployment</p>
                  <p className="text-[11px] text-slate-500">Scheduled for May 02</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-2xl border border-purple-800/40 p-6">
            <h3 className="text-sm font-bold text-white mb-2">Need Help or Clarification?</h3>
            <p className="text-xs text-slate-300 mb-4">
              Your onboarding plan is validated against company standard repositories. You can request a live mentor session or submit notes to your manager.
            </p>
            <button
              onClick={() => alert('Mentor request sent to John Doe (Staff Infrastructure Engineer)!')}
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

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  UserCheck, CheckCircle2, Clock, AlertCircle, Search,
  ChevronRight, Sparkles, ShieldCheck, Download
} from 'lucide-react';

export const ReviewsView: React.FC = () => {
  const { plans, setSelectedPlanId, setPlanReviewModalOpen, setCurrentView } = useApp();
  const [activeQueue, setActiveQueue] = useState<'Pending Review' | 'Approved' | 'In Progress'>('Pending Review');

  const filteredPlans = plans.filter(p => p.status === activeQueue);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-2">
            <UserCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Management Authorization Queue</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Review & Approval Dashboard</h1>
          <p className="text-slate-400 text-sm">
            Inspect curriculum citations, validation discrepancies, and sign off on onboarding pipelines.
          </p>
        </div>
      </div>

      {/* Queue Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-purple-900/30 pb-3">
        {(['Pending Review', 'Approved', 'In Progress'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveQueue(tab)}
            className={"px-4 py-2 rounded-xl text-xs font-semibold transition " + (
              activeQueue === tab
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "bg-slate-900 text-slate-400 hover:text-white"
            )}
          >
            {tab} ({plans.filter(p => p.status === tab).length})
          </button>
        ))}
      </div>

      {/* Plans List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.map(plan => (
          <div
            key={plan.id}
            className="bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 flex flex-col justify-between space-y-4 shadow-xl hover:border-purple-600/50 transition group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/20">
                  {plan.id}
                </span>
                <span className={"text-xs px-2.5 py-0.5 rounded-full font-semibold border " + (
                  plan.status === 'Approved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                  plan.status === 'Pending Review' ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                  "bg-purple-500/10 text-purple-300 border-purple-500/30"
                )}>
                  {plan.status}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition">
                  {plan.employeeName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{plan.roleTitle}</p>
                <p className="text-[11px] text-purple-400">{plan.department}</p>
              </div>

              <div className="pt-3 border-t border-purple-900/20 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Duration Target:</span>
                  <span className="text-white font-medium">{plan.targetCompletion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rule Validation Score:</span>
                  <span className="text-emerald-400 font-bold">{plan.validationScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Curriculum Modules:</span>
                  <span className="text-white font-medium">{plan.modules.length} Core Modules</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-purple-900/30 flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedPlanId(plan.id);
                  setCurrentView('planDetails');
                }}
                className="flex-1 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                Inspect Plan
              </button>
              <button
                onClick={() => {
                  setSelectedPlanId(plan.id);
                  setPlanReviewModalOpen(true);
                }}
                className="flex-1 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-md transition"
              >
                Sign Off
              </button>
            </div>
          </div>
        ))}

        {filteredPlans.length === 0 && (
          <div className="col-span-full p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-purple-900/20">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2 opacity-80" />
            <p className="font-semibold text-white">No plans in the {activeQueue} queue</p>
            <p className="text-xs mt-1">All onboarding pipelines in this state have been reviewed.</p>
          </div>
        )}
      </div>
    </div>
  );
};

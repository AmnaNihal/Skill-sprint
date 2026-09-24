import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, UserCheck, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';

export const PlanReviewModal: React.FC = () => {
  const { planReviewModalOpen, setPlanReviewModalOpen, plans, selectedPlanId, updatePlanStatus, addToast } = useApp();
  const [feedback, setFeedback] = useState('Validated all module citations against DOC-001..DOC-004. Ready for production release.');

  if (!planReviewModalOpen) return null;

  const currentPlan = plans.find(p => p.id === selectedPlanId) || plans[0];

  const handleApprove = () => {
    updatePlanStatus(currentPlan.id, 'Approved');
    addToast('Plan ' + currentPlan.id + ' approved and finalized!', 'success');
    setPlanReviewModalOpen(false);
  };

  const handleReject = () => {
    updatePlanStatus(currentPlan.id, 'Pending Review');
    addToast('Plan returned with requested revision notes.', 'info');
    setPlanReviewModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-purple-800/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-purple-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Manager Review & Sign-Off</h3>
              <p className="text-xs text-slate-400">Authorizing onboarding packet for {currentPlan.employeeName}</p>
            </div>
          </div>
          <button
            onClick={() => setPlanReviewModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-purple-900/30 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Employee:</span>
              <span className="text-white font-bold">{currentPlan.employeeName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Target Role:</span>
              <span className="text-purple-300 font-semibold">{currentPlan.roleTitle}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Validation Status:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 98% Rule Engine Match
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Reviewer Notes & Sign-Off Comments
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-purple-900/30">
            <button
              onClick={handleReject}
              className="px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
            >
              Request Revisions
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlanReviewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Sign Off & Authorize
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

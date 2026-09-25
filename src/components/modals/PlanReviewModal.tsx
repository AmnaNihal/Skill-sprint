import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { X, UserCheck, Shield, CheckCircle2 } from 'lucide-react';

export const PlanReviewModal: React.FC = () => {
  const { planReviewModalOpen, setPlanReviewModalOpen, addToast, selectedPlanId } = useApp();
  const [feedback, setFeedback] = useState(
    'Validated all module citations against approved source documents. Ready for production release.',
  );
  const [busy, setBusy] = useState(false);
  const [planId, setPlanId] = useState('');

  useEffect(() => {
    if (planReviewModalOpen && selectedPlanId) setPlanId(selectedPlanId);
  }, [planReviewModalOpen, selectedPlanId]);

  if (!planReviewModalOpen) return null;

  const submit = async (decision: 'Approved' | 'Rejected') => {
    if (!planId.trim()) {
      addToast('Enter Plan ID (e.g. PLAN-ABC123)', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.post('/plans/review', {
        plan_id: planId.trim(),
        decision,
        comment: feedback,
        override_result: decision,
      });
      addToast(
        decision === 'Approved'
          ? `Plan ${planId} approved and finalized!`
          : `Plan ${planId} returned with revision notes.`,
        decision === 'Approved' ? 'success' : 'info',
      );
      setPlanReviewModalOpen(false);
      setPlanId('');
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Review failed', 'error');
    } finally {
      setBusy(false);
    }
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
              <p className="text-xs text-slate-400">Authorizes plan status in Supabase + audit trail</p>
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
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Plan ID
            </label>
            <input
              type="text"
              value={planId}
              onChange={e => setPlanId(e.target.value)}
              placeholder="PLAN-XXXXXX"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-purple-900/30 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Decision writes to:</span>
              <span className="text-purple-300 font-mono">onboarding_plans.status</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Audit:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> audit_logs + review_queue
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Override:</span>
              <span className="text-slate-300">Original + reviewer decision both retained</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Reviewer Notes & Sign-Off Comments
            </label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-purple-900/30">
            <button
              onClick={() => submit('Rejected')}
              disabled={busy}
              className="px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl transition disabled:opacity-50"
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
                onClick={() => submit('Approved')}
                disabled={busy}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Shield className="w-4 h-4" />
                {busy ? 'Saving…' : 'Sign Off & Authorize'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

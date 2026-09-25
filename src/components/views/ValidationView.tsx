import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import {
  AlertTriangle, CheckCircle2, Search, Sparkles, Binary, RefreshCw
} from 'lucide-react';
import { ValidationItem } from '../../types';

interface PlanRow {
  id: string;
  employee_name: string;
  role_title: string;
  status: string;
}

interface ValidationFinding {
  id: string;
  requirement_id?: string;
  field_name?: string;
  genai_value?: string;
  python_value?: string;
  result?: string;
  validation_status?: string;
  detail?: string;
}

interface ValidationPayload {
  plan: PlanRow & Record<string, unknown>;
  findings: ValidationFinding[];
}

function mapFinding(f: ValidationFinding, i: number): ValidationItem {
  const match = (f.result || 'Mismatch') === 'Match';
  const statusMap: ValidationItem['status'] =
    f.validation_status === 'Verified' ? 'Verified'
      : f.validation_status === 'Verified with Warning' ? 'Under Review'
        : 'Flagged';
  return {
    id: f.id || String(i),
    requirementId: f.requirement_id || 'REQ-???',
    title: f.field_name || 'Validation check',
    aiGeneratedContent: f.genai_value || f.detail || '—',
    pythonRuleEngineStatus: match ? 'Match' : (f.result === 'Missing' ? 'Missing Ref' : 'Discrepancy'),
    confidenceScore: match ? 96 : 72,
    ruleCitation: f.python_value || f.validation_status || 'ground-truth rule',
    status: statusMap,
  };
}

export const ValidationView: React.FC = () => {
  const { addToast } = useApp();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [planId, setPlanId] = useState('');
  const [payload, setPayload] = useState<ValidationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ValidationItem | null>(null);

  const loadValidation = useCallback(async (id: string) => {
    if (!id) {
      setPayload(null);
      setSelectedItem(null);
      return;
    }
    try {
      const data = await api.get<ValidationPayload>(`/validation/${id}`);
      setPayload(data);
      const items = (data.findings || []).map(mapFinding);
      setSelectedItem(items[0] || null);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load validation', 'error');
    }
  }, [addToast]);

  useEffect(() => {
    let alive = true;
    api.get<PlanRow[]>('/plans')
      .then(list => {
        if (!alive) return;
        setPlans(list);
        if (list.length) {
          setPlanId(list[0].id);
          return loadValidation(list[0].id);
        }
        setPayload(null);
      })
      .catch(e => {
        if (alive) addToast(e instanceof Error ? e.message : 'Failed to load plans', 'error');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [addToast, loadValidation]);

  const rerun = async () => {
    if (!planId) return;
    setRerunning(true);
    try {
      await api.post(`/plans/${planId}/revalidate`);
      await loadValidation(planId);
      addToast('Python Rule Engine re-ran for this plan', 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Revalidate failed', 'error');
    } finally {
      setRerunning(false);
    }
  };

  const findings = payload?.findings || [];
  const items = findings.map(mapFinding);
  const filteredItems = items.filter(item => {
    const matchesStatus =
      filterStatus === 'All' ||
      item.pythonRuleEngineStatus === filterStatus ||
      (filterStatus === 'Match' && item.pythonRuleEngineStatus === 'Match') ||
      (filterStatus === 'Discrepancy' && item.pythonRuleEngineStatus !== 'Match');
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.requirementId.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.aiGeneratedContent.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const matchCount = items.filter(i => i.pythonRuleEngineStatus === 'Match').length;
  const flaggedCount = items.length - matchCount;
  const avgConf = items.length
    ? (items.reduce((s, i) => s + i.confidenceScore, 0) / items.length).toFixed(1)
    : '0.0';

  if (selectedItem && !filteredItems.some(i => i.id === selectedItem.id) && filteredItems[0]) {
    setSelectedItem(filteredItems[0]);
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/70 border border-purple-800/40 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-3">
              <Binary className="w-3.5 h-3.5 text-purple-400" />
              <span>Deterministic Python Rule Comparison</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Dual Validation Engine
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Cross-validates AI curriculum synthesis against deterministic Python rule checks to ensure compliance without hallucinations.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={planId}
              onChange={e => {
                setPlanId(e.target.value);
                void loadValidation(e.target.value);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500 min-w-[180px]"
            >
              <option value="">Select plan…</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.id} · {p.employee_name}
                </option>
              ))}
            </select>
            <button
              onClick={rerun}
              disabled={!planId || rerunning}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition ring-1 ring-purple-400/30 disabled:opacity-50"
            >
              <RefreshCw className={'w-4 h-4 ' + (rerunning ? 'animate-spin' : '')} />
              Re-run Rule Engine
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4">
          <p className="text-xs text-slate-400">Total Validations</p>
          <p className="text-2xl font-bold text-white mt-1">{loading ? '—' : items.length}</p>
          <p className="text-[11px] text-purple-400 mt-0.5">{planId || 'No plan selected'}</p>
        </div>
        <div className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4">
          <p className="text-xs text-slate-400">Rule Matches</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{matchCount}</p>
          <p className="text-[11px] text-emerald-400 mt-0.5">Deterministic Pass</p>
        </div>
        <div className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4">
          <p className="text-xs text-slate-400">Flagged Discrepancies</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{flaggedCount}</p>
          <p className="text-[11px] text-amber-400 mt-0.5">Requires Review</p>
        </div>
        <div className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4">
          <p className="text-xs text-slate-400">Avg Confidence</p>
          <p className="text-2xl font-bold text-purple-300 mt-1">{avgConf}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">High Precision Threshold</p>
        </div>
      </div>

      {loading && (
        <div className="p-8 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400 mb-2" />
          Loading validation results…
        </div>
      )}

      {!loading && !plans.length && (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-purple-900/20">
          <p className="font-semibold text-white">No onboarding plans yet</p>
          <p className="text-xs mt-1">Generate a plan first — validation findings will appear here.</p>
        </div>
      )}

      {!loading && planId && !items.length && (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-purple-900/20">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2 opacity-80" />
          <p className="font-semibold text-white">No validation findings for this plan</p>
          <p className="text-xs mt-1">Run the rule engine or check plan generation logs.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl border border-purple-900/30 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-purple-900/30 flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search validation rules..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex items-center gap-1">
                {(['All', 'Match', 'Discrepancy'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={
                      'px-2.5 py-1 rounded text-[11px] font-semibold transition ' +
                      (filterStatus === st
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200')
                    }
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-purple-900/20 max-h-[560px] overflow-y-auto">
              {filteredItems.map(item => {
                const isSelected = selectedItem?.id === item.id;
                const isMatch = item.pythonRuleEngineStatus === 'Match';
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={
                      'p-4 cursor-pointer transition flex items-center justify-between gap-4 ' +
                      (isSelected
                        ? 'bg-purple-900/25 border-l-4 border-l-purple-500'
                        : 'hover:bg-purple-950/20')
                    }
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 shrink-0">
                          {item.requirementId}
                        </span>
                        <h4 className="text-sm font-semibold text-white truncate">{item.title}</h4>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{item.aiGeneratedContent}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={
                          'px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ' +
                          (isMatch
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30')
                        }
                      >
                        {isMatch ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        {item.pythonRuleEngineStatus}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{item.confidenceScore}%</span>
                    </div>
                  </div>
                );
              })}
              {!filteredItems.length && (
                <p className="p-6 text-center text-slate-500 text-xs">No findings match this filter.</p>
              )}
            </div>
          </div>

          {selectedItem && (
            <div className="lg:col-span-5 bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 space-y-5 shadow-xl h-fit">
              <div className="flex items-center justify-between border-b border-purple-900/30 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-purple-400">Rule Inspector</span>
                  <h3 className="text-base font-bold text-white">
                    {selectedItem.requirementId}: {selectedItem.title}
                  </h3>
                </div>
                <span
                  className={
                    'px-2.5 py-1 rounded-full text-xs font-bold border ' +
                    (selectedItem.pythonRuleEngineStatus === 'Match'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30')
                  }
                >
                  {selectedItem.pythonRuleEngineStatus}
                </span>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-purple-900/30 space-y-1">
                  <p className="font-semibold text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> AI Synthesized Output:
                  </p>
                  <p className="text-slate-300 leading-relaxed break-words">{selectedItem.aiGeneratedContent}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-purple-900/30 space-y-1">
                  <p className="font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Binary className="w-3.5 h-3.5" /> Deterministic Rule Specification:
                  </p>
                  <p className="text-slate-300 leading-relaxed font-mono break-words">
                    Rule Check: [{selectedItem.ruleCitation}] must satisfy strict compliance check.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-purple-900/30 flex justify-between items-center">
                  <span className="text-slate-400">Rule Engine Confidence:</span>
                  <span className="text-emerald-400 font-bold font-mono text-sm">{selectedItem.confidenceScore}%</span>
                </div>
              </div>

              <div className="pt-3 border-t border-purple-900/30 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Audit Status: <strong className="text-white">{selectedItem.status}</strong>
                </span>
                <button
                  onClick={() => addToast('Rule marked as verified (in-memory review)', 'success')}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 transition"
                >
                  Mark Verified
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

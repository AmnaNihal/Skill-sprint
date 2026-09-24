import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Search,
  Filter, Sparkles, Binary, FileCheck, ArrowRight, RefreshCw,
  ExternalLink, ChevronRight, HelpCircle
} from 'lucide-react';
import { ValidationItem } from '../../types';

export const ValidationView: React.FC = () => {
  const { validationItems, addToast } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ValidationItem | null>(validationItems[0] || null);

  const filteredItems = validationItems.filter(item => {
    const matchesStatus = filterStatus === 'All' || item.status === filterStatus || item.pythonRuleEngineStatus === filterStatus;
    const matchesSearch = item.requirementId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.aiGeneratedContent.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
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
              Cross-validates AI curriculum synthesis against deterministic Python rule checks to ensure 100% compliance without hallucinations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => addToast('Re-running Python Rule Engine across all requirements...', 'info')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition ring-1 ring-purple-400/30"
            >
              <RefreshCw className="w-4 h-4" />
              Re-run Rule Engine
            </button>
          </div>
        </div>
      </div>

      {/* 4 Health Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4">
          <p className="text-xs text-slate-400">Total Validations</p>
          <p className="text-2xl font-bold text-white mt-1">{validationItems.length}</p>
          <p className="text-[11px] text-purple-400 mt-0.5">REQ-001..REQ-004 Audited</p>
        </div>
        <div className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4">
          <p className="text-xs text-slate-400">Rule Matches</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {validationItems.filter(i => i.pythonRuleEngineStatus === 'Match').length}
          </p>
          <p className="text-[11px] text-emerald-400 mt-0.5">Deterministic Pass</p>
        </div>
        <div className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4">
          <p className="text-xs text-slate-400">Flagged Discrepancies</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">
            {validationItems.filter(i => i.pythonRuleEngineStatus !== 'Match').length}
          </p>
          <p className="text-[11px] text-amber-400 mt-0.5">Requires Review</p>
        </div>
        <div className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4">
          <p className="text-xs text-slate-400">Avg Confidence</p>
          <p className="text-2xl font-bold text-purple-300 mt-1">96.8%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">High Precision Threshold</p>
        </div>
      </div>

      {/* Comparison Table & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Table */}
        <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl border border-purple-900/30 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-purple-900/30 flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search validation rules..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex items-center gap-1">
              {(['All', 'Match', 'Discrepancy'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={"px-2.5 py-1 rounded text-[11px] font-semibold transition " + (
                    filterStatus === st
                      ? "bg-purple-600 text-white"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-purple-900/20">
            {filteredItems.map(item => {
              const isSelected = selectedItem?.id === item.id;
              const isMatch = item.pythonRuleEngineStatus === 'Match';
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={"p-4 cursor-pointer transition flex items-center justify-between gap-4 " + (
                    isSelected
                      ? "bg-purple-900/25 border-l-4 border-l-purple-500"
                      : "hover:bg-purple-950/20"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {item.requirementId}
                      </span>
                      <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">{item.aiGeneratedContent}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={"px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 " + (
                      isMatch
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    )}>
                      {isMatch ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {item.pythonRuleEngineStatus}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{item.confidenceScore}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Selected Rule Discrepancy Inspector */}
        {selectedItem && (
          <div className="lg:col-span-5 bg-slate-900/80 rounded-2xl border border-purple-800/40 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-purple-900/30 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-purple-400">Rule Inspector</span>
                <h3 className="text-base font-bold text-white">{selectedItem.requirementId}: {selectedItem.title}</h3>
              </div>
              <span className={"px-2.5 py-1 rounded-full text-xs font-bold border " + (
                selectedItem.pythonRuleEngineStatus === 'Match'
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              )}>
                {selectedItem.pythonRuleEngineStatus}
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-purple-900/30 space-y-1">
                <p className="font-semibold text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> AI Synthesized Output:
                </p>
                <p className="text-slate-300 leading-relaxed">{selectedItem.aiGeneratedContent}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-purple-900/30 space-y-1">
                <p className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Binary className="w-3.5 h-3.5" /> Deterministic Rule Specification:
                </p>
                <p className="text-slate-300 leading-relaxed font-mono">
                  Rule Check: [{selectedItem.ruleCitation}] must satisfy strict compliance check.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-purple-900/30 flex justify-between items-center">
                <span className="text-slate-400">Rule Engine Confidence:</span>
                <span className="text-emerald-400 font-bold font-mono text-sm">{selectedItem.confidenceScore}%</span>
              </div>
            </div>

            <div className="pt-3 border-t border-purple-900/30 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Audit Status: <strong className="text-white">{selectedItem.status}</strong></span>
              <button
                onClick={() => addToast('Rule marked as verified', 'success')}
                className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 transition"
              >
                Mark Verified
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

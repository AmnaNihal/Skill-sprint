import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles, CheckCircle2, Clock, AlertCircle, ArrowRight,
  User, Briefcase, Calendar, Shield, Cpu, RefreshCw
} from 'lucide-react';

export const GeneratePlanView: React.FC = () => {
  const { setCurrentView, addToast, setSelectedPlanId } = useApp();
  const [employeeName, setEmployeeName] = useState('Alice Johnson');
  const [roleTitle, setRoleTitle] = useState('Senior Cloud Infrastructure Engineer');
  const [department, setDepartment] = useState('Platform Infrastructure');
  const [targetCompletion, setTargetCompletion] = useState('30 Days');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisStep, setSynthesisStep] = useState(0);

  const roles = [
    'Senior Cloud Infrastructure Engineer',
    'DevOps Engineer',
    'Fullstack Engineer',
    'Data Platform Engineer',
    'Product Manager'
  ];

  const synthesisStages = [
    'Analyzing role requirement competencies (REQ-001..REQ-007)...',
    'Querying semantic vector store for company technical docs...',
    'Generating structured modules, tasks, and hands-on exercises...',
    'Running deterministic rule validation engine...',
    'Curriculum synthesized with 98% rule accuracy!'
  ];

  const handleGenerate = () => {
    setIsSynthesizing(true);
    setSynthesisStep(0);

    const stepInterval = setInterval(() => {
      setSynthesisStep((prev) => {
        if (prev < synthesisStages.length - 1) {
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          setTimeout(() => {
            setIsSynthesizing(false);
            addToast('Onboarding plan generated and validated successfully!', 'success');
            setSelectedPlanId('PLAN-101');
            setCurrentView('planDetails');
          }, 800);
          return prev;
        }
      });
    }, 900);
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Generative AI Curriculum Synthesis</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Generate Custom Onboarding Plan</h1>
        <p className="text-slate-400 text-sm">
          Select employee profile, role title, and duration to synthesize a fully cited, rule-validated training plan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl border border-purple-900/30 p-6 sm:p-8 space-y-6 shadow-xl">
          <h2 className="text-base font-bold text-white border-b border-purple-900/30 pb-3">
            Employee & Role Parameters
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Employee Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Target Role
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <select
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  {roles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Duration Target
                </label>
                <select
                  value={targetCompletion}
                  onChange={(e) => setTargetCompletion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="14 Days">14 Days (Accelerated)</option>
                  <option value="30 Days">30 Days (Standard)</option>
                  <option value="60 Days">60 Days (Comprehensive)</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isSynthesizing}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSynthesizing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Synthesizing Plan...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate & Validate Plan</span>
              </>
            )}
          </button>
        </div>

        {/* Real-time Status / Simulator Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/80 rounded-2xl border border-purple-900/30 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              AI Synthesis Pipeline
            </h3>

            <div className="space-y-3 pt-2">
              {synthesisStages.map((stg, i) => (
                <div
                  key={i}
                  className={"p-3 rounded-xl border text-xs flex items-center gap-3 transition " + (
                    i < synthesisStep
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : i === synthesisStep && isSynthesizing
                      ? "bg-purple-500/15 border-purple-500/50 text-white font-bold animate-pulse"
                      : "bg-slate-950/40 border-slate-800 text-slate-500"
                  )}
                >
                  {i < synthesisStep ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : i === synthesisStep && isSynthesizing ? (
                    <RefreshCw className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                  )}
                  <span>{stg}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/30 text-xs text-slate-300 space-y-2">
            <p className="font-bold text-purple-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> Deterministic Compliance Gate
            </p>
            <p>
              Generated outputs are passed through Python rule engines to prevent missing requirements or unauthorized citations before approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

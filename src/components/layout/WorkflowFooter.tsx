import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Sparkles, ChevronRight } from 'lucide-react';
import type { NavigationTab } from '../../types';

const tabToPath: Record<NavigationTab, string> = {
  landing: '/',
  auth: '/login',
  dashboard: '/dashboard',
  documents: '/documents',
  matrix: '/matrix',
  generatePlan: '/generate',
  planDetails: '/plans',
  validation: '/validation',
  reviews: '/reviews',
  learnerDashboard: '/learner',
  reports: '/reports',
};

export const WorkflowFooter: React.FC = () => {
  const { setCurrentView } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const workflowSteps: { tab: NavigationTab; label: string; num: string }[] = [
    { tab: 'landing', label: 'Hero', num: '01' },
    { tab: 'auth', label: 'Auth', num: '02' },
    { tab: 'dashboard', label: 'Admin', num: '03' },
    { tab: 'documents', label: 'Docs', num: '04' },
    { tab: 'matrix', label: 'Matrix', num: '05' },
    { tab: 'generatePlan', label: 'Synthesis', num: '06' },
    { tab: 'planDetails', label: 'Plan', num: '07' },
    { tab: 'validation', label: 'Validation', num: '08' },
    { tab: 'reviews', label: 'Approval', num: '09' },
    { tab: 'learnerDashboard', label: 'Learner', num: '10' },
    { tab: 'reports', label: 'Reports', num: '11' },
  ];

  const pathFromTab = (tab: NavigationTab) => tabToPath[tab] || '/dashboard';

  return (
    <footer className="sticky top-0 z-50 h-12 shrink-0 bg-slate-950/95 border-b border-purple-900/40 backdrop-blur-md px-4">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-purple-900/30">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-[11px] font-bold text-white uppercase tracking-wider hidden sm:inline">
            E2E Workflow:
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {workflowSteps.map((step, idx) => {
            const path = pathFromTab(step.tab);
            const isActive = location.pathname === path;
            return (
              <React.Fragment key={step.tab}>
                <button
                  onClick={() => {
                    setCurrentView(step.tab);
                    navigate(path);
                  }}
                  className={
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ' +
                    (isActive
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 border border-purple-400/40 scale-105'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900')
                  }
                >
                  <span className="font-mono text-[10px] opacity-70">{step.num}</span>
                  <span>{step.label}</span>
                </button>
                {idx < workflowSteps.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </footer>
  );
};

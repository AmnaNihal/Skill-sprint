import React from 'react';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

import { LandingView } from './components/views/LandingView';
import { AuthView } from './components/views/AuthView';
import { DashboardView } from './components/views/DashboardView';
import { DocumentsView } from './components/views/DocumentsView';
import { MatrixView } from './components/views/MatrixView';
import { GeneratePlanView } from './components/views/GeneratePlanView';
import { PlanDetailsView } from './components/views/PlanDetailsView';
import { ValidationView } from './components/views/ValidationView';
import { ReviewsView } from './components/views/ReviewsView';
import { LearnerDashboardView } from './components/views/LearnerDashboardView';
import { ReportsView } from './components/views/ReportsView';

import { UploadDocModal } from './components/modals/UploadDocModal';
import { AddRequirementModal } from './components/modals/AddRequirementModal';
import { PlanReviewModal } from './components/modals/PlanReviewModal';
import { QuizModal } from './components/modals/QuizModal';
import { ExportModal } from './components/modals/ExportModal';

import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const App: React.FC = () => {
  const { currentView, toasts, removeToast } = useApp();

  const isStandalonePage = currentView === 'landing' || currentView === 'auth';

  return (
    <div className="min-h-screen bg-[#0b0914] text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {isStandalonePage ? (
        <main className="flex-1">
          {currentView === 'landing' && <LandingView />}
          {currentView === 'auth' && <AuthView />}
        </main>
      ) : (
        <div className="flex flex-1 min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto pb-12">
              {currentView === 'dashboard' && <DashboardView />}
              {currentView === 'documents' && <DocumentsView />}
              {currentView === 'matrix' && <MatrixView />}
              {currentView === 'generatePlan' && <GeneratePlanView />}
              {currentView === 'planDetails' && <PlanDetailsView />}
              {currentView === 'validation' && <ValidationView />}
              {currentView === 'reviews' && <ReviewsView />}
              {currentView === 'learnerDashboard' && <LearnerDashboardView />}
              {currentView === 'reports' && <ReportsView />}
            </main>
          </div>
        </div>
      )}

      {/* Global Interactive Modals */}
      <UploadDocModal />
      <AddRequirementModal />
      <PlanReviewModal />
      <QuizModal />
      <ExportModal />

      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={"pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold animate-slideIn " + (
              toast.type === 'success' ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40' :
              toast.type === 'error' ? 'bg-rose-950/90 text-rose-200 border-rose-500/40' :
              'bg-slate-900/95 text-purple-200 border-purple-500/40'
            )}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-purple-400 shrink-0" />}
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/10 rounded transition ml-2"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

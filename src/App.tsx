import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';

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

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { WorkflowFooter } from './components/layout/WorkflowFooter';

import { UploadDocModal } from './components/modals/UploadDocModal';
import { AddRequirementModal } from './components/modals/AddRequirementModal';
import { PlanReviewModal } from './components/modals/PlanReviewModal';
import { QuizModal } from './components/modals/QuizModal';
import { ExportModal } from './components/modals/ExportModal';

import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-[#0b0914] flex items-center justify-center">
    <div className="text-center space-y-3">
      <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-sm text-purple-300 font-semibold">Loading SkillSprint AI…</p>
    </div>
  </div>
);

const RequireAuth: React.FC<{ children: React.ReactElement; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { currentRole } = useApp();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (adminOnly && user.role === 'learner' && currentRole === 'admin') {
    // allow if explicit learner view; block admin routes for learners
  }
  if (adminOnly && user.role === 'learner') {
    return <Navigate to="/learner" replace />;
  }
  return children;
};

const AppShell: React.FC<{ children: React.ReactElement }> = ({ children }) => (
  <div className="flex flex-1">
    <Sidebar />
    <div className="flex-1 flex flex-col min-w-0">
      <Header />
      <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
    </div>
  </div>
);

export const App: React.FC = () => {
  const { toasts, removeToast } = useApp();
  const { loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[#0b0914] text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      <WorkflowFooter />

      <Routes>
        <Route path="/" element={<LandingView />} />
        <Route path="/login" element={<AuthView />} />
        <Route path="/register" element={<AuthView mode="register" />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth adminOnly>
              <AppShell><DashboardView /></AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/documents"
          element={
            <RequireAuth adminOnly>
              <AppShell><DocumentsView /></AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/matrix"
          element={
            <RequireAuth adminOnly>
              <AppShell><MatrixView /></AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/generate"
          element={
            <RequireAuth adminOnly>
              <AppShell><GeneratePlanView /></AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/plans"
          element={
            <RequireAuth>
              <AppShell><PlanDetailsView /></AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/plans/:planId"
          element={
            <RequireAuth>
              <AppShell><PlanDetailsView /></AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/validation"
          element={
            <RequireAuth adminOnly>
              <AppShell><ValidationView /></AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/reviews"
          element={
            <RequireAuth adminOnly>
              <AppShell><ReviewsView /></AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/learner"
          element={
            <RequireAuth>
              <AppShell><LearnerDashboardView /></AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireAuth adminOnly>
              <AppShell><ReportsView /></AppShell>
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <UploadDocModal />
      <AddRequirementModal />
      <PlanReviewModal />
      <QuizModal />
      <ExportModal />

      <div className="fixed top-5 right-5 z-50 space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold animate-slideIn ' +
              (toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
                : toast.type === 'error'
                  ? 'bg-rose-950/90 text-rose-200 border-rose-500/40'
                  : 'bg-slate-900/95 text-purple-200 border-purple-500/40')
            }
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

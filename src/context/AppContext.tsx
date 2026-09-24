import React, { createContext, useContext, useState } from 'react';
import {
  NavigationTab,
  NavView,
  UserRole,
  DocumentItem,
  RequirementItem,
  OnboardingPlan,
  PlanModule,
  ValidationItem,
  ToastNotification
} from '../types';
import {
  mockDocuments,
  mockRequirements,
  mockPlans,
  mockValidationItems
} from '../data/mockData';

interface AppContextType {
  currentView: NavigationTab;
  setCurrentView: (view: NavigationTab) => void;
  currentRole: UserRole;
  loginAs: (role: UserRole) => void;
  documents: DocumentItem[];
  requirements: RequirementItem[];
  plans: OnboardingPlan[];
  validationItems: ValidationItem[];
  selectedPlanId: string;
  setSelectedPlanId: (id: string) => void;
  uploadModalOpen: boolean;
  setUploadModalOpen: (open: boolean) => void;
  addReqModalOpen: boolean;
  setAddReqModalOpen: (open: boolean) => void;
  planReviewModalOpen: boolean;
  setPlanReviewModalOpen: (open: boolean) => void;
  quizModalOpen: boolean;
  setQuizModalOpen: (open: boolean) => void;
  exportModalOpen: boolean;
  setExportModalOpen: (open: boolean) => void;
  toasts: ToastNotification[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  addDocument: (doc: DocumentItem) => void;
  addRequirement: (req: RequirementItem) => void;
  updatePlanStatus: (planId: string, status: OnboardingPlan['status']) => void;
  toggleTaskCompletion: (planId: string, moduleId: string, taskId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<NavigationTab>('landing');
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [documents, setDocuments] = useState<DocumentItem[]>(mockDocuments);
  const [requirements, setRequirements] = useState<RequirementItem[]>(mockRequirements);
  const [plans, setPlans] = useState<OnboardingPlan[]>(mockPlans);
  const [validationItems, setValidationItems] = useState<ValidationItem[]>(mockValidationItems);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('PLAN-101');

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [addReqModalOpen, setAddReqModalOpen] = useState(false);
  const [planReviewModalOpen, setPlanReviewModalOpen] = useState(false);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const loginAs = (role: UserRole) => {
    setCurrentRole(role);
  };

  const addDocument = (doc: DocumentItem) => {
    setDocuments(prev => [doc, ...prev]);
  };

  const addRequirement = (req: RequirementItem) => {
    setRequirements(prev => [req, ...prev]);
  };

  const updatePlanStatus = (planId: string, status: OnboardingPlan['status']) => {
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, status } : p));
  };

  const toggleTaskCompletion = (planId: string, moduleId: string, taskId: string) => {
    setPlans(prev => prev.map(plan => {
      if (plan.id !== planId) return plan;
      const updatedModules: PlanModule[] = plan.modules.map(mod => {
        if (mod.id !== moduleId) return mod;
        const updatedTasks = mod.tasks.map(t => {
          if (t.id !== taskId) return t;
          return { ...t, completed: !t.completed };
        });
        const allDone = updatedTasks.every(t => t.completed);
        return {
          ...mod,
          tasks: updatedTasks,
          status: allDone ? ('Completed' as const) : ('In Progress' as const)
        };
      });
      const totalTasks = updatedModules.flatMap(m => m.tasks).length;
      const doneTasks = updatedModules.flatMap(m => m.tasks).filter(t => t.completed).length;
      const newProgress = Math.round((doneTasks / (totalTasks || 1)) * 100);
      return {
        ...plan,
        modules: updatedModules,
        progress: newProgress
      };
    }));
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        currentRole,
        loginAs,
        documents,
        requirements,
        plans,
        validationItems,
        selectedPlanId,
        setSelectedPlanId,
        uploadModalOpen,
        setUploadModalOpen,
        addReqModalOpen,
        setAddReqModalOpen,
        planReviewModalOpen,
        setPlanReviewModalOpen,
        quizModalOpen,
        setQuizModalOpen,
        exportModalOpen,
        setExportModalOpen,
        toasts,
        addToast,
        removeToast,
        sidebarCollapsed,
        setSidebarCollapsed,
        addDocument,
        addRequirement,
        updatePlanStatus,
        toggleTaskCompletion
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

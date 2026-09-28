import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles, LayoutDashboard, FileText, Layers,
  Wand2, CheckCircle, ShieldCheck, UserCheck,
  GraduationCap, BarChart3, LogOut, Users
} from 'lucide-react';
import type { NavigationTab } from '../../types';

const tabToPath: Record<NavigationTab, string> = {
  landing: '/',
  auth: '/login',
  dashboard: '/dashboard',
  users: '/users',
  employees: '/employees',
  documents: '/documents',
  matrix: '/matrix',
  generatePlan: '/generate',
  planDetails: '/plans',
  validation: '/validation',
  reviews: '/reviews',
  learnerDashboard: '/learner',
  managerDashboard: '/team',
  reports: '/reports',
};

const pathToTab: Record<string, NavigationTab> = {
  '/': 'landing',
  '/login': 'auth',
  '/register': 'auth',
  '/dashboard': 'dashboard',
  '/users': 'users',
  '/employees': 'employees',
  '/documents': 'documents',
  '/matrix': 'matrix',
  '/generate': 'generatePlan',
  '/plans': 'planDetails',
  '/validation': 'validation',
  '/reviews': 'reviews',
  '/learner': 'learnerDashboard',
  '/team': 'managerDashboard',
  '/reports': 'reports',
};

interface NavItem {
  tab: NavigationTab;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const adminGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ tab: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> }],
  },
  {
    label: 'Workspace',
    items: [
      { tab: 'users', label: 'Admins & Users', icon: <ShieldCheck className="w-4 h-4" /> },
      { tab: 'employees', label: 'Employees', icon: <Users className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { tab: 'documents', label: 'Document Library', icon: <FileText className="w-4 h-4" /> },
      { tab: 'matrix', label: 'Role & Requirement Matrix', icon: <Layers className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Training',
    items: [
      { tab: 'generatePlan', label: 'Generate Plan', icon: <Wand2 className="w-4 h-4" /> },
      { tab: 'planDetails', label: 'Onboarding Plans', icon: <CheckCircle className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Quality',
    items: [
      { tab: 'validation', label: 'Dual Validation', icon: <ShieldCheck className="w-4 h-4" /> },
      { tab: 'reviews', label: 'Review & Sign-Off', icon: <UserCheck className="w-4 h-4" /> },
      { tab: 'reports', label: 'Reports & Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    ],
  },
];

const learnerGroups: NavGroup[] = [
  {
    label: 'My Training',
    items: [
      { tab: 'learnerDashboard', label: 'My Learning', icon: <GraduationCap className="w-4 h-4" /> },
      { tab: 'planDetails', label: 'Plan Inspector', icon: <FileText className="w-4 h-4" /> },
    ],
  },
];

const managerGroups: NavGroup[] = [
  {
    label: 'Team',
    items: [
      { tab: 'managerDashboard', label: 'Team Learning', icon: <Users className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Training',
    items: [
      { tab: 'planDetails', label: 'Onboarding Plans', icon: <CheckCircle className="w-4 h-4" /> },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const { setCurrentView, currentRole } = useApp();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = pathToTab[location.pathname] || 'dashboard';
  const role = (user?.role as 'admin' | 'learner') || currentRole;
  const groups = role === 'admin' ? adminGroups : role === 'learner' ? learnerGroups : managerGroups;

  const go = (tab: NavigationTab) => {
    setCurrentView(tab);
    navigate(tabToPath[tab] || '/dashboard');
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentView('landing');
    navigate('/', { replace: true });
  };

  const initials = (user?.full_name || user?.email || 'U')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');

  return (
    <aside className="w-64 shrink-0 bg-slate-950/90 border-r border-purple-900/30 flex flex-col justify-between sticky top-0 h-screen overflow-y-auto backdrop-blur-md">
      <div>
        <div
          onClick={() => go('landing')}
          className="flex items-center gap-3 px-2 py-3 mb-5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30 group-hover:scale-105 transition">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-purple-400">
              Skillsprint AI
            </h1>
            <p className="text-[10px] text-purple-400 font-mono">Verified Onboarding</p>
          </div>
        </div>

        <div className="mb-4 p-2.5 rounded-xl bg-slate-900/70 border border-purple-900/30 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-200 truncate">{user?.full_name || user?.email || 'Guest'}</p>
            <p className="text-[10px] text-slate-400 capitalize">{role} account</p>
          </div>
        </div>

        <nav className="space-y-5">
          {groups.map(group => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">{group.label}</p>
              <div className="space-y-1">
                {group.items.map(item => {
                  const isActive = currentTab === item.tab;
                  return (
                    <button
                      key={item.tab}
                      onClick={() => go(item.tab)}
                      className={
                        'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition group ' +
                        (isActive
                          ? 'bg-purple-600/20 text-purple-100 border border-purple-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent')
                      }
                    >
                      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-purple-400" />}
                      <span className={isActive ? 'text-purple-300' : 'text-slate-400 group-hover:text-purple-300 transition'}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="pt-4 mt-4 border-t border-purple-900/30">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
        >
          <LogOut className="w-4 h-4" /> Log out
        </button>
      </div>
    </aside>
  );
};

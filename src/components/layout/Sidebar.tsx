import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles, LayoutDashboard, FileText, Layers,
  Wand2, CheckCircle, ShieldCheck, UserCheck,
  GraduationCap, BarChart3, LogOut
} from 'lucide-react';
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

const pathToTab: Record<string, NavigationTab> = {
  '/': 'landing',
  '/login': 'auth',
  '/register': 'auth',
  '/dashboard': 'dashboard',
  '/documents': 'documents',
  '/matrix': 'matrix',
  '/generate': 'generatePlan',
  '/plans': 'planDetails',
  '/validation': 'validation',
  '/reviews': 'reviews',
  '/learner': 'learnerDashboard',
  '/reports': 'reports',
};

export const Sidebar: React.FC = () => {
  const { setCurrentView, currentRole, loginAs } = useApp();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = pathToTab[location.pathname] || 'dashboard';
  const role = (user?.role as 'admin' | 'learner') || currentRole;

  const adminNavItems: { tab: NavigationTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { tab: 'dashboard', label: 'Admin Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { tab: 'documents', label: 'Document Library', icon: <FileText className="w-4 h-4" /> },
    { tab: 'matrix', label: 'Role & Req Matrix', icon: <Layers className="w-4 h-4" /> },
    { tab: 'generatePlan', label: 'Generate Plan', icon: <Wand2 className="w-4 h-4" /> },
    { tab: 'planDetails', label: 'Onboarding Plans', icon: <CheckCircle className="w-4 h-4" /> },
    { tab: 'validation', label: 'Dual Validation', icon: <ShieldCheck className="w-4 h-4" />, badge: '98%' },
    { tab: 'reviews', label: 'Review & Sign-Off', icon: <UserCheck className="w-4 h-4" />, badge: '1' },
    { tab: 'reports', label: 'Reports & Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const learnerNavItems: { tab: NavigationTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { tab: 'learnerDashboard', label: 'My Curriculum', icon: <GraduationCap className="w-4 h-4" />, badge: '65%' },
    { tab: 'planDetails', label: 'Plan Inspector', icon: <FileText className="w-4 h-4" /> },
  ];

  const navItems = role === 'admin' ? adminNavItems : learnerNavItems;

  const go = (tab: NavigationTab) => {
    setCurrentView(tab);
    navigate(tabToPath[tab] || '/dashboard');
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentView('landing');
    navigate('/', { replace: true });
  };

  const handleSwitchRole = () => {
    const next = role === 'admin' ? 'learner' : 'admin';
    loginAs(next);
    go(next === 'admin' ? 'dashboard' : 'learnerDashboard');
  };

  const initials = (user?.full_name || user?.email || 'U')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');

  return (
    <aside className="w-64 shrink-0 bg-slate-950/90 border-r border-purple-900/30 flex flex-col justify-between p-4 sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto backdrop-blur-md">
      <div>
        <div
          onClick={() => go('landing')}
          className="flex items-center gap-3 px-2 py-3 mb-6 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30 group-hover:scale-105 transition">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-purple-400">
              Skillsprint AI
            </h1>
            <p className="text-[10px] text-purple-400 font-mono">Dual-Engine Training</p>
          </div>
        </div>

        <div className="mb-6 p-2 rounded-xl bg-purple-950/40 border border-purple-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={'w-2 h-2 rounded-full ' + (role === 'admin' ? 'bg-purple-400' : 'bg-emerald-400')} />
            <span className="text-xs font-semibold text-slate-200 capitalize">{role} Mode</span>
          </div>
          <button
            onClick={handleSwitchRole}
            className="text-[10px] font-bold text-purple-300 hover:text-white px-2 py-0.5 bg-purple-800/40 hover:bg-purple-700/60 rounded border border-purple-700/50 transition"
          >
            Switch
          </button>
        </div>

        <nav className="space-y-1">
          {navItems.map(item => {
            const isActive = currentTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => go(item.tab)}
                className={
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition group ' +
                  (isActive
                    ? 'bg-purple-600/25 text-purple-200 border border-purple-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900')
                }
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-purple-400' : 'text-slate-400 group-hover:text-purple-300'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={
                      'text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ' +
                      (isActive ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400')
                    }
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-purple-900/30">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-purple-900/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-white text-xs font-bold">
              {initials || 'U'}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">
                {user?.full_name || user?.email || 'Guest'}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">{role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

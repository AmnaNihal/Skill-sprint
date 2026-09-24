import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles, LayoutDashboard, FileText, Layers,
  Wand2, CheckCircle, ShieldCheck, UserCheck,
  GraduationCap, BarChart3, ChevronRight, LogOut,
  Users, Building2
} from 'lucide-react';
import { NavigationTab } from '../../types';

export const Sidebar: React.FC = () => {
  const { currentView, setCurrentView, currentRole, loginAs, sidebarCollapsed, setSidebarCollapsed } = useApp();

  const adminNavItems: { tab: NavigationTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { tab: 'dashboard', label: 'Admin Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { tab: 'documents', label: 'Document Library', icon: <FileText className="w-4 h-4" />, badge: '6' },
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

  const navItems = currentRole === 'admin' ? adminNavItems : learnerNavItems;

  return (
    <aside className="w-64 shrink-0 bg-slate-950/90 border-r border-purple-900/30 flex flex-col justify-between p-4 sticky top-0 h-screen overflow-y-auto backdrop-blur-md">
      <div>
        {/* Brand Header */}
        <div
          onClick={() => setCurrentView('landing')}
          className="flex items-center gap-3 px-2 py-2 mb-6 cursor-pointer group"
        >
          <img src="/logo.png" alt="SkillSprint AI" className="h-12 w-auto object-contain rounded-xl drop-shadow-[0_0_15px_rgba(168,85,247,0.4)] group-hover:scale-105 transition" />
        </div>

        {/* Role Mode Switcher Indicator */}
        <div className="mb-6 p-2 rounded-xl bg-purple-950/40 border border-purple-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={"w-2 h-2 rounded-full " + (currentRole === 'admin' ? 'bg-purple-400' : 'bg-emerald-400')} />
            <span className="text-xs font-semibold text-slate-200 capitalize">{currentRole} Mode</span>
          </div>
          <button
            onClick={() => {
              const nextRole = currentRole === 'admin' ? 'learner' : 'admin';
              loginAs(nextRole);
              setCurrentView(nextRole === 'admin' ? 'dashboard' : 'learnerDashboard');
            }}
            className="text-[10px] font-bold text-purple-300 hover:text-white px-2 py-0.5 bg-purple-800/40 hover:bg-purple-700/60 rounded border border-purple-700/50 transition"
          >
            Switch
          </button>
        </div>

        {/* Nav Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentView === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => setCurrentView(item.tab)}
                className={"w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition group " + (
                  isActive
                    ? "bg-purple-600/25 text-purple-200 border border-purple-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? "text-purple-400" : "text-slate-400 group-hover:text-purple-300"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={"text-[10px] px-1.5 py-0.5 rounded font-mono font-bold " + (
                    isActive
                      ? "bg-purple-500 text-white"
                      : "bg-slate-800 text-slate-400"
                  )}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer User Info */}
      <div className="pt-4 border-t border-purple-900/30">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-purple-900/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-white text-xs font-bold">
              {currentRole === 'admin' ? 'JD' : 'AJ'}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">{currentRole === 'admin' ? 'John Doe' : 'Alice Johnson'}</p>
              <p className="text-[10px] text-slate-400">{currentRole === 'admin' ? 'Staff Admin' : 'Cloud Engineer'}</p>
            </div>
          </div>
          <button
            onClick={() => setCurrentView('auth')}
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

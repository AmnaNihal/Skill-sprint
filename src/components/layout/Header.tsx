import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bell, Search, Sparkles, Shield,
  User, CheckCircle2, ChevronDown, ExternalLink
} from 'lucide-react';

export const Header: React.FC = () => {
  const { currentView, currentRole, loginAs, setCurrentView, addToast } = useApp();

  return (
    <header className="h-16 bg-slate-950/80 border-b border-purple-900/30 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* View Title Indicator */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
          {currentRole.toUpperCase()} VIEW
        </span>
        <span className="text-slate-500">•</span>
        <span className="text-sm font-semibold text-slate-300 capitalize">
          {currentView.replace(/([A-Z])/g, ' $1').trim()}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Quick Demo Role Switch Button */}
        <button
          onClick={() => {
            const next = currentRole === 'admin' ? 'learner' : 'admin';
            loginAs(next);
            setCurrentView(next === 'admin' ? 'dashboard' : 'learnerDashboard');
            addToast("Switched to " + next + " view", 'info');
          }}
          className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-purple-900/40 text-xs font-medium text-purple-300 hover:text-white transition"
        >
          <span>Role: <strong className="text-white capitalize">{currentRole}</strong></span>
          <span className="text-[10px] text-slate-500">(Click to toggle)</span>
        </button>

        {/* Landing Page link */}
        <button
          onClick={() => setCurrentView('landing')}
          className="text-xs font-semibold text-slate-400 hover:text-purple-300 transition flex items-center gap-1"
        >
          Landing <ExternalLink className="w-3 h-3" />
        </button>

        {/* Notifications Icon */}
        <button
          onClick={() => addToast('No unread notifications', 'info')}
          className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-purple-500 absolute top-1.5 right-1.5" />
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-purple-900/30">
          <div className="w-7 h-7 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
            {currentRole === 'admin' ? 'JD' : 'AJ'}
          </div>
          <span className="text-xs font-semibold text-slate-200 hidden md:inline">
            {currentRole === 'admin' ? 'John Doe' : 'Alice Johnson'}
          </span>
        </div>
      </div>
    </header>
  );
};

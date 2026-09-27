import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Bell, ExternalLink } from 'lucide-react';

export const Header: React.FC = () => {
  const { currentRole, loginAs, setCurrentView, addToast } = useApp();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = (user?.role as 'admin' | 'learner') || currentRole;
  const viewLabel = location.pathname.replace('/', '') || 'home';

  const switchRole = () => {
    const next = role === 'admin' ? 'learner' : 'admin';
    loginAs(next);
    setCurrentView(next === 'admin' ? 'dashboard' : 'learnerDashboard');
    navigate(next === 'admin' ? '/dashboard' : '/learner');
    addToast('Switched to ' + next + ' view', 'info');
  };

  const logout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const initials = (user?.full_name || user?.email || 'U')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');

  return (
    <header className="h-16 bg-slate-950/80 border-b border-purple-900/30 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
          {role.toUpperCase()} VIEW
        </span>
        <span className="text-slate-500">•</span>
        <span className="text-sm font-semibold text-slate-300 capitalize">{viewLabel}</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={switchRole}
          className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-purple-900/40 text-xs font-medium text-purple-300 hover:text-white transition"
        >
          <span>
            Role: <strong className="text-white capitalize">{role}</strong>
          </span>
          <span className="text-[10px] text-slate-500">(Click to toggle)</span>
        </button>

        <button
          onClick={() => {
            setCurrentView('landing');
            navigate('/');
          }}
          className="text-xs font-semibold text-slate-400 hover:text-purple-300 transition flex items-center gap-1"
        >
          Landing <ExternalLink className="w-3 h-3" />
        </button>

        <button
          onClick={() => addToast('No unread notifications', 'info')}
          className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-purple-500 absolute top-1.5 right-1.5" />
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-purple-900/30">
          <div className="w-7 h-7 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
            {initials || 'U'}
          </div>
          <span className="text-xs font-semibold text-slate-200 hidden md:inline">
            {user?.full_name || user?.email || 'Guest'}
          </span>
          <button
            onClick={logout}
            className="text-[10px] font-bold text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-500/10 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

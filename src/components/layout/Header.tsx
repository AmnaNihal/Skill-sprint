import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Bell, ExternalLink, Repeat } from 'lucide-react';

const TITLES: Record<string, string> = {
  '/dashboard': 'Admin Dashboard',
  '/users': 'Admins & Users',
  '/employees': 'Employees',
  '/documents': 'Document Library',
  '/matrix': 'Role & Requirement Matrix',
  '/generate': 'Generate Onboarding Plan',
  '/plans': 'Onboarding Plans',
  '/validation': 'Dual Validation',
  '/reviews': 'Review & Sign-Off',
  '/learner': 'My Curriculum',
  '/team': 'Team Learning',
  '/reports': 'Reports & Analytics',
};

export const Header: React.FC = () => {
  const { currentRole, loginAs, setCurrentView, addToast } = useApp();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = (user?.role as 'admin' | 'learner') || currentRole;
  const title = TITLES[location.pathname] || location.pathname.replace(/^\//, '').replace(/^\w/, c => c.toUpperCase()) || 'Dashboard';

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
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[10px] font-mono uppercase tracking-wider text-purple-300 font-bold bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
          {role}
        </span>
        <h2 className="text-sm font-semibold text-slate-200 truncate">{title}</h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {(role === 'admin' || role === 'learner') && (
          <button
            onClick={switchRole}
            title={`Switch to ${role === 'admin' ? 'learner' : 'admin'} view`}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-purple-900/40 text-xs font-medium text-slate-300 hover:text-white transition"
          >
            <Repeat className="w-3.5 h-3.5 text-purple-400" />
            <span>Switch view</span>
          </button>
        )}

        <button
          onClick={() => {
            setCurrentView('landing');
            navigate('/');
          }}
          className="hidden md:inline-flex text-xs font-semibold text-slate-400 hover:text-purple-300 transition items-center gap-1"
        >
          Landing <ExternalLink className="w-3 h-3" />
        </button>

        <button
          onClick={() => addToast('No unread notifications', 'info')}
          className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition"
        >
          <Bell className="w-4 h-4" />
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 absolute top-2 right-2" />
        </button>

        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-purple-900/30">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
            {initials || 'U'}
          </div>
          <span className="text-xs font-semibold text-slate-200 hidden lg:inline max-w-[10rem] truncate">
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

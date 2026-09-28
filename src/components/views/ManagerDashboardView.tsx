import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  Users, ClipboardList, TrendingUp, AlertTriangle, RefreshCw, Award, GraduationCap, ExternalLink,
} from 'lucide-react';

interface ManagerEmployee {
  employee_id: string;
  name: string;
  role: string;
  department: string;
  training_status?: string;
  progress: number;
  plan_id?: string | null;
  status?: string;
  verification_status?: string;
}

interface TeamMember {
  id: string | number;
  email: string;
  full_name: string;
  role: string;
  is_active?: boolean;
}

interface ManagerDash {
  company: string;
  totals: {
    employees: number;
    plans: number;
    learning_managers: number;
    managers: number;
    on_track: number;
    behind: number;
    avg_progress: number;
  };
  employees: ManagerEmployee[];
  team: TeamMember[];
}

export const ManagerDashboardView: React.FC = () => {
  const { addToast } = useApp();
  const { user } = useAuth();
  const isTrainingManager = user?.role === 'training_manager';
  const navigate = useNavigate();
  const [data, setData] = useState<ManagerDash | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<ManagerDash>('/dashboard/manager');
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load team dashboard');
      addToast(e instanceof Error ? e.message : 'Failed to load team dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-400 mb-3" />
        Loading team learning…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-12 text-center text-slate-400">
        <AlertTriangle className="w-12 h-12 mx-auto text-amber-400 mb-3" />
        <p className="text-white font-semibold">{error || 'No team data available.'}</p>
        <button onClick={load} className="mt-4 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold">
          Retry
        </button>
      </div>
    );
  }

  const { totals, employees, team } = data;
  const learningManagers = team.filter(t => t.role === 'training_manager');
  const otherMembers = team.filter(t => t.role !== 'training_manager');

  const cards = [
    { label: 'Team Employees', value: String(totals.employees), sub: `${totals.plans} with plans`, icon: <Users className="w-5 h-5" />, tint: 'text-purple-400 bg-purple-500/10' },
    { label: 'Avg Progress', value: `${totals.avg_progress}%`, sub: 'Across all plans', icon: <TrendingUp className="w-5 h-5" />, tint: 'text-sky-400 bg-sky-500/10' },
    { label: 'On Track', value: String(totals.on_track), sub: '≥ 70% complete', icon: <GraduationCap className="w-5 h-5" />, tint: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Behind', value: String(totals.behind), sub: '< 30% complete', icon: <AlertTriangle className="w-5 h-5" />, tint: 'text-rose-400 bg-rose-500/10' },
    { label: 'Learning Managers', value: String(totals.learning_managers), sub: `${totals.managers} managers`, icon: <Award className="w-5 h-5" />, tint: 'text-amber-400 bg-amber-500/10' },
    { label: 'Active Plans', value: String(totals.plans), sub: 'Onboarding plans', icon: <ClipboardList className="w-5 h-5" />, tint: 'text-indigo-400 bg-indigo-500/10' },
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/70 border border-purple-800/40 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-3">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Manager Workspace · Company {data.company || '—'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {isTrainingManager ? 'My Team Learning' : 'Team Learning Overview'}
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            {isTrainingManager
              ? 'The employees assigned to you, with their onboarding progress and plans.'
              : "All learning-manager accounts and every employee's onboarding progress and plans in your company."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-slate-900/70 border border-purple-900/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">{c.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{c.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{c.sub}</p>
            </div>
            <div className={`p-2.5 rounded-xl ${c.tint}`}>{c.icon}</div>
          </div>
        ))}
      </div>

      {/* Employees */}
      <div className="bg-slate-900/80 rounded-2xl border border-purple-900/30 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-purple-900/30 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Employee Progress &amp; Plans</h3>
            <p className="text-xs text-slate-400">Every employee under your company</p>
          </div>
          <span className="text-xs text-slate-500">{employees.length} employees</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/70 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-6 py-3">Employee</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3 min-w-[180px]">Progress</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/20">
              {employees.map(e => (
                <tr key={e.employee_id} className="hover:bg-purple-950/20 transition">
                  <td className="px-6 py-3">
                    <div className="font-semibold text-white">{e.name || '—'}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{e.employee_id}</div>
                  </td>
                  <td className="px-6 py-3 text-slate-300">{e.role || '—'}</td>
                  <td className="px-6 py-3 text-slate-300">{e.department || '—'}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden min-w-[80px]">
                        <div
                          className={'h-full rounded-full ' + (e.progress >= 70 ? 'bg-emerald-400' : e.progress < 30 ? 'bg-rose-400' : 'bg-purple-400')}
                          style={{ width: `${e.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-300 w-10 text-right">{e.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    {e.plan_id ? (
                      <button
                        onClick={() => navigate(`/plans/${e.plan_id}`)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-purple-300 hover:text-white"
                      >
                        {e.status || 'View'} <ExternalLink className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">No plan</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs text-slate-300">{e.verification_status || '—'}</span>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No employees in your company yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 rounded-2xl border border-purple-900/30 overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-purple-900/30 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Learning Managers</h3>
            <span className="ml-auto text-xs text-slate-500">{learningManagers.length}</span>
          </div>
          <div className="divide-y divide-purple-900/20">
            {learningManagers.map(m => (
              <div key={String(m.id)} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{m.full_name}</p>
                  <p className="text-[11px] text-slate-500">{m.email}</p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-300 border-amber-500/30 capitalize">
                  {m.role.replace('_', ' ')}
                </span>
              </div>
            ))}
            {learningManagers.length === 0 && (
              <p className="px-6 py-6 text-center text-xs text-slate-500">No learning-manager accounts yet.</p>
            )}
          </div>
        </div>

        <div className="bg-slate-900/80 rounded-2xl border border-purple-900/30 overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-purple-900/30 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Other Team Accounts</h3>
            <span className="ml-auto text-xs text-slate-500">{otherMembers.length}</span>
          </div>
          <div className="divide-y divide-purple-900/20 max-h-72 overflow-y-auto">
            {otherMembers.map(m => (
              <div key={String(m.id)} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{m.full_name}</p>
                  <p className="text-[11px] text-slate-500">{m.email}</p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-300 border-purple-500/30 capitalize">
                  {m.role.replace('_', ' ')}
                </span>
              </div>
            ))}
            {otherMembers.length === 0 && (
              <p className="px-6 py-6 text-center text-xs text-slate-500">No other team accounts.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

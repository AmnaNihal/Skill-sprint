import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Users, Plus, Search, Shield, X, UserCheck, RefreshCw, Check } from 'lucide-react';

interface UserRow {
  id: string | number;
  email: string;
  full_name: string;
  role: string;
  employee_id?: string | null;
  is_active?: boolean;
  is_master?: boolean;
}

interface EmpOption {
  employee_id: string;
  name: string;
  reporting_manager?: string;
}

const EMPTY = { full_name: '', email: '', password: '', role: 'learner', employee_id: '' };

export const UsersView: React.FC = () => {
  const { addToast } = useApp();
  const { user } = useAuth();
  const isMaster = !!user?.is_master;

  const [users, setUsers] = useState<UserRow[]>([]);
  const [emps, setEmps] = useState<EmpOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [teamUser, setTeamUser] = useState<UserRow | null>(null);
  const [teamSelected, setTeamSelected] = useState<Set<string>>(new Set());
  const [teamSaving, setTeamSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [u, e] = await Promise.all([
        api.get<UserRow[]>('/auth/users'),
        api.get<EmpOption[]>('/employees').catch(() => []),
      ]);
      setUsers(u);
      setEmps(e);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roles = useMemo(() => Array.from(new Set(users.map(u => u.role))).sort(), [users]);

  const filtered = users.filter(u => {
    const q = query.toLowerCase();
    const matches = !q || u.email.toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q);
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return matches && matchesRole;
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || form.password.length < 6) {
      addToast('Email and a 6+ character password are required', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/users', {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
        employee_id: form.employee_id || null,
      });
      addToast(`Account created for ${form.email}`, 'success');
      setModalOpen(false);
      setForm({ ...EMPTY });
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create account', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openTeam = (u: UserRow) => {
    const key = (u.email || '').toLowerCase();
    setTeamUser(u);
    setTeamSelected(
      new Set(emps.filter(e => (e.reporting_manager || '').toLowerCase() === key).map(e => e.employee_id)),
    );
  };

  const toggleEmp = (id: string) => {
    setTeamSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveTeam = async () => {
    if (!teamUser) return;
    setTeamSaving(true);
    try {
      await api.post(`/auth/users/${teamUser.id}/team`, { employee_ids: Array.from(teamSelected) });
      addToast(`Assigned ${teamSelected.size} employee(s) to ${teamUser.full_name}`, 'success');
      setTeamUser(null);
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to assign team', 'error');
    } finally {
      setTeamSaving(false);
    }
  };

  const roleBadge = (role: string) =>
    role === 'admin'
      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
      : role === 'learner'
        ? 'bg-slate-800 text-slate-300 border-slate-700'
        : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-2">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Account &amp; Access Management</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admins &amp; Users</h1>
          <p className="text-slate-400 text-sm">
            {isMaster
              ? 'Create company administrators and user accounts. Each admin manages only their own employees and users.'
              : 'Create login accounts for your employees.'}
          </p>
        </div>
        <button
          onClick={() => {
            setForm({ ...EMPTY, role: isMaster ? 'admin' : 'learner' });
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-purple-600/30 transition ring-1 ring-purple-400/30"
        >
          <Plus className="w-4 h-4" /> {isMaster ? 'Create Admin / User' : 'Create Employee Login'}
        </button>
      </div>

      <div className="bg-slate-900/80 rounded-2xl border border-purple-900/30 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
        >
          <option value="All">All roles</option>
          {roles.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
        <span className="text-xs text-slate-400 self-center sm:ml-auto">{filtered.length} of {users.length} accounts</span>
      </div>

      <div className="bg-slate-900/80 rounded-2xl border border-purple-900/30 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs font-semibold uppercase text-slate-400 border-b border-purple-900/30">
              <tr>
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Linked Employee</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/20">
              {loading && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Loading accounts…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No accounts found.</td></tr>
              )}
              {filtered.map(u => (
                <tr key={String(u.id)} className="hover:bg-purple-950/20 transition">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-white flex items-center gap-2">
                      {u.is_master && <Shield className="w-3.5 h-3.5 text-purple-400" />}
                      {u.full_name || '—'}
                    </div>
                    <div className="text-[11px] text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border capitalize ${roleBadge(u.role)}`}>
                      {u.role}
                    </span>
                    {u.is_master && <span className="ml-2 text-[10px] text-purple-300">master</span>}
                    {u.role === 'admin' && !u.is_master && (
                      <span className="ml-2 text-[10px] text-indigo-300">company</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400">
                    {u.employee_id ? (
                      <span className="inline-flex items-center gap-1"><UserCheck className="w-3 h-3" />{u.employee_id}</span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${u.is_active === false ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                      {u.is_active === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {u.role === 'training_manager' ? (
                      <button
                        onClick={() => openTeam(u)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[11px] font-semibold hover:bg-purple-600 hover:text-white transition"
                      >
                        <Users className="w-3.5 h-3.5" /> Assign Team
                      </button>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-purple-800/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-purple-900/30 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                {isMaster ? 'Create Admin / User Account' : 'Create Employee Login'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={create} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Full name</label>
                <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Company Admin" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Temporary password</label>
                <input type="text" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Role</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500">
                    {isMaster && <option value="admin">admin</option>}
                    <option value="manager">manager</option>
                    <option value="reviewer">reviewer</option>
                    <option value="training_manager">training_manager</option>
                    <option value="learner">learner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Link employee (optional)</label>
                  <select value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500">
                    <option value="">— none —</option>
                    {emps.map(e => <option key={e.employee_id} value={e.employee_id}>{e.name} ({e.employee_id})</option>)}
                  </select>
                </div>
              </div>
              {!isMaster && (
                <p className="text-[11px] text-slate-500">
                  Company administrators can create employee logins but not other administrators.
                </p>
              )}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-purple-900/30">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold disabled:opacity-50">
                  {saving ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {teamUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-purple-800/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-purple-900/30 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Assign Team</h3>
                <p className="text-xs text-slate-400">{teamUser.full_name} · {teamUser.email}</p>
              </div>
              <button onClick={() => setTeamUser(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-400 mb-3">
                Select the employees that report to this training manager ({teamSelected.size} selected).
              </p>
              <div className="max-h-72 overflow-y-auto space-y-1.5">
                {emps.length === 0 && <p className="text-xs text-slate-500">No employees available to assign.</p>}
                {emps.map(e => {
                  const checked = teamSelected.has(e.employee_id);
                  return (
                    <button
                      type="button"
                      key={e.employee_id}
                      onClick={() => toggleEmp(e.employee_id)}
                      className={
                        'w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition ' +
                        (checked ? 'bg-purple-600/20 border-purple-500/40' : 'bg-slate-950/60 border-purple-900/30 hover:bg-slate-800')
                      }
                    >
                      <span className={
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0 ' +
                        (checked ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-600')
                      }>
                        {checked && <Check className="w-3 h-3" />}
                      </span>
                      <span className="text-xs text-slate-200">{e.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono ml-auto">{e.employee_id}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-5 border-t border-purple-900/30 flex items-center justify-end gap-3">
              <button onClick={() => setTeamUser(null)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">Cancel</button>
              <button
                onClick={saveTeam}
                disabled={teamSaving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold disabled:opacity-50"
              >
                {teamSaving ? 'Saving…' : 'Save Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

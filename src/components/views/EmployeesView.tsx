import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import {
  Users, Plus, Search, Pencil, Trash2, X, GraduationCap, Building2, Calendar, UserCheck,
} from 'lucide-react';

interface TrainingPlan {
  plan_id: string;
  role: string;
  status: string;
  verification_status: string;
  coverage: number;
  traceability: number;
  progress: number;
  created_at: string;
}

interface Training {
  plans: TrainingPlan[];
  plans_count: number;
  avg_progress: number;
}

interface Employee {
  employee_id: string;
  name: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  experience_level: string;
  joining_date: string | null;
  manager: string;
  training_status: string;
  required_competencies: string[];
  training: Training;
}

const EMPTY_FORM = {
  full_name: '',
  role: '',
  department: '',
  experience_level: 'Beginner',
  joining_date: '',
  manager: '',
  training_status: 'Not Started',
};

export const EmployeesView: React.FC = () => {
  const { addToast } = useApp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [selected, setSelected] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [emps, rolesList] = await Promise.all([
        api.get<Employee[]>('/employees'),
        api.get<{ title: string }[]>('/roles').catch(() => []),
      ]);
      setEmployees(emps);
      setRoles(Array.from(new Set(rolesList.map(r => r.title))).sort());
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const departments = useMemo(
    () => Array.from(new Set(employees.map(e => e.department).filter(Boolean))).sort(),
    [employees],
  );
  const statuses = useMemo(
    () => Array.from(new Set(employees.map(e => e.training_status).filter(Boolean))).sort(),
    [employees],
  );

  const filtered = employees.filter(e => {
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.employee_id.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q);
    const matchesRole = roleFilter === 'All' || e.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || e.training_status === statusFilter;
    return matchesQuery && matchesRole && matchesStatus;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, role: roles[0] || '' });
    setModalOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditingId(e.employee_id);
    setForm({
      full_name: e.name || '',
      role: e.role || '',
      department: e.department || '',
      experience_level: e.experience_level || 'Beginner',
      joining_date: e.joining_date || '',
      manager: e.manager || '',
      training_status: e.training_status || 'Not Started',
    });
    setModalOpen(true);
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.full_name.trim() || !form.role.trim()) {
      addToast('Name and role are required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/employees/${editingId}`, form);
        addToast(`Updated ${editingId}`, 'success');
      } else {
        await api.post('/employees', form);
        addToast('Employee created', 'success');
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (e: Employee) => {
    if (!window.confirm(`Delete ${e.name} (${e.employee_id})?`)) return;
    try {
      await api.del(`/employees/${e.employee_id}`);
      addToast(`Deleted ${e.employee_id}`, 'success');
      if (selected?.employee_id === e.employee_id) setSelected(null);
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const openDetail = async (id: string) => {
    try {
      setSelected(await api.get<Employee>(`/employees/${id}`));
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load profile', 'error');
    }
  };

  const statusColor = (s: string) =>
    s === 'Completed'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      : s === 'In Progress'
        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
        : 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-2">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Employee Profile Management</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Employees</h1>
          <p className="text-slate-400 text-sm">
            Maintain employee role, department, experience, joining date, and training information.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-purple-600/30 transition ring-1 ring-purple-400/30"
        >
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      <div className="bg-slate-900/80 rounded-2xl border border-purple-900/30 p-4 flex flex-col lg:flex-row gap-3">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, ID, role, department..."
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
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
        >
          <option value="All">All training statuses</option>
          {statuses.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400 self-center lg:ml-auto">
          {filtered.length} of {employees.length} employees
        </span>
      </div>

      <div className="bg-slate-900/80 rounded-2xl border border-purple-900/30 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs font-semibold uppercase text-slate-400 border-b border-purple-900/30">
              <tr>
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Role / Dept</th>
                <th className="px-5 py-4">Experience</th>
                <th className="px-5 py-4">Joining</th>
                <th className="px-5 py-4">Manager</th>
                <th className="px-5 py-4">Training</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/20">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">Loading employees…</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">No employees found.</td>
                </tr>
              )}
              {filtered.map(e => (
                <tr key={e.employee_id} className="hover:bg-purple-950/20 transition">
                  <td className="px-5 py-4">
                    <button onClick={() => openDetail(e.employee_id)} className="text-left group">
                      <div className="font-mono text-[11px] font-bold text-purple-300">{e.employee_id}</div>
                      <div className="font-semibold text-white group-hover:text-purple-300 transition">{e.name}</div>
                      {e.email && <div className="text-[10px] text-slate-500">{e.email}</div>}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-xs text-slate-200">{e.role}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {e.department || '—'}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-300">{e.experience_level}</td>
                  <td className="px-5 py-4 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{e.joining_date || '—'}</span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400">{e.manager || '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusColor(e.training_status)}`}>
                      {e.training_status}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {e.training?.plans_count || 0} plans · {e.training?.avg_progress || 0}% progress
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <button onClick={() => openDetail(e.employee_id)} title="View profile" className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-slate-800 transition">
                      <UserCheck className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(e)} title="Edit" className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(e)} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="bg-slate-900/80 rounded-2xl border border-purple-900/30 p-6 shadow-xl space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-mono text-xs font-bold text-purple-300">{selected.employee_id}</div>
              <h2 className="text-lg font-bold text-white">{selected.name}</h2>
              <p className="text-xs text-slate-400">{selected.role} · {selected.department || '—'} · {selected.experience_level}</p>
            </div>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/70 border border-purple-900/30 rounded-xl p-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-400" /> Training Plans ({selected.training?.plans_count || 0})
              </h3>
              {(selected.training?.plans || []).length === 0 && (
                <p className="text-xs text-slate-500">No onboarding plans assigned yet.</p>
              )}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(selected.training?.plans || []).map(p => (
                  <div key={p.plan_id} className="text-xs bg-slate-900/70 border border-purple-900/20 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200">Plan #{p.plan_id}</span>
                      <span className="text-slate-400">{p.progress}%</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {p.status} · {p.verification_status} · coverage {p.coverage}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-950/70 border border-purple-900/30 rounded-xl p-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                Required Competencies ({selected.required_competencies?.length || 0})
              </h3>
              <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto">
                {(selected.required_competencies || []).map((c, i) => (
                  <span key={`${c}-${i}`} className="text-[10px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded">
                    {c}
                  </span>
                ))}
                {(!selected.required_competencies || selected.required_competencies.length === 0) && (
                  <p className="text-xs text-slate-500">No competencies mapped for this role.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-purple-800/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-purple-900/30 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                {editingId ? `Edit ${editingId}` : 'Add Employee'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Full name</label>
                <input
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                  placeholder="e.g. Ahmed Khan"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Role</label>
                  <input
                    list="role-options"
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                    placeholder="Select or type a role"
                  />
                  <datalist id="role-options">
                    {roles.map(r => <option key={r} value={r} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Department</label>
                  <input
                    list="dept-options"
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                    placeholder="e.g. Engineering"
                  />
                  <datalist id="dept-options">
                    {departments.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Experience</label>
                  <select
                    value={form.experience_level}
                    onChange={e => setForm({ ...form, experience_level: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Joining date</label>
                  <input
                    type="date"
                    value={form.joining_date}
                    onChange={e => setForm({ ...form, joining_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Reporting manager</label>
                  <input
                    value={form.manager}
                    onChange={e => setForm({ ...form, manager: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                    placeholder="e.g. Sarah Malik"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Training status</label>
                  <select
                    value={form.training_status}
                    onChange={e => setForm({ ...form, training_status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option>Not Started</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </div>
              </div>
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-purple-900/30">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

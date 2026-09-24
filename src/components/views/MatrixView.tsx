import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Layers, Plus, Filter, Search, Shield,
  CheckCircle2, AlertTriangle, ArrowUpDown, SlidersHorizontal,
  Bookmark, CheckSquare, Sparkles, Building2
} from 'lucide-react';
import { RequirementCategory, PriorityLevel } from '../../types';

export const MatrixView: React.FC = () => {
  const { requirements, setAddReqModalOpen, addToast } = useApp();
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [mandatoryOnly, setMandatoryOnly] = useState(false);

  const rolesList = ['All', 'DevOps Engineer', 'Senior Cloud Infrastructure Engineer', 'Fullstack Engineer', 'Data Platform Engineer', 'Product Manager'];
  const categoriesList: (string | RequirementCategory)[] = ['All', 'Architecture', 'Security', 'Operations', 'Compliance', 'Tooling', 'Domain Knowledge'];

  const filteredRequirements = requirements.filter(req => {
    const matchesRole = selectedRole === 'All' || req.role === selectedRole;
    const matchesCategory = selectedCategory === 'All' || req.category === selectedCategory;
    const matchesSearch = req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          req.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMandatory = !mandatoryOnly || req.mandatory;
    return matchesRole && matchesCategory && matchesSearch && matchesMandatory;
  });

  const getPriorityBadge = (p: PriorityLevel) => {
    switch (p) {
      case 'P1': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'P2': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'P3': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getCategoryColor = (cat: RequirementCategory) => {
    switch (cat) {
      case 'Security': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'Architecture': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'Operations': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'Compliance': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-2">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Role-Requirement Alignment Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Role & Requirement Matrix</h1>
          <p className="text-slate-400 text-sm">
            Map granular training competencies, compliance checks, and prerequisite knowledge across organization roles.
          </p>
        </div>

        <button
          onClick={() => setAddReqModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-purple-600/30 transition ring-1 ring-purple-400/30"
        >
          <Plus className="w-4 h-4" />
          Add Requirement
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 rounded-2xl border border-purple-900/30 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row items-center gap-4 justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID (REQ-001), keyword, or title..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Role:</span>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition"
              >
                {rolesList.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition"
              >
                {categoriesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Mandatory Toggle */}
            <button
              onClick={() => setMandatoryOnly(!mandatoryOnly)}
              className={"px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 " + (
                mandatoryOnly
                  ? "bg-purple-600/30 text-purple-200 border-purple-500"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
              )}
            >
              <Shield className="w-3.5 h-3.5" />
              Mandatory Only
            </button>
          </div>
        </div>

        {/* Quick Role Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-purple-900/20">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Roles:</span>
          {rolesList.map(role => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={"px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition border " + (
                selectedRole === role
                  ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30"
                  : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
              )}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Requirements Matrix Table */}
      <div className="bg-slate-900/80 rounded-2xl border border-purple-900/30 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs font-semibold uppercase text-slate-400 border-b border-purple-900/30">
              <tr>
                <th className="px-6 py-4">Req ID & Category</th>
                <th className="px-6 py-4">Title & Description</th>
                <th className="px-6 py-4">Target Role</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Compliance</th>
                <th className="px-6 py-4">Source Doc</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/20">
              {filteredRequirements.map(req => (
                <tr key={req.id} className="hover:bg-purple-950/20 transition group">
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <span className="font-mono text-xs font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {req.id}
                      </span>
                      <div>
                        <span className={"text-[10px] px-2 py-0.5 rounded-full font-medium border " + getCategoryColor(req.category)}>
                          {req.category}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 max-w-sm">
                    <div className="font-semibold text-white group-hover:text-purple-300 transition">
                      {req.title}
                    </div>
                    <div className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                      {req.description}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 font-medium bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                      <Building2 className="w-3.5 h-3.5 text-purple-400" />
                      {req.role}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={"text-xs px-2.5 py-0.5 rounded-full font-bold border " + getPriorityBadge(req.priority)}>
                      {req.priority}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {req.mandatory ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mandatory
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">
                        Optional
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-mono text-purple-300 bg-slate-950 px-2 py-1 rounded border border-purple-900/40">
                      {req.sourceDocId}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => addToast("Requirement " + req.id + " details copied", 'info')}
                      className="px-3 py-1 text-xs font-medium text-purple-300 hover:text-white bg-purple-900/20 hover:bg-purple-600/40 rounded-lg border border-purple-800/40 transition"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRequirements.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <AlertTriangle className="w-10 h-10 mx-auto text-amber-400 mb-2 opacity-80" />
            <p className="font-semibold text-white">No requirements match the current filters</p>
            <p className="text-xs mt-1">Try relaxing your search query or selecting 'All' roles.</p>
          </div>
        )}
      </div>

      {/* Summary Footer Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-purple-900/30 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400">Total Requirements</p>
          <p className="text-2xl font-bold text-white mt-1">{requirements.length}</p>
        </div>
        <div className="bg-slate-900/60 border border-purple-900/30 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400">Mandatory Rules</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{requirements.filter(r => r.mandatory).length}</p>
        </div>
        <div className="bg-slate-900/60 border border-purple-900/30 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400">P1 Critical Items</p>
          <p className="text-2xl font-bold text-rose-400 mt-1">{requirements.filter(r => r.priority === 'P1').length}</p>
        </div>
        <div className="bg-slate-900/60 border border-purple-900/30 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400">Active Roles Covered</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">10</p>
        </div>
      </div>
    </div>
  );
};

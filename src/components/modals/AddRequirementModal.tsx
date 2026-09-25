import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { X, Plus, Layers } from 'lucide-react';
import type { RequirementCategory, PriorityLevel } from '../../types';

export const AddRequirementModal: React.FC = () => {
  const { addReqModalOpen, setAddReqModalOpen, addToast } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [role, setRole] = useState('Customer Success Coordinator');
  const [category, setCategory] = useState<RequirementCategory>('Compliance');
  const [priority, setPriority] = useState<PriorityLevel>('P1');
  const [mandatory, setMandatory] = useState(true);
  const [sourceDocId, setSourceDocId] = useState('NSF-HBK');
  const [requirementType, setRequirementType] = useState('Must Complete');
  const [busy, setBusy] = useState(false);

  if (!addReqModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      addToast('Please fill out all requirement fields', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ id: string }>('/requirements', {
        role,
        requirement: description || title,
        title,
        description,
        category,
        competency: category,
        mandatory,
        priority: priority === 'P1' ? 'Critical' : priority === 'P2' ? 'High' : priority === 'P3' ? 'Medium' : priority,
        due_stage: 'Week 1',
        source_document_id: sourceDocId || null,
        assessment_topic: title,
      });
      addToast(`Requirement ${res.id} created and mapped to role matrix!`, 'success');
      setAddReqModalOpen(false);
      setTitle('');
      setDescription('');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create requirement', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-purple-800/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-purple-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Add Role Competency Requirement</h3>
              <p className="text-xs text-slate-400">Saved to Supabase role_requirement matrix</p>
            </div>
          </div>
          <button
            onClick={() => setAddReqModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Requirement Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Istio Service Mesh MTLS Configuration"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Detailed Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Specify the exact technical competency or verification criteria..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Target Role
              </label>
              <input
                type="text"
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as RequirementCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="Architecture">Architecture</option>
                <option value="Security">Security</option>
                <option value="Operations">Operations</option>
                <option value="Compliance">Compliance</option>
                <option value="Tooling">Tooling</option>
                <option value="Domain Knowledge">Domain Knowledge</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as PriorityLevel)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="P1">P1 Critical</option>
                <option value="P2">P2 High</option>
                <option value="P3">P3 Medium</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Type
              </label>
              <select
                value={requirementType}
                onChange={e => setRequirementType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="Must Know">Must Know</option>
                <option value="Must Complete">Must Complete</option>
                <option value="Must Demonstrate">Must Demonstrate</option>
                <option value="Must Acknowledge">Must Acknowledge</option>
                <option value="Recommended">Recommended</option>
                <option value="Optional">Optional</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pb-1">
              <input
                type="checkbox"
                id="mandatoryCheck"
                checked={mandatory}
                onChange={e => setMandatory(e.target.checked)}
                className="rounded border-purple-800 bg-slate-950 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="mandatoryCheck" className="text-xs font-medium text-slate-300 cursor-pointer">
                Mandatory
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Source Document ID
            </label>
            <input
              type="text"
              value={sourceDocId}
              onChange={e => setSourceDocId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-purple-900/30">
            <button
              type="button"
              onClick={() => setAddReqModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save Requirement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

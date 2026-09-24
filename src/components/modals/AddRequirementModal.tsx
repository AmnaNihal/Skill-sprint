import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Plus, Shield, Layers } from 'lucide-react';
import { RequirementCategory, PriorityLevel } from '../../types';

export const AddRequirementModal: React.FC = () => {
  const { addReqModalOpen, setAddReqModalOpen, addRequirement, addToast } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [role, setRole] = useState('Senior Cloud Infrastructure Engineer');
  const [category, setCategory] = useState<RequirementCategory>('Architecture');
  const [priority, setPriority] = useState<PriorityLevel>('P1');
  const [mandatory, setMandatory] = useState(true);
  const [sourceDocId, setSourceDocId] = useState('DOC-001');

  if (!addReqModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      addToast('Please fill out all requirement fields', 'error');
      return;
    }

    const newId = 'REQ-00' + Math.floor(Math.random() * 900 + 100);
    addRequirement({
      id: newId,
      role,
      category,
      title,
      description,
      priority,
      mandatory,
      sourceDocId
    });

    setAddReqModalOpen(false);
    addToast('Requirement ' + newId + ' created and mapped to role matrix!', 'success');
    setTitle('');
    setDescription('');
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
              <p className="text-xs text-slate-400">Map new onboarding rules and compliance standards</p>
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
              onChange={(e) => setTitle(e.target.value)}
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
              onChange={(e) => setDescription(e.target.value)}
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
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="Senior Cloud Infrastructure Engineer">Senior Cloud Infrastructure Engineer</option>
                <option value="DevOps Engineer">DevOps Engineer</option>
                <option value="Fullstack Engineer">Fullstack Engineer</option>
                <option value="Data Platform Engineer">Data Platform Engineer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RequirementCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="Architecture">Architecture</option>
                <option value="Security">Security</option>
                <option value="Operations">Operations</option>
                <option value="Compliance">Compliance</option>
                <option value="Tooling">Tooling</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="P1">P1 (Critical / Blocker)</option>
                <option value="P2">P2 (High Priority)</option>
                <option value="P3">P3 (Medium Priority)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="mandatoryCheck"
                checked={mandatory}
                onChange={(e) => setMandatory(e.target.checked)}
                className="rounded border-purple-800 bg-slate-950 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="mandatoryCheck" className="text-xs font-medium text-slate-300 cursor-pointer">
                Mandatory for Passing
              </label>
            </div>
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition"
            >
              Save Requirement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

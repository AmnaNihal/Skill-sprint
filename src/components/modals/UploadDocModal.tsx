import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api, ApiError } from '../../lib/api';
import {
  X, Upload, FileText, CheckCircle2, AlertTriangle, Loader2, Sparkles, FileCheck2, ShieldAlert,
} from 'lucide-react';
import type { DocumentCategory } from '../../types';

const CATEGORIES: DocumentCategory[] = [
  'Architecture',
  'Security',
  'DevOps',
  'Data',
  'Company Policy',
  'Human Resources',
  'Compliance',
  'General',
];

interface PreviewRequirement {
  requirement_id?: string;
  id?: string;
  role_title?: string;
  requirement_type?: string;
  mandatory?: boolean;
  title?: string;
  description?: string;
  competency?: string;
}

interface Inspection {
  name: string;
  accepted: boolean;
  stage?: string;
  reason?: string;
  gate?: {
    document_type?: string;
    category?: string;
    department?: string;
    version?: string;
    confidence?: number;
    provider?: string;
    model?: string;
  };
  suggested?: {
    title?: string;
    category?: string;
    department?: string;
    version?: string;
    role_hints?: string[];
  };
  chunks?: number;
  sections?: number;
  requirements_count?: number;
  requirements_preview?: PreviewRequirement[];
  injection_flags?: string[];
  extraction?: { provider?: string; model?: string; sections_read?: number };
}

export const UploadDocModal: React.FC = () => {
  const { uploadModalOpen, setUploadModalOpen, addDocument, addToast } = useApp();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('General');
  const [department, setDepartment] = useState('');
  const [version, setVersion] = useState('1.0');
  const [tags, setTags] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [inspecting, setInspecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  if (!uploadModalOpen) return null;

  const reset = () => {
    setTitle('');
    setTags('');
    setFiles([]);
    setInspections([]);
    setDepartment('');
    setVersion('1.0');
    setCategory('General');
  };

  const inspectFiles = async (selected: File[]) => {
    if (!selected.length) {
      setInspections([]);
      return;
    }
    setInspecting(true);
    const results: Inspection[] = [];
    for (const file of selected) {
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await api.upload<Inspection>('/documents/inspect', form);
        results.push({ ...res, name: file.name });
      } catch (e) {
        results.push({
          name: file.name,
          accepted: false,
          stage: 'error',
          reason: e instanceof Error ? e.message : 'inspection failed',
        });
      }
    }
    setInspections(results);

    // Auto-fill the form from the first accepted document.
    const first = results.find(r => r.accepted && r.suggested);
    if (first?.suggested) {
      setTitle(first.suggested.title || '');
      setDepartment(first.suggested.department || '');
      setVersion(first.suggested.version || '1.0');
      setTags((first.suggested.role_hints || []).join(', '));
      const cat = first.suggested.category as DocumentCategory | undefined;
      if (cat && CATEGORIES.includes(cat)) setCategory(cat);
    }
    setInspecting(false);
  };

  const acceptedNames = new Set(inspections.filter(i => i.accepted).map(i => i.name));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toUpload = files.filter(f => acceptedNames.has(f.name));
    if (!files.length) {
      addToast('Please select one or more document files', 'error');
      return;
    }
    if (!toUpload.length) {
      addToast('No verified company documents to ingest. Fix or remove rejected files.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      let imported = 0;
      let requirements = 0;
      let duplicates = 0;
      let rejected = 0;
      const failures: string[] = [];

      for (const file of toUpload) {
        try {
          const form = new FormData();
          form.append('file', file);
          form.append('title', toUpload.length === 1 ? title || file.name : file.name);
          form.append('category', category);
          form.append('department', department);
          form.append('version', version);
          form.append('role_hint', tags);

          const res = await api.upload<{
            id: string;
            title: string;
            chunks: number;
            requirements_extracted: number;
            injection_flags: string[];
          }>('/documents/upload', form);

          addDocument({
            id: res.id,
            title: res.title,
            category,
            version,
            uploadedAt: 'Just now',
            status: res.injection_flags?.length ? 'Quarantined' : 'Approved',
            fileSize: `${(file.size / 1024).toFixed(1)} KB`,
            chunksCount: res.chunks,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          });
          imported += 1;
          requirements += res.requirements_extracted;
          if (res.injection_flags?.length) {
            addToast(`${res.id} quarantined: ${res.injection_flags.join(', ')}`, 'error');
          }
        } catch (err) {
          const status = err instanceof ApiError ? err.status : 0;
          const message = err instanceof Error ? err.message : 'upload failed';
          if (status === 409) duplicates += 1;
          else if (status === 400) {
            rejected += 1;
            addToast(`${file.name}: ${message}`, 'error');
          } else failures.push(`${file.name}: ${message}`);
        }
      }

      const parts = [`${imported}/${toUpload.length} processed`];
      if (duplicates) parts.push(`${duplicates} duplicate skipped`);
      if (rejected) parts.push(`${rejected} rejected`);
      addToast(`${parts.join(' · ')} · ${requirements} requirements extracted`, imported ? 'success' : 'info');
      if (failures.length) {
        addToast(`${failures.length} file(s) failed`, 'error');
        console.error('Bulk upload failures', failures);
      }
      if (!failures.length && !rejected) {
        setUploadModalOpen(false);
        reset();
      } else {
        setFiles(files.filter(f => !acceptedNames.has(f.name)));
        setInspections(inspections.filter(i => !i.accepted));
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-purple-800/50 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        <div className="p-6 border-b border-purple-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Ingest Knowledge Document</h3>
              <p className="text-xs text-slate-400">Python extract → AI gate → AI requirements. Only verified company documents are added.</p>
            </div>
          </div>
          <button onClick={() => { setUploadModalOpen(false); reset(); }} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Documents (.pdf, .docx)
            </label>
            <label className="border-2 border-dashed border-purple-900/50 hover:border-purple-600/60 rounded-2xl p-6 text-center bg-slate-950/40 cursor-pointer transition block">
              {inspecting ? (
                <Loader2 className="w-8 h-8 text-purple-400 mx-auto mb-2 animate-spin" />
              ) : (
                <FileText className="w-8 h-8 text-purple-400 mx-auto mb-2 opacity-80" />
              )}
              <p className="text-xs text-slate-300 font-medium">
                {inspecting
                  ? 'Processing… extracting text and analysing with AI'
                  : files.length === 1
                    ? files[0].name
                    : files.length
                      ? `${files.length} files selected`
                      : 'Click to select PDF/DOCX files'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Single or multiple · max 25MB each · empty, placeholder, lorem or non-company files are rejected automatically
              </p>
              <input
                type="file"
                accept=".pdf,.docx"
                multiple
                className="hidden"
                onChange={e => {
                  const selected = Array.from(e.target.files ?? []);
                  const preferred = new Map<string, File>();
                  for (const selectedFile of selected) {
                    const stem = selectedFile.name.replace(/\.[^.]+$/, '').toLowerCase();
                    const previous = preferred.get(stem);
                    if (!previous || (selectedFile.name.toLowerCase().endsWith('.docx') && previous.name.toLowerCase().endsWith('.pdf'))) {
                      preferred.set(stem, selectedFile);
                    }
                  }
                  const list = [...preferred.values()];
                  setFiles(list);
                  inspectFiles(list);
                }}
              />
            </label>
          </div>

          {inspections.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Processing results
                <span className="text-slate-500 normal-case font-normal">
                  ({inspections.filter(i => i.accepted).length}/{inspections.length} verified)
                </span>
              </div>
              {inspections.map(item => (
                <div
                  key={item.name}
                  className={
                    'rounded-xl border p-3 text-xs ' +
                    (item.accepted
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-rose-950/20 border-rose-500/30')
                  }
                >
                  <div className="flex items-start gap-2">
                    {item.accepted ? (
                      <FileCheck2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-100 truncate">{item.name}</span>
                        <span className={item.accepted ? 'text-emerald-400' : 'text-rose-400'}>
                          {item.accepted ? 'Verified' : 'Rejected'}
                        </span>
                      </div>

                      {item.accepted ? (
                        <div className="mt-1.5 space-y-1">
                          <div className="text-slate-400">
                            <span className="text-slate-500">Type:</span> {item.gate?.document_type || '—'}
                            {item.gate?.confidence ? ` · confidence ${Math.round((item.gate.confidence || 0) * 100)}%` : ''}
                          </div>
                          <div className="text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>Category: <span className="text-slate-200">{item.suggested?.category || '—'}</span></span>
                            <span>Dept: <span className="text-slate-200">{item.suggested?.department || '—'}</span></span>
                            <span>Version: <span className="text-slate-200">{item.suggested?.version || '—'}</span></span>
                          </div>
                          <div className="text-slate-400">
                            Python: {item.sections || 0} sections · {item.chunks || 0} chunks ·
                            {' '}AI: {item.requirements_count || 0} requirements
                            {item.extraction?.provider ? ` (${item.extraction.provider}/${item.extraction.model || ''})` : ''}
                          </div>
                          {(item.suggested?.role_hints || []).length > 0 && (
                            <div className="text-slate-500">Roles: {(item.suggested?.role_hints || []).join(', ')}</div>
                          )}
                          {(item.requirements_preview || []).length > 0 && (
                            <ul className="mt-1 space-y-0.5 max-h-28 overflow-y-auto pr-1">
                              {(item.requirements_preview || []).slice(0, 6).map((r, i) => (
                                <li key={i} className="text-[11px] text-slate-400 flex gap-1.5">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                                  <span><span className="text-slate-300">{r.title || r.description}</span> — {r.requirement_type} · {r.role_title}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {(item.injection_flags || []).length > 0 && (
                            <div className="text-[11px] text-rose-300 flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" /> Prompt-injection flags: {(item.injection_flags || []).join(', ')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-rose-300 mt-1">
                          {item.reason || 'Not a valid company document'} {item.stage ? `(${item.stage})` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Document Title <span className="text-slate-500 normal-case font-normal">(optional · auto-filled)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. InfoSec Policy v2"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Category <span className="text-slate-500 normal-case font-normal">(optional)</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as DocumentCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Department <span className="text-slate-500 normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="HR / Engineering"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Version <span className="text-slate-500 normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={version}
                onChange={e => setVersion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Role hints <span className="text-slate-500 normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="Sales Executive, HR Executive"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between gap-3 border-t border-purple-900/30">
            <span className="text-[11px] text-slate-500">
              {inspections.length > 0
                ? `${acceptedNames.size} verified file(s) will be ingested`
                : 'Select files to start automatic processing'}
            </span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => { setUploadModalOpen(false); reset(); }} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading || inspecting || acceptedNames.size === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Ingesting…' : inspecting ? 'Analysing…' : 'Start AI Pipeline Ingestion'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

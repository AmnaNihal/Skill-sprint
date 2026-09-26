import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api, ApiError } from '../../lib/api';
import { X, Upload, FileText } from 'lucide-react';
import type { DocumentCategory } from '../../types';

export const UploadDocModal: React.FC = () => {
  const { uploadModalOpen, setUploadModalOpen, addDocument, addToast } = useApp();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Architecture');
  const [department, setDepartment] = useState('');
  const [version, setVersion] = useState('1.0');
  const [tags, setTags] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  if (!uploadModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length) {
      addToast('Please select one or more document files', 'error');
      return;
    }

    setIsUploading(true);
    try {
      let imported = 0;
      let requirements = 0;
      let duplicates = 0;
      let rejected = 0;
      const failures: string[] = [];

      for (const file of files) {
        try {
          const form = new FormData();
          form.append('file', file);
          form.append('title', files.length === 1 ? title || file.name : file.name);
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
          if (status === 409) {
            // Already stored (same content) — treat as skipped, not a failure.
            duplicates += 1;
          } else if (status === 400) {
            // Rejected because empty / placeholder / invalid — show the reason.
            rejected += 1;
            addToast(`${file.name}: ${message}`, 'error');
          } else {
            failures.push(`${file.name}: ${message}`);
          }
        }
      }

      const parts = [`${imported}/${files.length} processed`];
      if (duplicates) parts.push(`${duplicates} duplicate skipped`);
      if (rejected) parts.push(`${rejected} rejected`);
      addToast(`${parts.join(' · ')} · ${requirements} requirements extracted`, imported ? 'success' : 'info');
      if (failures.length) {
        addToast(`${failures.length} file(s) failed`, 'error');
        console.error('Bulk upload failures', failures);
      }
      if (!failures.length && !rejected) setUploadModalOpen(false);
      setTitle('');
      setTags('');
      setFiles([]);
      setDepartment('');
      setVersion('1.0');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-purple-800/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-purple-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Ingest Knowledge Document</h3>
              <p className="text-xs text-slate-400">Python extract → chunk → AI requirements. Single or multiple PDF/DOCX.</p>
            </div>
          </div>
          <button
            onClick={() => setUploadModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Document Title <span className="text-slate-500 normal-case font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. InfoSec Policy v2"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Category <span className="text-slate-500 normal-case font-normal">(optional)</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as DocumentCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="Architecture">Architecture</option>
                <option value="Security">Security</option>
                <option value="DevOps">DevOps</option>
                <option value="Data">Data</option>
                <option value="Company Policy">Company Policy</option>
              </select>
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                Role hints (comma) <span className="text-slate-500 normal-case font-normal">(optional)</span>
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

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Documents (.pdf, .docx)
            </label>
            <label className="border-2 border-dashed border-purple-900/50 hover:border-purple-600/60 rounded-2xl p-6 text-center bg-slate-950/40 cursor-pointer transition block">
              <FileText className="w-8 h-8 text-purple-400 mx-auto mb-2 opacity-80" />
              <p className="text-xs text-slate-300 font-medium">
                {files.length === 1 ? files[0].name : files.length ? `${files.length} files selected` : 'Click to select PDF/DOCX files'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Single or multiple · max 25MB each · empty or placeholder files are rejected
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
                  setFiles([...preferred.values()]);
                }}
              />
            </label>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-purple-900/30">
            <button
              type="button"
              onClick={() => setUploadModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
            >
              {isUploading ? `Processing ${files.length} document(s)…` : 'Start AI Pipeline Ingestion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

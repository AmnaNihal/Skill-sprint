import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { DocumentCategory } from '../../types';

export const UploadDocModal: React.FC = () => {
  const { uploadModalOpen, setUploadModalOpen, addDocument, addToast } = useApp();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Architecture');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!uploadModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      addToast('Please provide a document title', 'error');
      return;
    }

    setIsUploading(true);
    setTimeout(() => {
      const docId = 'DOC-00' + Math.floor(Math.random() * 900 + 100);
      addDocument({
        id: docId,
        title,
        category,
        version: '1.0',
        uploadedAt: 'Just now',
        status: 'Approved',
        fileSize: file ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' : '1.8 MB',
        chunksCount: Math.floor(Math.random() * 20 + 10),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean)
      });
      setIsUploading(false);
      setUploadModalOpen(false);
      addToast('Document ' + docId + ' uploaded & parsed into vector chunks!', 'success');
      setTitle('');
      setTags('');
      setFile(null);
    }, 1000);
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
              <p className="text-xs text-slate-400">Upload technical specifications into the 6-stage pipeline</p>
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
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AWS Multi-Region Terraform Blueprint"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
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
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="aws, terraform, iac"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Source File (.pdf, .md, .docx, .json)
            </label>
            <div className="border-2 border-dashed border-purple-900/50 hover:border-purple-600/60 rounded-2xl p-6 text-center bg-slate-950/40 cursor-pointer transition">
              <FileText className="w-8 h-8 text-purple-400 mx-auto mb-2 opacity-80" />
              <p className="text-xs text-slate-300 font-medium">Click or drag & drop document file here</p>
              <p className="text-[10px] text-slate-500 mt-1">Up to 50MB per file with automatic OCR & AST parsing</p>
            </div>
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
              {isUploading ? 'Processing Pipeline...' : 'Start Pipeline Ingestion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

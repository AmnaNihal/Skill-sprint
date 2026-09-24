import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText, Upload, CheckCircle2, Clock, AlertCircle,
  Search, Trash2, ExternalLink, Filter, Sparkles,
  ChevronRight, ArrowRight, RefreshCw
} from 'lucide-react';
import { PipelineStep } from '../../types';

export const DocumentsView: React.FC = () => {
  const { documents, setUploadModalOpen, addToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Architecture', 'Security', 'DevOps', 'Data', 'Company Policy'];

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const pipelineSteps: PipelineStep[] = [
    'Validation',
    'Parsing',
    'Metadata Extraction',
    'Chunking',
    'Versioning',
    'Approved Repository'
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Knowledge Ingestion & Parsing Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Document Management</h1>
          <p className="text-slate-400 text-sm">
            Upload, validate, and index internal technical specifications, architecture blueprints, and security guidelines.
          </p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-purple-600/30 transition ring-1 ring-purple-400/30"
        >
          <Upload className="w-4 h-4" />
          Upload New Document
        </button>
      </div>

      {/* 6-Step Ingestion Pipeline Visual Tracker */}
      <div className="bg-slate-900/80 rounded-2xl border border-purple-900/30 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">6-Step Processing Pipeline</h2>
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> All Microservices Healthy
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {pipelineSteps.map((step, index) => (
            <div
              key={step}
              className="bg-slate-950/70 border border-purple-900/30 rounded-xl p-3 flex flex-col justify-between space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-purple-400">STEP 0{index + 1}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-xs font-bold text-white line-clamp-1">{step}</p>
              <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                <div className="bg-emerald-400 h-full w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 rounded-2xl border border-purple-900/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by ID, title, or tag..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
          <span className="text-xs text-slate-400 font-medium">Category:</span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={"px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition " + (
                selectedCategory === cat
                  ? "bg-purple-600 text-white"
                  : "bg-slate-950 text-slate-400 hover:text-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-slate-900/80 rounded-2xl border border-purple-900/30 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs font-semibold uppercase text-slate-400 border-b border-purple-900/30">
              <tr>
                <th className="px-6 py-4">Doc ID & Title</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Status & Pipeline</th>
                <th className="px-6 py-4">Chunks / Version</th>
                <th className="px-6 py-4">Uploaded</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/20">
              {filteredDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-purple-950/20 transition group">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-purple-300">{doc.id}</span>
                          <span className="text-xs text-slate-500 font-mono">v{doc.version}</span>
                        </div>
                        <h4 className="font-semibold text-white group-hover:text-purple-300 transition text-sm">
                          {doc.title}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {doc.tags.map(t => (
                            <span key={t} className="text-[10px] bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {doc.category}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {doc.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-300">
                    <div>{doc.chunksCount} chunks</div>
                    <div className="text-slate-500 text-[10px]">{doc.fileSize}</div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                    {doc.uploadedAt}
                  </td>

                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => addToast("Viewing metadata for " + doc.id, 'info')}
                      className="px-3 py-1.5 text-xs font-semibold text-purple-300 hover:text-white bg-purple-900/20 hover:bg-purple-600/40 rounded-lg border border-purple-800/40 transition"
                    >
                      Inspect Chunks
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

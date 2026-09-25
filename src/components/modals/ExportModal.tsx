import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getToken, API_BASE } from '../../lib/api';
import { X, Download, FileText } from 'lucide-react';

export const ExportModal: React.FC = () => {
  const { exportModalOpen, setExportModalOpen, addToast } = useApp();
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [busy, setBusy] = useState(false);

  if (!exportModalOpen) return null;

  const handleExport = async () => {
    setBusy(true);
    try {
      const t = await getToken();
      const res = await fetch(`${API_BASE}/reports/export?format=${format}`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skillsprint_report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addToast(`Downloading compliance report (${format.toUpperCase()})…`, 'success');
      setExportModalOpen(false);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-purple-800/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-purple-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Export Analytics Report</h3>
              <p className="text-xs text-slate-400">Real CSV/JSON from FastAPI validation data</p>
            </div>
          </div>
          <button
            onClick={() => setExportModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Select Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['csv', 'json'] as const).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={
                    'p-3 rounded-xl border text-xs font-bold uppercase transition ' +
                    (format === fmt
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                      : 'bg-slate-950 text-slate-400 border-purple-900/30 hover:text-white')
                  }
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-purple-900/30 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-purple-300">Included In This Export:</p>
            <p>• All onboarding plans + scores</p>
            <p>• Full GenAI vs Python comparison findings</p>
            <p>• Coverage / traceability / contradiction metrics</p>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-purple-900/30">
            <button
              onClick={() => setExportModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              {busy ? 'Preparing…' : 'Download Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

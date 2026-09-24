import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Download, FileText, CheckCircle2 } from 'lucide-react';

export const ExportModal: React.FC = () => {
  const { exportModalOpen, setExportModalOpen, addToast } = useApp();
  const [format, setFormat] = useState<'pdf' | 'csv' | 'json'>('pdf');

  if (!exportModalOpen) return null;

  const handleExport = () => {
    addToast('Downloading compliance report (' + format.toUpperCase() + ')...', 'success');
    setExportModalOpen(false);
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
              <p className="text-xs text-slate-400">Export curriculum audit logs and verification records</p>
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
            <div className="grid grid-cols-3 gap-3">
              {(['pdf', 'csv', 'json'] as const).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={"p-3 rounded-xl border text-xs font-bold uppercase transition " + (
                    format === fmt
                      ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30"
                      : "bg-slate-950 text-slate-400 border-purple-900/30 hover:text-white"
                  )}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-purple-900/30 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-purple-300">Included In This Export:</p>
            <p>• 4 Onboarding curriculum progression logs</p>
            <p>• Full REQ-001..REQ-007 rule discrepancy matrix</p>
            <p>• Timestamped manager sign-off audit trails</p>
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

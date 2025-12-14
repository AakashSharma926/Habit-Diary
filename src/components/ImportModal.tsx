import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useHabits } from '../context/HabitContext';

interface ImportModalProps {
  onClose: () => void;
}

export function ImportModal({ onClose }: ImportModalProps) {
  const { importFromJSON } = useHabits();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [jsonPreview, setJsonPreview] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setJsonPreview(text.slice(0, 500) + (text.length > 500 ? '...' : ''));
      
      // Validate JSON structure
      const data = JSON.parse(text);
      if (!data.habits || !data.entries) {
        throw new Error('Invalid file format. Expected habits and entries.');
      }
      
      setStatus('idle');
      setErrorMessage('');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to parse file');
      setJsonPreview('');
    }
  };

  const handleImport = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      setStatus('error');
      setErrorMessage('Please select a file first');
      return;
    }

    setStatus('loading');
    
    try {
      const text = await fileInputRef.current.files[0].text();
      await importFromJSON(text);
      setStatus('success');
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to import data');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl w-full max-w-md animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold">Import Data</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* File Input */}
          <div>
            <label
              htmlFor="file-input"
              className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-600 rounded-xl hover:border-violet-500 hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <Upload className="w-10 h-10 text-slate-400" />
              <div className="text-center">
                <div className="font-medium">Select JSON file</div>
                <div className="text-sm text-slate-400">or drag and drop</div>
              </div>
            </label>
            <input
              id="file-input"
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Preview */}
          {jsonPreview && (
            <div className="bg-slate-800/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium">File Preview</span>
              </div>
              <pre className="text-xs text-slate-400 overflow-x-auto max-h-32">
                {jsonPreview}
              </pre>
            </div>
          )}

          {/* Status Messages */}
          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{errorMessage}</span>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-400">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">Data imported successfully!</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={status === 'loading' || status === 'success' || !jsonPreview}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Importing...' : 'Import'}
            </button>
          </div>

          {/* Help */}
          <div className="text-xs text-slate-500 text-center">
            Import a previously exported JSON file to restore your habits and entries.
          </div>
        </div>
      </div>
    </div>
  );
}




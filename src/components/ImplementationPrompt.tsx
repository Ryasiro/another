'use client';

import React, { useState } from 'react';
import { Terminal, Copy, Check, Play, RefreshCw, AlertCircle } from 'lucide-react';

interface ImplementationPromptProps {
  projectId: string;
  initialPrompt: string | null;
  onPromptGenerated: () => void;
}

export default function ImplementationPrompt({
  projectId,
  initialPrompt,
  onPromptGenerated,
}: ImplementationPromptProps) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleCopy = async () => {
    if (!initialPrompt) return;
    try {
      await navigator.clipboard.writeText(initialPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleGeneratePrompt = async () => {
    setGenerating(true);
    setError('');

    try {
      const res = await fetch(`/api/projects/${projectId}/implementation`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal generate prompt implementasi');
      }

      onPromptGenerated();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Gagal menghubungi server');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
          <Terminal className="h-5 w-5 text-slate-500" />
          Project Briefing — Prompt untuk AI Agent
        </h2>
        {initialPrompt && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 bg-white rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Prompt
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="m-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="p-6">
        {initialPrompt ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Salin prompt di bawah ini dan tempelkan ke AI coding agent kamu (Claude Code, Cursor, dll) sebagai briefing awal. Agent akan menggunakan CLI <code className="bg-slate-700 px-1 rounded text-green-300">ngodingpakeai</code> untuk mengambil dan mengerjakan task satu per satu.
            </p>
            <div className="bg-slate-900 text-slate-100 p-5 rounded-lg text-xs font-mono overflow-x-auto max-h-[50vh] border border-slate-800 shadow-inner leading-relaxed whitespace-pre-wrap">
              {initialPrompt}
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleGeneratePrompt}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                Regenerate Prompt
              </button>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center flex flex-col items-center max-w-md mx-auto">
            <Play className="h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-slate-700 font-bold text-md">Generate Project Briefing</h3>
            <p className="text-slate-500 text-sm mt-1 mb-6">
              AI akan menyusun briefing lengkap: konteks proyek, tech stack, workflow CLI, dan prinsip koding. Paste ke AI agent kamu sebagai instruksi awal — agent lalu pakai <code className="bg-slate-100 px-1 rounded text-[11px]">ngodingpakeai</code> untuk mengambil task satu per satu.
            </p>
            <button
              onClick={handleGeneratePrompt}
              disabled={generating}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-medium py-2.5 px-6 rounded-lg transition-colors text-sm w-full"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Menyusun Prompt Implementasi...
                </>
              ) : (
                <>
                  Mulai Implementasi
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export { Terminal, Copy, Check, Play, RefreshCw, AlertCircle };

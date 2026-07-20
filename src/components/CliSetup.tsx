'use client';

import React, { useState } from 'react';
import { Copy, RefreshCw, Terminal, CheckCircle, FileText, ListOrdered, Focus } from 'lucide-react';

interface CliSetupProps {
  projectId: string;
  baseUrl: string;
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative group bg-slate-900 rounded-lg overflow-hidden">
      <pre className="text-sm text-green-300 px-4 py-3 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">{code}</pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
      >
        {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export default function CliSetup({ projectId, baseUrl }: CliSetupProps) {
  const [token, setToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const generateToken = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/token`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToken(data.token);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Terminal className="h-5 w-5 text-sky-500" />
          CLI Setup — npx ngodingpakeai
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          Kerjakan task proyek ini langsung dari terminal. CLI memandumu task per task — ambil konteks fokus,
          kerjakan satu per satu, berhenti tiap ganti fase untuk verifikasi.
        </p>

        {/* Step 1: Token */}
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
            <span className="bg-sky-100 text-sky-700 rounded-full w-5 h-5 inline-flex items-center justify-center text-[11px] font-bold">1</span>
            Generate API Token
          </h3>
          {token ? (
            <div className="space-y-2">
              <CodeBlock code={token} />
              <p className="text-xs text-amber-600">⚠ Simpan token ini sekarang — tidak akan ditampilkan lagi.</p>
            </div>
          ) : (
            <button
              onClick={generateToken}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generating...' : 'Generate Token'}
            </button>
          )}
        </div>

        {/* Step 2: Login */}
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
            <span className="bg-sky-100 text-sky-700 rounded-full w-5 h-5 inline-flex items-center justify-center text-[11px] font-bold">2</span>
            Install CLI (sekali saja)
          </h3>
          <CodeBlock code={`# Install global dari folder cli/\ncd path/ke/ai-planner/cli\nnpm install\nnpm install -g .`} />
          <p className="text-xs text-slate-400">Setelah itu command <code className="bg-slate-100 px-1 rounded text-[11px]">ngodingpakeai</code> tersedia global. Atau jalankan langsung: <code className="bg-slate-100 px-1 rounded text-[11px]">node cli/index.js &lt;cmd&gt;</code></p>
        </div>

        {/* Step 3: Login + Init */}
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
            <span className="bg-sky-100 text-sky-700 rounded-full w-5 h-5 inline-flex items-center justify-center text-[11px] font-bold">3</span>
            Login + Init (sekali saja)
          </h3>
          <CodeBlock code={`# Simpan token & URL server\nngodingpakeai login --token ${token ?? '<TOKEN>'} --url ${baseUrl}\n\n# Pasang CLAUDE.md + agent skill ke folder proyek\ncd path/ke/proyek-kamu\nngodingpakeai init`} />
          <p className="text-xs text-slate-400"><code className="bg-slate-100 px-1 rounded text-[11px]">init</code> membuat <code className="bg-slate-100 px-1 rounded text-[11px]">CLAUDE.md</code> + agent skill — AI otomatis paham workflow tanpa perlu dijelaskan lagi.</p>
        </div>

        {/* Step 4: Workflow */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
            <span className="bg-sky-100 text-sky-700 rounded-full w-5 h-5 inline-flex items-center justify-center text-[11px] font-bold">4</span>
            Mulai — LOOP task per task
          </h3>

          <div className="space-y-4">
            {/* Understand project */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <h4 className="font-semibold text-xs text-slate-700 flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3 w-3 text-sky-500" />
                Baca PRD & rencana
              </h4>
              <CodeBlock code={`ngodingpakeai plan get ${projectId}`} />
            </div>

            {/* Next task */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <h4 className="font-semibold text-xs text-slate-700 flex items-center gap-1.5 mb-1.5">
                <ListOrdered className="h-3 w-3 text-sky-500" />
                Ambil task berikutnya
              </h4>
              <CodeBlock code={`ngodingpakeai task next ${projectId}`} />
            </div>

            {/* Context */}
            <div className="bg-sky-50 border border-sky-100 rounded-lg p-3">
              <h4 className="font-semibold text-xs text-sky-700 flex items-center gap-1.5 mb-1.5">
                <Focus className="h-3 w-3 text-sky-600" />
                Dapatkan konteks fokus untuk task ini
              </h4>
              <CodeBlock code={`ngodingpakeai task context ${projectId} <taskId>`} />
              <p className="text-xs text-sky-600 mt-1">
                Hanya PRD excerpt + fase goal + acceptance criteria untuk SATU task — tidak ada noise dari task lain.
              </p>
            </div>

            {/* Start / Complete / Fail */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <h4 className="font-semibold text-xs text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Terminal className="h-3 w-3 text-sky-500" />
                Start → Work → Complete
              </h4>
              <CodeBlock code={`# Tandai mulai\nngodingpakeai task start ${projectId} <taskId>\n\n# (kerjakan task-nya...)\n\n# Tandai selesai → langsung task next\nngodingpakeai task complete ${projectId} <taskId>\n\n# Kalau gagal:\nngodingpakeai task fail ${projectId} <taskId> "alasannya"`} />
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700 leading-relaxed space-y-1">
          <strong className="text-amber-800">⚠ Aturan penting:</strong>
          <ul className="list-disc list-inside space-y-0.5">
            <li><strong>Satu task sekali jalan.</strong> Jangan sentuh task lain.</li>
            <li><strong>Setiap ganti fase: BERHENTI.</strong> Verifikasi hasil di browser dulu, baru <code className="bg-amber-100 px-1 rounded text-[11px]">task next</code>.</li>
            <li>Keblok? <code className="bg-amber-100 px-1 rounded text-[11px]">task fail</code> — jangan diam.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

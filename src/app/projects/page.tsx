'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderOpen, Plus, RefreshCw, GitFork, CheckCircle, Clock } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  idea: string;
  prdMarkdown: string | null;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  doneCount: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
      <RefreshCw className="h-5 w-5 animate-spin" />
      <span className="text-sm">Memuat proyek...</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-sky-500" />
            Proyek Saya
          </h1>
          <p className="text-slate-500 text-sm mt-1">{projects.length} proyek tersimpan</p>
        </div>
        <Link
          href="/plan"
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" />
          Proyek Baru
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center flex flex-col items-center gap-3">
          <FolderOpen className="h-12 w-12 text-slate-200" />
          <p className="text-slate-500 text-sm">Belum ada proyek. Mulai rencanakan aplikasi pertamamu!</p>
          <Link href="/plan" className="mt-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold transition-colors">
            Mulai Sekarang
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const pct = p.taskCount > 0 ? Math.round((p.doneCount / p.taskCount) * 100) : null;
            const hasPrd = !!p.prdMarkdown;
            return (
              <Link
                key={p.id}
                href={`/p/${p.id}?tab=prd`}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-sky-300 hover:shadow-md transition-all group flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors leading-snug">
                    {p.name}
                  </h2>
                  {hasPrd ? (
                    <span className="shrink-0 text-[9px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">PRD ✓</span>
                  ) : (
                    <span className="shrink-0 text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">Draft</span>
                  )}
                </div>

                {p.taskCount > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <GitFork className="h-3 w-3" /> {p.taskCount} task
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" /> {p.doneCount} selesai
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 text-right">{pct}% selesai</p>
                  </div>
                )}

                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-auto">
                  <Clock className="h-3 w-3" />
                  {new Date(p.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

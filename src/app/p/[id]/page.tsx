'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, GitFork, ListTodo, Terminal, ChevronLeft, RefreshCw, AlertCircle, Cpu } from 'lucide-react';

import PrdPreview from '@/components/PrdPreview';
import RoadmapCanvas from '@/components/RoadmapCanvas';
import TaskBoard from '@/components/TaskBoard';
import ImplementationPrompt from '@/components/ImplementationPrompt';
import CliSetup from '@/components/CliSetup';

interface ProjectPageProps {
  params: { id: string };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Next.js 14 — params is a plain object
  const projectId = params.id;

  const activeTab = searchParams.get('tab') || 'prd';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>({
    project: null,
    roadmap: { nodes: [], edges: [] },
    tasks: [],
    latestRun: null,
  });

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Project tidak ditemukan');
        }
        throw new Error('Gagal memuat data project');
      }
      const jsonData = await res.json();
      setData(jsonData);
      setError('');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Terjadi kesalahan server saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const setTab = (tab: string) => {
    router.push(`/p/${projectId}?tab=${tab}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-sky-600" />
        <span className="text-sm">Memuat detail perencanaan proyek...</span>
      </div>
    );
  }

  if (error || !data.project) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Oops! Terjadi Masalah</h2>
        <p className="text-slate-500 text-sm mt-1 mb-6">{error || 'Project tidak dapat ditemukan'}</p>
        <Link
          href="/plan"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Plan
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <Link
            href="/plan"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-sky-600 transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
            Kembali ke Form Perencanaan
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">{data.project.name}</h1>
          <p className="text-slate-500 text-xs">
            Dibuat pada {new Date(data.project.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-2 -mb-px overflow-x-auto">
          <button
            onClick={() => setTab('prd')}
            className={`flex items-center gap-2 py-2.5 px-4 border-b-2 text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'prd'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <FileText className="h-4 w-4" />
            Preview PRD
          </button>
          <button
            onClick={() => setTab('roadmap')}
            className={`flex items-center gap-2 py-2.5 px-4 border-b-2 text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'roadmap'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <GitFork className="h-4 w-4" />
            Roadmap Canvas
          </button>
          <button
            onClick={() => setTab('tasks')}
            className={`flex items-center gap-2 py-2.5 px-4 border-b-2 text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'tasks'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <ListTodo className="h-4 w-4" />
            Tasks Board
          </button>
          <button
            onClick={() => setTab('implementation')}
            className={`flex items-center gap-2 py-2.5 px-4 border-b-2 text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'implementation'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Terminal className="h-4 w-4" />
            Implementation Prompt
          </button>
          <button
            onClick={() => setTab('cli')}
            className={`flex items-center gap-2 py-2.5 px-4 border-b-2 text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'cli'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Cpu className="h-4 w-4" />
            CLI Setup
          </button>
        </nav>
      </div>

      {/* Tab Contents */}
      <div className="mt-4">
        {activeTab === 'prd' && (
          <PrdPreview prdMarkdown={data.project.prdMarkdown || ''} projectName={data.project.name} />
        )}

        {activeTab === 'roadmap' && (
          <RoadmapCanvas
            projectId={projectId}
            initialNodes={data.roadmap.nodes}
            initialEdges={data.roadmap.edges}
            onRoadmapGenerated={fetchData}
          />
        )}

        {activeTab === 'tasks' && (
          <TaskBoard projectId={projectId} tasks={data.tasks} roadmapNodes={data.roadmap.nodes} onTaskUpdated={fetchData} />
        )}

        {activeTab === 'implementation' && (
          <ImplementationPrompt
            projectId={projectId}
            initialPrompt={data.latestRun?.prompt || null}
            onPromptGenerated={fetchData}
          />
        )}

        {activeTab === 'cli' && (
          <CliSetup projectId={projectId} baseUrl={typeof window !== 'undefined' ? window.location.origin : ''} />
        )}
      </div>
    </div>
  );
}

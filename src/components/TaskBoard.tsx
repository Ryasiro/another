'use client';

import React, { useState } from 'react';
import { Play, CheckCircle, AlertOctagon, Undo, ListTodo, RefreshCw } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  acceptanceCriteriaJson: string;
  errorMessage?: string;
  roadmapNodeId?: string;
}

interface RoadmapNode {
  id: string;
  type: string;
  title: string;
}

interface TaskBoardProps {
  projectId: string;
  tasks: Task[];
  roadmapNodes?: RoadmapNode[];
  onTaskUpdated: () => void;
}

const PRIORITY_CLASS: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
};

const COLUMNS = [
  { status: 'todo', label: 'Belum Mulai', color: 'bg-slate-50' },
  { status: 'in_progress', label: 'Sedang Dikerjakan', color: 'bg-sky-50/50' },
  { status: 'done', label: 'Selesai', color: 'bg-green-50/40' },
  { status: 'failed', label: 'Gagal', color: 'bg-red-50/40' },
];

export default function TaskBoard({ projectId, tasks, roadmapNodes = [], onTaskUpdated }: TaskBoardProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState<string>('all');

  // Build phase lookup: nodeId → phase title (only 'phase' type nodes)
  const phaseMap = new Map<string, string>();
  for (const n of roadmapNodes) {
    if (n.type === 'phase' || n.type === 'branch') phaseMap.set(n.id, n.title);
  }

  // Unique phases that have tasks
  const phases = Array.from(
    new Map(
      tasks
        .filter((t) => t.roadmapNodeId && phaseMap.has(t.roadmapNodeId))
        .map((t) => [t.roadmapNodeId!, phaseMap.get(t.roadmapNodeId!)!])
    ).entries()
  );

  const visibleTasks = activePhase === 'all'
    ? tasks
    : tasks.filter((t) => t.roadmapNodeId === activePhase);

  const handleUpdateStatus = async (taskId: string, newStatus: string, errorMessage?: string) => {
    setUpdatingId(taskId);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus, errorMessage }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal update status task');
      onTaskUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan server');
    } finally {
      setUpdatingId(null);
    }
  };

  const renderActions = (task: Task) => {
    if (updatingId === task.id) return <span className="text-[10px] text-slate-400 animate-pulse">Memproses...</span>;
    if (task.status === 'todo') return (
      <button onClick={() => handleUpdateStatus(task.id, 'in_progress')}
        className="flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded text-[10px] font-bold border border-sky-200 transition-colors">
        <Play className="h-3 w-3 fill-sky-700" />Kerjakan
      </button>
    );
    if (task.status === 'in_progress') return (
      <div className="flex gap-1">
        <button onClick={() => handleUpdateStatus(task.id, 'done')}
          className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded text-[10px] font-bold border border-green-200 transition-colors">
          <CheckCircle className="h-3 w-3" />Selesai
        </button>
        <button onClick={() => { const e = prompt('Log kesalahan/error:'); if (e !== null) handleUpdateStatus(task.id, 'failed', e || 'Task gagal dieksekusi.'); }}
          className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-[10px] font-bold border border-red-200 transition-colors">
          <AlertOctagon className="h-3 w-3" />Gagal
        </button>
      </div>
    );
    if (task.status === 'done') return (
      <button onClick={() => handleUpdateStatus(task.id, 'todo')}
        className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded text-[10px] font-bold border border-slate-200 transition-colors">
        <Undo className="h-3 w-3" />Ulangi
      </button>
    );
    return (
      <button onClick={() => handleUpdateStatus(task.id, 'in_progress')}
        className="flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded text-[10px] font-bold border border-sky-200 transition-colors">
        <RefreshCw className="h-3 w-3" />Coba Lagi
      </button>
    );
  };

  if (tasks.length === 0) return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center flex flex-col items-center">
      <ListTodo className="h-12 w-12 text-slate-300 mb-3" />
      <h3 className="text-slate-700 font-bold text-md">Belum Ada Task Perencanaan</h3>
      <p className="text-slate-500 text-sm max-w-sm mt-1">
        Generate roadmap visual terlebih dahulu di tab <strong>Roadmap Canvas</strong> agar tugas-tugas dapat di-breakdown ke dalam papan status ini.
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Phase filter tabs */}
      {phases.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActivePhase('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${activePhase === 'all' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300'}`}
          >
            Semua ({tasks.length})
          </button>
          {phases.map(([id, title]) => {
            const count = tasks.filter((t) => t.roadmapNodeId === id).length;
            return (
              <button
                key={id}
                onClick={() => setActivePhase(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${activePhase === id ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300'}`}
              >
                {title} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex flex-wrap lg:flex-nowrap gap-4 items-start">
        {COLUMNS.map(({ status, label, color }) => {
          const list = visibleTasks.filter((t) => t.status === status);
          return (
            <div key={status} className={`bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 min-w-[260px]`}>
              <div className={`px-4 py-3 border-b border-slate-200 flex items-center justify-between ${color}`}>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  {label}
                  <span className="bg-slate-200/60 text-slate-700 rounded-full px-2 py-0.5 text-xs font-semibold">{list.length}</span>
                </h3>
              </div>
              {list.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">Tidak ada task</div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {list.map((task) => {
                    const criteria = typeof task.acceptanceCriteriaJson === 'string'
                      ? JSON.parse(task.acceptanceCriteriaJson)
                      : task.acceptanceCriteriaJson;
                    const phaseName = task.roadmapNodeId ? phaseMap.get(task.roadmapNodeId) : null;
                    return (
                      <div key={task.id} className="p-4 space-y-2 hover:bg-slate-50/50 transition-colors">
                        {phaseName && activePhase === 'all' && (
                          <span className="text-[9px] uppercase tracking-wider font-bold text-sky-500">{phaseName}</span>
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-slate-900 leading-snug">{task.title}</h4>
                          <span className={`text-[9px] px-1 rounded uppercase font-bold shrink-0 text-white ${PRIORITY_CLASS[task.priority] ?? 'bg-slate-400'}`}>
                            {task.priority}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed">{task.description}</p>
                        {criteria?.length > 0 && (
                          <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Kriteria Penerimaan:</span>
                            <ul className="list-disc pl-4 text-[10px] text-slate-600 space-y-0.5">
                              {criteria.map((c: string, idx: number) => <li key={idx}>{c}</li>)}
                            </ul>
                          </div>
                        )}
                        {task.errorMessage && (
                          <div className="bg-red-50 border border-red-100 rounded-lg p-2 text-[10px] text-red-700 leading-snug">
                            <span className="font-bold block">Error Log:</span>{task.errorMessage}
                          </div>
                        )}
                        <div className="pt-2 flex justify-end gap-1.5">{renderActions(task)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

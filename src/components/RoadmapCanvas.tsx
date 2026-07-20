'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitFork, RefreshCw, AlertCircle, X, CheckCircle2, Layers, Wrench } from 'lucide-react';

interface SubFeature {
  name: string;
  description: string;
  technicalTasks: { title: string; description: string }[];
}

interface PhaseMetadata {
  status: string;
  priority: string;
  acceptanceCriteria: string[];
  goal?: string;
  definitionOfDone?: string;
  subFeatures?: SubFeature[];
}

interface RoadmapCanvasProps {
  projectId: string;
  initialNodes: any[];
  initialEdges: any[];
  onRoadmapGenerated: () => void;
}

export default function RoadmapCanvas({
  projectId,
  initialNodes,
  initialEdges,
  onRoadmapGenerated,
}: RoadmapCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<{ node: any; meta: PhaseMetadata } | null>(null);

  useEffect(() => {
    if (!initialNodes?.length) return;
    const flowNodes = initialNodes.map((n) => {
      const metadata = typeof n.metadataJson === 'string' ? JSON.parse(n.metadataJson) : n.metadataJson;
      const isPhase = n.type === 'phase' || n.type === 'branch';
      return {
        id: n.id,
        type: 'default',
        position: { x: n.positionX, y: n.positionY },
        data: {
          label: (
            <div className="flex flex-col gap-1 items-center">
              {isPhase && <span className="text-[9px] uppercase tracking-widest text-sky-500 font-bold">Fase</span>}
              <span className="font-bold">{n.title}</span>
              <span className="text-[10px] opacity-75 leading-tight">{n.description}</span>
              {metadata?.priority && (
                <span className={`text-[9px] px-1 rounded uppercase font-bold mt-1 text-white ${
                  metadata.priority === 'high' ? 'bg-red-500' : metadata.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-400'
                }`}>
                  {metadata.priority}
                </span>
              )}
              {isPhase && <span className="text-[9px] text-sky-600 font-semibold mt-0.5">klik untuk detail →</span>}
            </div>
          ),
          rawNode: n,
          metadata,
          isPhase,
        },
        className: isPhase ? 'cursor-pointer ring-2 ring-sky-200 hover:ring-sky-400 transition-all' : '',
      };
    });

    const flowEdges = initialEdges.map((e) => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      animated: true,
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    if (!node.data?.isPhase) return;
    setSelectedPhase({ node: node.data.rawNode, meta: node.data.metadata });
  }, []);

  const handleGenerateRoadmap = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/roadmap`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal generate roadmap');
      onRoadmapGenerated();
    } catch (err: any) {
      setError(err?.message || 'Gagal menghubungi server');
    } finally {
      setGenerating(false);
    }
  };

  const hasRoadmap = !!initialNodes?.length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[70vh] relative">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
          <GitFork className="h-5 w-5 text-slate-500" />
          Roadmap Perencanaan Aplikasi
        </h2>
        <button
          onClick={handleGenerateRoadmap}
          disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 disabled:bg-slate-400 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
          {hasRoadmap ? 'Regenerate Roadmap' : 'Generate Roadmap'}
        </button>
      </div>

      {error && (
        <div className="m-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="flex-1 relative bg-slate-50">
        {hasRoadmap ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            fitView
            minZoom={0.5}
            maxZoom={1.5}
          >
            <Controls />
            <MiniMap style={{ height: 100, width: 100 }} />
            <Background />
          </ReactFlow>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-50">
            <GitFork className="h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-slate-700 font-bold text-md">Belum Ada Roadmap</h3>
            <p className="text-slate-500 text-sm max-w-sm mt-1 mb-4">
              AI planner dapat memecah PRD di tab sebelah menjadi roadmap visual bercabang dengan dependency task.
            </p>
            <button
              onClick={handleGenerateRoadmap}
              disabled={generating}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 disabled:bg-slate-400 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {generating ? (
                <><RefreshCw className="h-4 w-4 animate-spin" />Menganalisis PRD & Generate Graph...</>
              ) : 'Generate Roadmap Visual'}
            </button>
          </div>
        )}
      </div>

      {/* Phase detail slide panel */}
      {selectedPhase && (
        <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-10 flex flex-col overflow-hidden">
          <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 bg-sky-50">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-sky-500 font-bold block">Fase</span>
              <h3 className="font-bold text-slate-900 text-base leading-tight">{selectedPhase.node.title}</h3>
              <p className="text-slate-500 text-xs mt-0.5">{selectedPhase.node.description}</p>
            </div>
            <button onClick={() => setSelectedPhase(null)} className="text-slate-400 hover:text-slate-700 mt-0.5">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
            {/* Goal */}
            {selectedPhase.meta.goal && (
              <div>
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-sky-500" /> Tujuan Fase
                </h4>
                <p className="text-slate-600 leading-relaxed">{selectedPhase.meta.goal}</p>
              </div>
            )}

            {/* Definition of Done */}
            {selectedPhase.meta.definitionOfDone && (
              <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                <h4 className="font-bold text-green-700 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Definition of Done
                </h4>
                <p className="text-green-800 text-xs leading-relaxed">{selectedPhase.meta.definitionOfDone}</p>
              </div>
            )}

            {/* Sub-features */}
            {selectedPhase.meta.subFeatures?.length ? (
              <div>
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-amber-500" /> Sub-Fitur & Task Teknis
                </h4>
                <div className="space-y-3">
                  {selectedPhase.meta.subFeatures.map((sf, i) => (
                    <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                        <span className="font-bold text-slate-800 text-xs">{sf.name}</span>
                        <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">{sf.description}</p>
                      </div>
                      {sf.technicalTasks?.length > 0 && (
                        <ul className="divide-y divide-slate-100">
                          {sf.technicalTasks.map((tt, j) => (
                            <li key={j} className="px-3 py-2">
                              <span className="font-semibold text-slate-700 text-[11px] block">{tt.title}</span>
                              <span className="text-slate-500 text-[10px] leading-snug">{tt.description}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

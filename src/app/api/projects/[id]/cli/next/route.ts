import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { roadmapNodes, tasks } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { authCli } from '@/lib/cli-auth';

/** GET — return the next task to work on (lowest phaseOrder then order, status=todo) */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = await authCli(req, params.id);
  if (!project) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, params.id))
    .orderBy(asc(tasks.phaseOrder), asc(tasks.order));

  // Find the active phase: lowest phaseOrder that isn't fully done
  const phaseOrders = [...new Set(allTasks.map((t) => t.phaseOrder))].sort((a, b) => a - b);

  let activePhaseOrder: number | null = null;
  for (const po of phaseOrders) {
    const inPhase = allTasks.filter((t) => t.phaseOrder === po);
    if (!inPhase.every((t) => t.status === 'done')) { activePhaseOrder = po; break; }
  }

  if (activePhaseOrder === null) {
    return NextResponse.json({ done: true, message: 'Semua task selesai! 🎉' });
  }

  const phaseTasks = allTasks.filter((t) => t.phaseOrder === activePhaseOrder);
  const task = phaseTasks.find((t) => t.status === 'in_progress')
    ?? phaseTasks.find((t) => t.status === 'todo')
    ?? null;

  if (!task) {
    return NextResponse.json({ done: true, message: `Fase ${activePhaseOrder! + 1} selesai. Verifikasi dulu, lalu lanjut ke fase berikutnya.` });
  }

  // Resolve phase name
  let phaseName = `Fase ${activePhaseOrder + 1}`;
  if (task.roadmapNodeId) {
    const [node] = await db.select().from(roadmapNodes).where(eq(roadmapNodes.id, task.roadmapNodeId));
    if (node) phaseName = node.title;
  }

  const phaseDone = phaseTasks.filter((t) => t.status === 'done').length;

  // Detect phase change: any previously in_progress task exists in a lower phase
  const prevInProgress = allTasks.find(
    (t) => t.status === 'in_progress' && t.phaseOrder < activePhaseOrder!
  );
  const phaseChanged = !prevInProgress && phaseDone === 0 && activePhaseOrder > 0;

  return NextResponse.json({
    done: false,
    phaseChanged,  // true = fase baru dimulai, agent harus stop & lapor ke user
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      order: task.order,
      phaseOrder: task.phaseOrder,
    },
    phase: { name: phaseName, progress: `${phaseDone}/${phaseTasks.length}` },
  });
}

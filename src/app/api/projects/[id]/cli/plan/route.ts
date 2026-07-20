import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { projects, roadmapNodes, tasks } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { authCli } from '@/lib/cli-auth';

/** GET — return PRD summary + phase list with task counts */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = await authCli(req, params.id);
  if (!project) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const nodes = await db.select().from(roadmapNodes).where(eq(roadmapNodes.projectId, params.id));
  const allTasks = await db.select().from(tasks).where(eq(tasks.projectId, params.id)).orderBy(asc(tasks.phaseOrder), asc(tasks.order));

  const phaseNodes = nodes.filter((n) => n.type === 'phase' || n.type === 'branch');
  const phases = phaseNodes.map((ph) => {
    const phaseTasks = allTasks.filter((t) => t.roadmapNodeId === ph.id);
    const done = phaseTasks.filter((t) => t.status === 'done').length;
    return {
      id: ph.id,
      title: ph.title,
      description: ph.description,
      total: phaseTasks.length,
      done,
      status: done === phaseTasks.length && phaseTasks.length > 0 ? 'done' : done > 0 ? 'in_progress' : 'todo',
    };
  });

  return NextResponse.json({
    project: { id: project.id, name: project.name },
    prdSummary: project.prdMarkdown?.slice(0, 600) + (project.prdMarkdown && project.prdMarkdown.length > 600 ? '…' : ''),
    phases,
    totalTasks: allTasks.length,
    doneTasks: allTasks.filter((t) => t.status === 'done').length,
  });
}

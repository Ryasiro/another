import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { projects, roadmapNodes, tasks } from '@/lib/db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { authCli } from '@/lib/cli-auth';

/**
 * GET /api/projects/:id/cli/context/:taskId
 *
 * Returns laser-focused context for ONE task — the AI agent gets everything
 * it needs and NOTHING it doesn't. No full task list, no unrelated phases.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  const project = await authCli(req, params.id);
  if (!project) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Fetch the task
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, params.taskId), eq(tasks.projectId, params.id)));
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  // 2. Fetch the parent phase node (for goal, definitionOfDone, acceptanceCriteria)
  let phase = null;
  if (task.roadmapNodeId) {
    const [node] = await db
      .select()
      .from(roadmapNodes)
      .where(eq(roadmapNodes.id, task.roadmapNodeId));
    if (node) {
      const meta = JSON.parse(node.metadataJson || '{}');
      phase = {
        title: node.title,
        description: node.description,
        goal: meta.goal || '',
        definitionOfDone: meta.definitionOfDone || '',
        // ponytail: subFeatures omitted — large payload, agent only needs goal+done
      };
    }
  }

  // 3. Fetch done tasks in same phase (preceding context only)
  const phaseTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.projectId, params.id), eq(tasks.phaseOrder, task.phaseOrder)))
    .orderBy(asc(tasks.order));

  const doneTasks = phaseTasks
    .filter((t) => t.status === 'done' && t.id !== task.id)
    .map((t) => ({ title: t.title, description: t.description }));

  // 4. Trim PRD to relevant section: extract phase-related portion
  //    Just keep the first ~1500 chars and the Features section
  const prdShort = project.prdMarkdown
    ? project.prdMarkdown.length > 3000
      ? project.prdMarkdown.substring(0, 3000) + '\n...'
      : project.prdMarkdown
    : '';

  // 5. Build context
  const acceptanceCriteria = JSON.parse(task.acceptanceCriteriaJson || '[]');

  return NextResponse.json({
    project: { name: project.name },
    phase,
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      order: task.order,
      phaseOrder: task.phaseOrder,
      acceptanceCriteria,
    },
    precedingTasks: doneTasks,
    prdExcerpt: prdShort,
  });
}

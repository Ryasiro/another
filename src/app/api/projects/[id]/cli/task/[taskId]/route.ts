import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { tasks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { authCli } from '@/lib/cli-auth';

const ALLOWED = ['todo', 'in_progress', 'done', 'failed'] as const;

/** PATCH — update task status via CLI */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  const project = await authCli(req, params.id);
  if (!project) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { status, errorMessage } = body as { status?: string; errorMessage?: string };

  if (!status || !ALLOWED.includes(status as any)) {
    return NextResponse.json({ error: `status must be one of: ${ALLOWED.join(', ')}` }, { status: 400 });
  }

  const [task] = await db.select().from(tasks).where(and(eq(tasks.id, params.taskId), eq(tasks.projectId, params.id)));
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  await db.update(tasks).set({
    status,
    errorMessage: errorMessage ?? null,
    updatedAt: new Date().toISOString(),
  }).where(eq(tasks.id, params.taskId));

  return NextResponse.json({ success: true, taskId: params.taskId, status });
}

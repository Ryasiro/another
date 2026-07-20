import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { tasks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await req.json();
    const { taskId, status, errorMessage } = body;

    if (!taskId || !status) {
      return NextResponse.json(
        { error: 'taskId and status are required' },
        { status: 400 }
      );
    }

    const allowedStatuses = ['todo', 'in_progress', 'done', 'failed'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${allowedStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Update task
    const updated = await db
      .update(tasks)
      .set({
        status,
        errorMessage: errorMessage || null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { projects, roadmapNodes, roadmapEdges, tasks, implementationRuns } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    const [projectList, nodes, edges, projectTasks, runs] = await Promise.all([
      db.select().from(projects).where(eq(projects.id, projectId)),
      db.select().from(roadmapNodes).where(eq(roadmapNodes.projectId, projectId)),
      db.select().from(roadmapEdges).where(eq(roadmapEdges.projectId, projectId)),
      db.select().from(tasks).where(eq(tasks.projectId, projectId)),
      db.select().from(implementationRuns).where(eq(implementationRuns.projectId, projectId)).orderBy(desc(implementationRuns.createdAt)),
    ]);

    if (projectList.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      project: projectList[0],
      roadmap: { nodes, edges },
      tasks: projectTasks,
      latestRun: runs[0] ?? null,
    });
  } catch (error: any) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch project' }, { status: 500 });
  }
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/** Returns project if token is valid, null otherwise */
export async function authCli(req: NextRequest, projectId: string) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project || project.apiToken !== token) return null;
  return project;
}

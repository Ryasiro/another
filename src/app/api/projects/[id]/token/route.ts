import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authCli } from '@/lib/cli-auth';
import crypto from 'crypto';

/** GET — return current token (masked) */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const [project] = await db.select().from(projects).where(eq(projects.id, params.id));
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  return NextResponse.json({ hasToken: !!project.apiToken });
}

/** POST — generate (or regenerate) API token */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const [project] = await db.select().from(projects).where(eq(projects.id, params.id));
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const token = 'ngpk_' + crypto.randomBytes(24).toString('base64url');
  await db.update(projects).set({ apiToken: token, updatedAt: new Date().toISOString() }).where(eq(projects.id, params.id));
  return NextResponse.json({ token });
}

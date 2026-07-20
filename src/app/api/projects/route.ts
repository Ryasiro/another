import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { projects, tasks } from '@/lib/db/schema';
import { gemini, PRECISE_MODEL } from '@/lib/gemini';
import { PRD_SYSTEM_PROMPT, getPrdUserPrompt, getWizardPrdUserPrompt } from '@/lib/prompts';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET() {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      idea: projects.idea,
      prdMarkdown: projects.prdMarkdown,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      taskCount: sql<number>`(select count(*) from tasks where tasks.project_id = projects.id)`,
      doneCount: sql<number>`(select count(*) from tasks where tasks.project_id = projects.id and tasks.status = 'done')`,
    })
    .from(projects)
    .orderBy(desc(projects.updatedAt));

  return NextResponse.json({ projects: rows });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // We check if it is the new wizard payload or the legacy form payload.
    const isWizard = 'idea' in body && 'clarifications' in body && 'techMode' in body;

    let projectId = 'proj_' + Math.random().toString(36).substring(2, 11);
    let projectName = '';
    let ideaJsonString = '';
    let userPrompt = '';

    if (isWizard) {
      const { idea, suggestedName, clarifications, techMode, techPreference } = body;

      if (!idea || !Array.isArray(clarifications) || !techMode) {
        return NextResponse.json(
          { error: 'Invalid wizard payload' },
          { status: 400 }
        );
      }

      projectName = (suggestedName || '').trim() || 'Aplikasi Tanpa Nama';
      ideaJsonString = JSON.stringify({ idea, suggestedName, clarifications, techMode, techPreference });
      userPrompt = getWizardPrdUserPrompt({ idea, suggestedName, clarifications, techMode, techPreference });
    } else {
      // Legacy payload support
      const { name, targetUser, problem, features, techPreference, constraints } = body;

      if (!name || !targetUser || !problem || !features) {
        return NextResponse.json(
          { error: 'Name, target user, problem, and features are required' },
          { status: 400 }
        );
      }

      projectName = name;
      ideaJsonString = JSON.stringify({ targetUser, problem, features, techPreference, constraints });
      userPrompt = getPrdUserPrompt({
        name,
        targetUser,
        problem,
        features,
        techPreference,
        constraints,
      });
    }

    const now = new Date().toISOString();

    // 1. Save initial project record
    await db.insert(projects).values({
      id: projectId,
      name: projectName,
      idea: ideaJsonString,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Call Gemini API to generate PRD markdown
    const model = gemini.getGenerativeModel({
      model: PRECISE_MODEL,
      systemInstruction: PRD_SYSTEM_PROMPT,
    });

    const result = await model.generateContent(userPrompt);
    const prdMarkdown = result.response.text();

    if (!prdMarkdown) {
      throw new Error('Gemini failed to return a valid text PRD');
    }

    // 3. Update project record with the generated PRD
    await db
      .update(projects)
      .set({
        prdMarkdown,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projects.id, projectId));

    return NextResponse.json({ id: projectId });
  } catch (error: any) {
    console.error('Error generating PRD with Gemini:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate PRD' },
      { status: 500 }
    );
  }
}

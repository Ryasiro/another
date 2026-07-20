import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { projects, tasks, implementationRuns } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { gemini, PRECISE_MODEL } from '@/lib/gemini';
import { IMPLEMENTATION_SYSTEM_PROMPT, getImplementationUserPrompt } from '@/lib/prompts';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    // 1. Fetch project and tasks
    const projectList = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (projectList.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = projectList[0];
    if (!project.prdMarkdown) {
      return NextResponse.json(
        { error: 'PRD has not been generated for this project yet' },
        { status: 400 }
      );
    }

    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(asc(tasks.phaseOrder), asc(tasks.order));

    if (projectTasks.length === 0) {
      return NextResponse.json(
        { error: 'Generate the roadmap first to create tasks' },
        { status: 400 }
      );
    }

    // 2. Group tasks by phase for a structured overview sent to Gemini
    const byPhase: Record<number, { title: string; description: string; priority: string; acceptanceCriteria: string[] }[]> = {};
    for (const t of projectTasks) {
      if (!byPhase[t.phaseOrder]) byPhase[t.phaseOrder] = [];
      byPhase[t.phaseOrder].push({
        title: t.title,
        description: t.description,
        priority: t.priority,
        acceptanceCriteria: JSON.parse(t.acceptanceCriteriaJson || '[]'),
      });
    }
    // Sort phases and tasks within each phase by order
    const tasksGrouped = Object.entries(byPhase)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([phaseIdx, phaseTasks]) => ({
        phase: `Fase ${Number(phaseIdx) + 1}`,
        phaseOrder: Number(phaseIdx),
        taskCount: phaseTasks.length,
        tasks: phaseTasks,
      }));

    const prdShortened = project.prdMarkdown.length > 4000
      ? project.prdMarkdown.substring(0, 4000) + '\n... [truncated for brevity] ...'
      : project.prdMarkdown;

    const userPrompt = getImplementationUserPrompt(
      prdShortened,
      JSON.stringify(tasksGrouped, null, 2)
    );

    const model = gemini.getGenerativeModel({
      model: PRECISE_MODEL,
      systemInstruction: IMPLEMENTATION_SYSTEM_PROMPT,
    });

    const result = await model.generateContent(userPrompt);
    const implementationPrompt = result.response.text();

    if (!implementationPrompt) {
      throw new Error('Gemini failed to return a valid implementation prompt');
    }

    // 3. Save run to database
    const runId = 'run_' + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();

    await db.insert(implementationRuns).values({
      id: runId,
      projectId,
      status: 'completed',
      prompt: implementationPrompt,
      log: 'Prompt successfully generated.',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ success: true, prompt: implementationPrompt });
  } catch (error: any) {
    console.error('Error generating implementation prompt with Gemini:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate implementation prompt' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { projects, roadmapNodes, roadmapEdges, tasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { gemini, PRECISE_MODEL } from '@/lib/gemini';
import { SchemaType } from '@google/generative-ai';
import { ROADMAP_SYSTEM_PROMPT, getRoadmapUserPrompt } from '@/lib/prompts';

// ponytail: `as any` — Gemini SDK demands literal SchemaType.OBJECT but TS widens module-level consts
const technicalTaskSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
  },
  required: ['title', 'description'],
} as any;

const subFeatureSchema = {
  type: SchemaType.OBJECT,
  properties: {
    name: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    technicalTasks: { type: SchemaType.ARRAY, items: technicalTaskSchema },
  },
  required: ['name', 'description', 'technicalTasks'],
} as any;

const nodeMetadataSchema = {
  type: SchemaType.OBJECT,
  properties: {
    status: { type: SchemaType.STRING },
    priority: { type: SchemaType.STRING, format: 'enum', enum: ['high', 'medium', 'low'] },
    acceptanceCriteria: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    goal: { type: SchemaType.STRING },
    definitionOfDone: { type: SchemaType.STRING },
    subFeatures: { type: SchemaType.ARRAY, items: subFeatureSchema },
  },
  required: ['status', 'priority', 'acceptanceCriteria'],
} as any;

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    const projectList = await db.select().from(projects).where(eq(projects.id, projectId));
    if (projectList.length === 0) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const project = projectList[0];
    if (!project.prdMarkdown) return NextResponse.json({ error: 'PRD has not been generated for this project yet' }, { status: 400 });

    const model = gemini.getGenerativeModel({
      model: PRECISE_MODEL,
      systemInstruction: ROADMAP_SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            nodes: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id: { type: SchemaType.STRING },
                  type: { type: SchemaType.STRING, format: 'enum', enum: ['root', 'phase', 'task'] },
                  title: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                  x: { type: SchemaType.NUMBER },
                  y: { type: SchemaType.NUMBER },
                  metadata: nodeMetadataSchema as any,
                },
                required: ['id', 'type', 'title', 'description', 'x', 'y', 'metadata'],
              },
            },
            edges: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id: { type: SchemaType.STRING },
                  source: { type: SchemaType.STRING },
                  target: { type: SchemaType.STRING },
                },
                required: ['id', 'source', 'target'],
              },
            },
          },
          required: ['nodes', 'edges'],
        },
      },
    });

    const result = await model.generateContent(getRoadmapUserPrompt(project.prdMarkdown));
    const jsonText = result.response.text();
    if (!jsonText) throw new Error('Gemini failed to return a valid JSON response');

    const { nodes, edges } = JSON.parse(jsonText);

    // Clear existing
    await db.delete(roadmapEdges).where(eq(roadmapEdges.projectId, projectId));
    await db.delete(tasks).where(eq(tasks.projectId, projectId));
    await db.delete(roadmapNodes).where(eq(roadmapNodes.projectId, projectId));

    const now = new Date().toISOString();
    const scopedId = (id: string) => `${id}_${projectId}`;
    const seen = new Set<string>();

    for (const node of nodes) {
      const dbId = scopedId(node.id);
      if (seen.has(dbId)) continue;
      seen.add(dbId);

      await db.insert(roadmapNodes).values({
        id: dbId,
        projectId,
        type: node.type,
        title: node.title,
        description: node.description,
        positionX: Math.round(node.x),
        positionY: Math.round(node.y),
        metadataJson: JSON.stringify(node.metadata),
      });

      // Insert detailed technical tasks from phase subFeatures
      if (node.type === 'phase' && node.metadata?.subFeatures?.length) {
        // phaseOrder: derive from sorted position of this phase node among all phase nodes
        const phaseNodes = nodes.filter((n: any) => n.type === 'phase');
        const phaseOrder = phaseNodes
          .sort((a: any, b: any) => a.x - b.x || a.y - b.y)
          .findIndex((n: any) => n.id === node.id);

        let taskOrder = 0;
        for (const sf of node.metadata.subFeatures) {
          for (const tt of sf.technicalTasks ?? []) {
            await db.insert(tasks).values({
              id: 'task_' + Math.random().toString(36).substring(2, 11),
              projectId,
              roadmapNodeId: dbId,
              title: tt.title,
              description: `[${sf.name}] ${tt.description}`,
              status: 'todo',
              priority: node.metadata.priority || 'medium',
              order: taskOrder++,
              phaseOrder: phaseOrder >= 0 ? phaseOrder : 0,
              acceptanceCriteriaJson: JSON.stringify(node.metadata.acceptanceCriteria || []),
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      }

      // High-level task node → also insert as task
      if (node.type === 'task') {
        const phaseOrder = 0; // fallback; task nodes under phase inherit phaseOrder from parent
        await db.insert(tasks).values({
          id: 'task_' + Math.random().toString(36).substring(2, 11),
          projectId,
          roadmapNodeId: dbId,
          title: node.title,
          description: node.description,
          status: node.metadata.status || 'todo',
          priority: node.metadata.priority || 'medium',
          order: 0,
          phaseOrder,
          acceptanceCriteriaJson: JSON.stringify(node.metadata.acceptanceCriteria || []),
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    for (const edge of edges) {
      await db.insert(roadmapEdges).values({
        id: `${edge.id}_${projectId}`,
        projectId,
        sourceNodeId: scopedId(edge.source),
        targetNodeId: scopedId(edge.target),
      });
    }

    return NextResponse.json({ success: true, nodes, edges });
  } catch (error: any) {
    console.error('Error generating roadmap:', error);
    return NextResponse.json({ error: error?.message || 'Failed to generate roadmap' }, { status: 500 });
  }
}

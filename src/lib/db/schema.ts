import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  idea: text('idea').notNull(),
  prdMarkdown: text('prd_markdown'),
  apiToken: text('api_token'), // Bearer token for CLI access
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const roadmapNodes = sqliteTable('roadmap_nodes', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'root', 'phase', 'task'
  title: text('title').notNull(),
  description: text('description').notNull(),
  positionX: integer('position_x').notNull(),
  positionY: integer('position_y').notNull(),
  metadataJson: text('metadata_json'),
});

export const roadmapEdges = sqliteTable('roadmap_edges', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sourceNodeId: text('source_node_id').notNull(),
  targetNodeId: text('target_node_id').notNull(),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  roadmapNodeId: text('roadmap_node_id').references(() => roadmapNodes.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull(), // 'todo', 'in_progress', 'done', 'failed'
  priority: text('priority').notNull(), // 'high', 'medium', 'low'
  order: integer('order').notNull().default(0),       // execution order within phase
  phaseOrder: integer('phase_order').notNull().default(0), // which phase (0-indexed)
  acceptanceCriteriaJson: text('acceptance_criteria_json'),
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const implementationRuns = sqliteTable('implementation_runs', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  status: text('status').notNull(), // 'pending', 'running', 'completed', 'failed'
  prompt: text('prompt').notNull(),
  log: text('log'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

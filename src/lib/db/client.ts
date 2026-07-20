import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';

const sqlitePath = path.join(process.cwd(), 'sqlite.db');
const sqlite = new Database(sqlitePath);

// Bootstrap tables manually to avoid buggy drizzle-kit CLI issues in local environment
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    idea TEXT NOT NULL,
    prd_markdown TEXT,
    api_token TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS roadmap_nodes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL,
    metadata_json TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS roadmap_edges (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    source_node_id TEXT NOT NULL,
    target_node_id TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    roadmap_node_id TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    phase_order INTEGER NOT NULL DEFAULT 0,
    acceptance_criteria_json TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(roadmap_node_id) REFERENCES roadmap_nodes(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS implementation_runs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    status TEXT NOT NULL,
    prompt TEXT NOT NULL,
    log TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
`);

// Migrate existing DBs: add new columns if missing (SQLite ALTER TABLE is additive only)
const existingCols = (table: string) =>
  (sqlite.prepare(`PRAGMA table_info(${table})`).all() as any[]).map((r) => r.name);

const projectCols = existingCols('projects');
if (!projectCols.includes('api_token')) sqlite.exec(`ALTER TABLE projects ADD COLUMN api_token TEXT`);

const taskCols = existingCols('tasks');
if (!taskCols.includes('order')) sqlite.exec(`ALTER TABLE tasks ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0`);
if (!taskCols.includes('phase_order')) sqlite.exec(`ALTER TABLE tasks ADD COLUMN phase_order INTEGER NOT NULL DEFAULT 0`);

export const db = drizzle(sqlite, { schema });

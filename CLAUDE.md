# AI App Planner — ngodingpakeai

Platform untuk merencanakan dan mengeksekusi proyek aplikasi via AI. User input ide → AI generate PRD → generate Roadmap → generate Tasks → AI agent eksekusi task satu per satu lewat CLI.

## Tech Stack

- **Framework**: Next.js 14 (App Router) — semua route di `src/app/`
- **Database**: SQLite via `better-sqlite3` + Drizzle ORM
- **AI**: Google Gemini (PRD, roadmap, implementation briefing) + Anthropic Claude (tersedia tapi belum aktif dipakai)
- **Styling**: Tailwind CSS (tanpa shadcn)
- **CLI**: `cli/index.js` — ESM, package `ngodingpakeai`

## Struktur Project

```
src/
  app/
    api/projects/
      route.ts                        # GET list, POST create+generate PRD
      [id]/
        route.ts                      # GET project detail (+ tasks + roadmap + latest run)
        roadmap/route.ts              # POST generate roadmap nodes/edges via Gemini
        implementation/route.ts       # POST generate project briefing via Gemini
        token/route.ts                # GET/POST API token untuk CLI
        tasks/route.ts                # GET/PATCH tasks
        cli/
          plan/route.ts               # GET PRD summary + fase list (CLI)
          next/route.ts               # GET task berikutnya — fase aktif (CLI)
          task/[taskId]/route.ts      # PATCH update status task (CLI)
          context/[taskId]/route.ts   # GET konteks fokus SATU task (CLI)
    p/[id]/page.tsx                   # Project detail page (tabs: PRD, Roadmap, Tasks, Briefing, CLI)
    plan/page.tsx                     # Wizard buat proyek baru
    projects/page.tsx                 # Daftar proyek
  lib/
    db/
      schema.ts                       # Drizzle schema (projects, roadmap_nodes, roadmap_edges, tasks, implementation_runs)
      client.ts                       # SQLite init + auto-migrate
    prompts.ts                        # Semua system prompt + user prompt builders
    gemini.ts                         # Gemini client
    anthropic.ts                      # Anthropic client
    cli-auth.ts                       # Bearer token auth untuk CLI routes
  components/
    CliSetup.tsx                      # Tab CLI Setup — token, install, workflow commands
    ImplementationPrompt.tsx          # Tab Project Briefing — generate + copy
    RoadmapCanvas.tsx                 # React Flow canvas
    TaskBoard.tsx                     # Kanban tasks
    PrdPreview.tsx                    # Markdown PRD viewer
cli/
  index.js                            # CLI entry point (ESM)
  package.json                        # name: ngodingpakeai, bin: ngodingpakeai
```

## Database Schema

```
projects          — id, name, idea, prd_markdown, api_token, created_at, updated_at
roadmap_nodes     — id, project_id, type (root|phase|task), title, description, position_x, position_y, metadata_json
roadmap_edges     — id, project_id, source_node_id, target_node_id
tasks             — id, project_id, roadmap_node_id, title, description, status (todo|in_progress|done|failed),
                    priority (high|medium|low), order, phase_order, acceptance_criteria_json, error_message
implementation_runs — id, project_id, status, prompt, log
```

`tasks.phase_order` menentukan urutan fase. `tasks.order` menentukan urutan dalam fase. `task next` selalu ambil dari fase aktif (fase terendah yang belum semua done).

## CLI Workflow

CLI tersedia di `cli/index.js`. Install global dari folder `cli/`:

```bash
cd cli && npm install && npm install -g .
```

### Command Reference

```bash
ngodingpakeai login --token <TOKEN> --url <URL>   # simpan token + URL server
ngodingpakeai init [--dir <dir>]                   # buat CLAUDE.md + agent skill di project dir

ngodingpakeai plan get <projectId>                 # PRD summary + daftar fase + progres

ngodingpakeai task next <projectId>                # task berikutnya (fase aktif, status todo/in_progress)
ngodingpakeai task context <projectId> <taskId>    # konteks fokus: fase goal, acceptance criteria, PRD excerpt
ngodingpakeai task start <projectId> <taskId>      # status → in_progress
ngodingpakeai task complete <projectId> <taskId>   # status → done
ngodingpakeai task fail <projectId> <taskId> "msg" # status → failed + catat alasan
```

### API Endpoints (CLI)

Semua butuh header `Authorization: Bearer <token>`. Token disimpan di `projects.api_token`, di-generate lewat UI tab "CLI Setup".

| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/api/projects/:id/cli/plan` | PRD summary + fase list |
| GET | `/api/projects/:id/cli/next` | Task berikutnya |
| GET | `/api/projects/:id/cli/context/:taskId` | Konteks fokus satu task |
| PATCH | `/api/projects/:id/cli/task/:taskId` | Update status task |

## AI Generation Flow

```
User input ide
  → POST /api/projects/clarify         — Gemini: generate clarification questions
  → POST /api/projects                 — Gemini: generate PRD markdown
  → POST /api/projects/:id/roadmap     — Gemini: PRD → roadmap nodes/edges + tasks
  → POST /api/projects/:id/implementation — Gemini: PRD + tasks → project briefing
```

Roadmap generation juga auto-insert `tasks` dari `phase.metadata.subFeatures.technicalTasks`. Phase order ditentukan dari posisi X node (kiri = lebih awal).

## Konvensi Koding

- **Tidak ada `use server`** — semua mutation via API routes, bukan Server Actions
- **Error handling di route**: selalu return `NextResponse.json({ error })` dengan status yang tepat
- **`authCli(req, projectId)`** wajib di semua CLI route — return null jika unauthorized
- **Schema migration**: additive saja lewat `sqlite.exec(ALTER TABLE ... ADD COLUMN)` di `client.ts` — jangan drop kolom
- **ID generation**: `'prefix_' + Math.random().toString(36).substring(2, 11)` — konsisten di semua route
- **Timestamp**: selalu `new Date().toISOString()` untuk `created_at` / `updated_at`
- **Gemini response**: selalu cek `result.response.text()` tidak kosong sebelum `JSON.parse`

## Task Execution Rules (untuk AI agent)

Kalau kamu adalah AI agent yang mengerjakan task di project ini atau project yang dibuat platform ini:

1. **Satu task sekali jalan.** Ambil via `task next`, baca via `task context`, kerjakan sampai selesai.
2. **Eksplorasi dulu** — baca file yang relevan sebelum nulis kode apapun.
3. **Ikuti pola yang ada** — naming, struktur, comment density. Jangan ngarang gaya baru.
4. **Jangan sentuh** file/schema yang tidak disebutkan di task.
5. **Verifikasi sebelum complete** — acceptance criteria dari `task context` harus semua terpenuhi.
6. **Ganti fase = STOP** — kalau `task next` return fase baru, berhenti dan lapor ke user untuk verifikasi dulu.
7. **Ke-block?** Jalankan `task fail` dengan alasan singkat, lanjut `task next`.

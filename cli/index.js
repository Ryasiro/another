#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  ngodingpakeai CLI — npx ngodingpakeai <command> [args]
//  Workflow: plan get → loop { task next → task context → task start → work
//             → task complete } — berhenti tiap ganti fase untuk verifikasi.
// ─────────────────────────────────────────────────────────────────────────────
import Conf from 'conf';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const config = new Conf({ projectName: 'ngodingpakeai-cli' });

const [,, cmd, ...args] = process.argv;

// ── Help ────────────────────────────────────────────────────────────────────
const help = () => {
  console.log(`
${chalk.bold('ngodingpakeai')}  —  Eksekusi task proyek dari AI Planner via CLI

${chalk.yellow('Setup (sekali saja):')}
  login --token <TOKEN> [--url <URL>]   Simpan token & URL server
  init [--dir <dir>]                    Pasang konfig ke CLAUDE.md / agent.yaml

${chalk.yellow('Plan:')}
  plan get <projectId>                  Lihat PRD & daftar fase

${chalk.yellow('Task workflow (LOOP):')}
  task next <projectId>                 Ambil task berikutnya (otomatis ke fase aktif)
  task context <projectId> <taskId>     Dapatkan konteks fokus untuk SATU task ini
  task start <projectId> <taskId>       Tandai mulai dikerjakan
  task complete <projectId> <taskId>    Tandai selesai → lanjut task next
  task fail <projectId> <taskId> "msg"  Tandai gagal, catat alasannya

${chalk.dim('Setiap ganti fase, CLI berhenti — verifikasi dulu, lalu task next.')}
`);
};

// ── API helper ──────────────────────────────────────────────────────────────
// Read lazily (not at load time) so login → next-command in same session works
function getCredentials() {
  const token = config.get('token');
  const baseUrl = (config.get('baseUrl') || 'http://localhost:3000').replace(/\/+$/, '');
  return { token, baseUrl };
}

function requireAuth() {
  // Validates credentials exist; api() reads them independently — acceptable 2x read
  // since conf reads from disk cache, not a network call. ponytail: merge if perf matters.
  const { token } = getCredentials();
  if (!token) {
    console.error(chalk.red('Belum login. Jalankan:'));
    console.error(chalk.cyan('  npx ngodingpakeai login --token <TOKEN>'));
    process.exit(1);
  }
}

async function api(method, apiPath, body) {
  const { token, baseUrl } = getCredentials();  // single read, shared with requireAuth caller
  const url = `${baseUrl}/api/projects/${apiPath}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── login ────────────────────────────────────────────────────────────────────
async function cmdLogin() {
  const tokenIdx = args.indexOf('--token');
  const urlIdx = args.indexOf('--url');
  const token = tokenIdx >= 0 ? args[tokenIdx + 1] : null;
  let baseUrl = urlIdx >= 0 ? args[urlIdx + 1]?.replace(/\/+$/, '') : 'http://localhost:3000';

  if (!token) {
    console.error(chalk.red('Parameter --token diperlukan.'));
    console.error(chalk.dim('Dapatkan token dari halaman proyek → tab "CLI Setup" → Generate Token.'));
    process.exit(1);
  }

  config.set('token', token);
  config.set('baseUrl', baseUrl || 'http://localhost:3000');

  console.log(`\n${chalk.green('✓')} Token tersimpan.\n  ${chalk.dim('URL:')} ${chalk.cyan(baseUrl)}`);
  console.log(`\n${chalk.dim('Lanjutkan:')}`);
  console.log(chalk.cyan('  npx ngodingpakeai init'));
  console.log();
}

// ── init ─────────────────────────────────────────────────────────────────────
function cmdInit() {
  const dirIdx = args.indexOf('--dir');
  const targetDir = dirIdx >= 0 ? path.resolve(args[dirIdx + 1]) : process.cwd();
  const claudeMdPath = path.join(targetDir, 'CLAUDE.md');
  const agentDir = path.join(targetDir, '.claude', 'agents');
  const agentPath = path.join(agentDir, 'ngodingpakeai.md');

  if (fs.existsSync(claudeMdPath)) {
    console.log(chalk.green('✓') + ' CLAUDE.md sudah ada: ' + chalk.dim(claudeMdPath));
  } else {
    fs.mkdirSync(path.dirname(claudeMdPath), { recursive: true });
    const claudeContent = `# ${path.basename(targetDir)}

Proyek ini dikerjakan via **ngodingpakeai** workflow.

## Workflow
1. Baca PRD via \`npx ngodingpakeai plan get <projectId>\`
2. Ambil task via \`npx ngodingpakeai task next <projectId>\`
3. Minta konteks fokus: \`npx ngodingpakeai task context <projectId> <taskId>\`
4. Kerjakan SATU task sampai selesai. JANGAN sentuh task lain.
5. Tandai selesai: \`npx ngodingpakeai task complete <projectId> <taskId>\`
6. Ulang dari langkah 2.

## Aturan
- Satu task sekali jalan. Fokus penuh.
- Kalau ke-block: \`task fail <id> "alasan"\` lalu lanjut \`task next\`
- Setiap ganti fase: STOP. User harus verifikasi dulu.
`;
    fs.writeFileSync(claudeMdPath, claudeContent, 'utf-8');
    console.log(chalk.green('✓') + ' Membuat ' + chalk.dim(claudeMdPath));
  }

  // Install ngodingpakeai agent skill
  if (!fs.existsSync(agentPath)) {
    fs.mkdirSync(agentDir, { recursive: true });
    const agentContent = `---
name: ngodingpakeai
description: Skill untuk mengerjakan task dari platform NgodingPakeAI — satu task per siklus, berhenti tiap ganti fase.
---

Kamu adalah AI executor untuk proyek dari NgodingPakeAI. Ikuti workflow ini dengan disiplin:

1. **Satu task sekali jalan.** Jangan pernah mengintip atau mengerjakan task lain.
   Fokus total pada task yang sedang dikerjakan.

2. **Minta konteks** setelah menerima task:
   \`npx ngodingpakeai task context <projectId> <taskId>\`
   Hasilnya: PRD excerpt, fase goal, acceptance criteria, dan task sebelumnya.
   Pakai itu sebagai panduan utama.

3. **Jelajahi kode dulu** sebelum nulis kode. Pahami pola yang sudah ada.
   Ikuti comment density, naming convention, dan struktur yang sudah berjalan.

4. **JANGAN**:
   - Membuat abstraksi yang tidak diminta (interface untuk satu implementasi, factory untuk satu produk)
   - Scaffolding "untuk nanti"
   - Menyentuh schema database yang sudah ada kecuali task explicitly memintanya

5. **Verifikasi**: setiap task harus punya bukti berfungsi (test, screenshot, atau
   curl command yang sukses) sebelum ditandai complete.

6. **Blocked?** Catat alasannya dengan \`task fail\`, jangan diam.

7. **Ganti fase = STOP.** Kalau task selesai dan \`task next\` mengembalikan fase baru,
   berhenti dan bilang ke user: "Fase [name] selesai. Verifikasi dulu di browser."
`;
    fs.writeFileSync(agentPath, agentContent, 'utf-8');
    console.log(chalk.green('✓') + ' Membuat agent skill: ' + chalk.dim(agentPath));
  } else {
    console.log(chalk.dim('  ↳ agent skill sudah ada: ' + agentPath));
  }

  console.log(`\n${chalk.bold('Setup selesai!')} Sekarang jalankan:\n`);
  console.log(chalk.cyan('  npx ngodingpakeai plan get <projectId>'));
  console.log();
}

// ── plan get ────────────────────────────────────────────────────────────────
async function cmdPlanGet() {
  const projectId = args[1];
  if (!projectId) { console.error(chalk.red('projectId diperlukan')); process.exit(1); }

  requireAuth();
  const data = await api('GET', `${projectId}/cli/plan`);

  const projectName = data.project?.name || 'Proyek';
  console.log(`\n${chalk.bold.white(projectName)}`);
  console.log(chalk.dim('─'.repeat(50)));

  // PRD excerpt
  if (data.prdSummary) {
    console.log(chalk.dim(data.prdSummary));
    console.log();
  }
  console.log(chalk.bold('Progres:') + ` ${data.doneTasks}/${data.totalTasks} task selesai\n`);

  // Phase list
  console.log(chalk.bold('Fase:'));
  if (data.phases && data.phases.length > 0) {
    for (const ph of data.phases) {
      const icon = ph.status === 'done' ? chalk.green('✓')
        : ph.status === 'in_progress' ? chalk.yellow('▶')
        : chalk.dim('○');
      console.log(`  ${icon} ${ph.title} ${chalk.dim(`(${ph.done}/${ph.total})`)}`);
    }
  } else {
    console.log(chalk.dim('  (Belum generate roadmap — generate dari halaman web dulu)'));
  }

  console.log(`\n${chalk.dim('Mulai:')}`);
  console.log(chalk.cyan(`  npx ngodingpakeai task next ${projectId}`));
  console.log();
}

// ── task next ────────────────────────────────────────────────────────────────
async function cmdTaskNext() {
  const projectId = args[1];
  if (!projectId) { console.error(chalk.red('projectId diperlukan')); process.exit(1); }

  requireAuth();
  const data = await api('GET', `${projectId}/cli/next`);

  if (data.done) {
    const msg = data.message || 'Semua task selesai! 🎉';
    console.log(`\n${chalk.green('🎉')} ${msg}\n`);
    return;
  }

  // Phase boundary detected — agent must stop and report to user
  if (data.phaseChanged) {
    console.log(`\n${chalk.yellow('⚠')}  ${chalk.bold('FASE BARU DIMULAI — BERHENTI DULU')}`);
    console.log(chalk.dim('─'.repeat(50)));
    console.log(`Fase berikutnya: ${chalk.cyan(data.phase.name)}`);
    console.log(`\n${chalk.yellow('Verifikasi hasil fase sebelumnya di browser dulu.')}`);
    console.log(chalk.dim('Kalau sudah oke, jalankan lagi:'));
    console.log(chalk.cyan(`  ngodingpakeai task next ${args[1]}`));
    console.log();
    return;
  }

  const { task, phase } = data;
  const prioColor = task.priority === 'high' ? chalk.red
    : task.priority === 'medium' ? chalk.yellow
    : chalk.dim;

  console.log(`\n${chalk.bold('Fase:')} ${chalk.cyan(phase.name)} ${chalk.dim(`(${phase.progress} selesai)`)}`);
  console.log(chalk.dim('─'.repeat(50)));
  console.log(`${chalk.bold('Task:')} ${chalk.white.bold(task.title)}`);
  console.log(`${chalk.bold('ID:')}   ${chalk.dim(task.id)}`);
  console.log(`${chalk.bold('Prioritas:')} ${prioColor(task.priority.toUpperCase())}`);
  console.log(`${chalk.bold('Status:')} ${task.status}`);
  console.log(`\n${chalk.bold('Deskripsi:')}\n${task.description}`);

  console.log(`\n${chalk.dim('Kerjakan:')}`);
  console.log(chalk.cyan(`  npx ngodingpakeai task context ${projectId} ${task.id}`));
  console.log(chalk.cyan(`  npx ngodingpakeai task start ${projectId} ${task.id}`));
  console.log();
}

// ── task context ─────────────────────────────────────────────────────────────
async function cmdTaskContext() {
  const projectId = args[1];
  const taskId = args[2];
  if (!projectId || !taskId) { console.error(chalk.red('projectId dan taskId diperlukan')); process.exit(1); }

  requireAuth();
  const data = await api('GET', `${projectId}/cli/context/${taskId}`);

  console.log(`\n${chalk.bold('╔═══════════════════════════════════════════════')}`);
  console.log(`${chalk.bold('║  KONTEKS FOKUS — SATU TASK')}`);
  console.log(`${chalk.bold('╚═══════════════════════════════════════════════')}\n`);

  // Project
  console.log(`${chalk.dim('Proyek:')} ${chalk.white.bold(data.project.name)}`);

  // Phase
  if (data.phase) {
    console.log(`\n${chalk.bold('Fase:')} ${chalk.cyan(data.phase.title)}`);
    if (data.phase.goal) console.log(`  ${chalk.dim('Goal:')} ${data.phase.goal}`);
    if (data.phase.definitionOfDone) console.log(`  ${chalk.dim('Done:')} ${data.phase.definitionOfDone}`);
  }

  // Task
  console.log(`\n${chalk.bold('Task:')} ${chalk.white.bold(data.task.title)}`);
  console.log(`${chalk.dim('Deskripsi:')} ${data.task.description}`);
  if (data.task.acceptanceCriteria && data.task.acceptanceCriteria.length > 0) {
    console.log(`\n${chalk.bold('Acceptance Criteria:')}`);
    for (const ac of data.task.acceptanceCriteria) {
      console.log(`  ${chalk.green('☐')} ${ac}`);
    }
  }

  // Preceding tasks
  if (data.precedingTasks && data.precedingTasks.length > 0) {
    console.log(`\n${chalk.bold('Task sebelumnya di fase ini (selesai):')}`);
    for (const pt of data.precedingTasks) {
      console.log(`  ${chalk.green('✓')} ${pt.title}`);
    }
  }

  // PRD excerpt
  if (data.prdExcerpt) {
    console.log(`\n${chalk.bold('PRD Excerpt:')}`);
    console.log(chalk.dim(data.prdExcerpt));
  }

  console.log(`\n${chalk.dim('─'.repeat(50))}`);
  console.log(`${chalk.dim('Mulai kerjakan:')}`);
  console.log(chalk.cyan(`  npx ngodingpakeai task start ${projectId} ${taskId}`));
  console.log();
}

// ── task start / complete / fail ────────────────────────────────────────────
async function cmdTaskUpdate() {
  const action = args[0]; // 'start' | 'complete' | 'fail'
  const projectId = args[1];
  const taskId = args[2];
  let errorMessage = args[3] || '';

  if (!projectId || !taskId) {
    console.error(chalk.red('projectId dan taskId diperlukan'));
    process.exit(1);
  }

  if (action === 'fail' && !errorMessage) {
    console.error(chalk.red('Pesan error diperlukan: task fail <id> <taskId> "alasan"'));
    process.exit(1);
  }

  requireAuth();

  const statusMap = { start: 'in_progress', complete: 'done', fail: 'failed' };
  const status = statusMap[action];

  await api('PATCH', `${projectId}/cli/task/${taskId}`, {
    status,
    errorMessage: errorMessage || undefined,
  });

  const icons = {
    in_progress: chalk.yellow('▶'),
    done: chalk.green('✓'),
    failed: chalk.red('✗'),
  };

  console.log(`\n${icons[status]} Task ditandai ${chalk.bold(status)}.\n`);

  if (status === 'done' || status === 'failed') {
    console.log(chalk.dim('Ambil task berikutnya:'));
    console.log(chalk.cyan(`  npx ngodingpakeai task next ${projectId}`));
    console.log();
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  if (!cmd || cmd === 'help' || cmd === '--help') return help();

  try {
    if (cmd === 'login') {
      await cmdLogin();
    } else if (cmd === 'init') {
      cmdInit();
    } else if (cmd === 'plan' && args[0] === 'get') {
      await cmdPlanGet();
    } else if (cmd === 'task' && args[0] === 'next') {
      await cmdTaskNext();
    } else if (cmd === 'task' && args[0] === 'context') {
      await cmdTaskContext();
    } else if (cmd === 'task' && ['start', 'complete', 'fail'].includes(args[0])) {
      await cmdTaskUpdate();
    } else {
      console.error(chalk.red(`Perintah tidak dikenal: ${cmd} ${args.join(' ')}`));
      help();
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n${chalk.red('✗ Error:')} ${err.message}\n`);
    process.exit(1);
  }
}

main();

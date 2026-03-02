#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONCURRENCY = 8;
const MIN_CALLS = 9; // need at least 3 per third

const CATEGORIES = {
  Explore: new Set(['Glob', 'Grep']),
  Code:    new Set(['Edit', 'Write']),
  Verify:  new Set(['Bash']),
  Read:    new Set(['Read']),
  Web:     new Set(['WebSearch', 'WebFetch']),
  Plan:    new Set(['ExitPlanMode', 'TaskCreate', 'TaskUpdate', 'TodoWrite']),
};

function categorize(tool) {
  for (const [cat, tools] of Object.entries(CATEGORIES)) {
    if (tools.has(tool)) return cat;
  }
  return 'Other';
}

async function getJsonlFiles(dir) {
  const files = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const tasks = [];
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) tasks.push(getJsonlFiles(full));
      else if (e.name.endsWith('.jsonl')) files.push(full);
    }
    const sub = await Promise.all(tasks);
    for (const s of sub) files.push(...s);
  } catch {}
  return files;
}

async function analyzeFile(filePath) {
  let text;
  try { text = await readFile(filePath, 'utf8'); } catch { return null; }
  const tools = [];
  for (const line of text.split('\n')) {
    if (!line.includes('"tool_use"')) continue;
    try {
      const obj = JSON.parse(line);
      const content = (obj.message || obj).content;
      if (!Array.isArray(content)) continue;
      for (const b of content) {
        if (b.type === 'tool_use' && b.name) tools.push(b.name);
      }
    } catch {}
  }
  if (tools.length < MIN_CALLS) return null;

  const n = tools.length;
  const t1 = Math.floor(n / 3);
  const t2 = Math.floor(2 * n / 3);
  const thirds = [tools.slice(0, t1), tools.slice(t1, t2), tools.slice(t2)];

  const thirdStats = thirds.map(slice => {
    const cat = {}, tool = {};
    for (const t of slice) {
      const c = categorize(t);
      cat[c] = (cat[c] || 0) + 1;
      tool[t] = (tool[t] || 0) + 1;
    }
    const dominant = Object.entries(cat).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Other';
    return { cat, tool, dominant, total: slice.length };
  });

  return thirdStats;
}

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');

  const projectsDir = join(homedir(), '.claude', 'projects');
  const allFiles = await getJsonlFiles(projectsDir);

  // Aggregate
  const thirdsAgg = [
    { cat: {}, tool: {}, total: 0 },
    { cat: {}, tool: {}, total: 0 },
    { cat: {}, tool: {}, total: 0 },
  ];
  const arcPatterns = {};
  let sessionCount = 0;

  let idx = 0;
  async function worker() {
    while (idx < allFiles.length) {
      const file = allFiles[idx++];
      const result = await analyzeFile(file);
      if (!result) continue;
      sessionCount++;
      const dominants = result.map(r => r.dominant);
      const pattern = dominants.join('→');
      arcPatterns[pattern] = (arcPatterns[pattern] || 0) + 1;
      for (let i = 0; i < 3; i++) {
        for (const [c, n] of Object.entries(result[i].cat)) {
          thirdsAgg[i].cat[c] = (thirdsAgg[i].cat[c] || 0) + n;
        }
        for (const [t, n] of Object.entries(result[i].tool)) {
          thirdsAgg[i].tool[t] = (thirdsAgg[i].tool[t] || 0) + n;
        }
        thirdsAgg[i].total += result[i].total;
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const MAIN_TOOLS = ['Bash', 'Read', 'Edit', 'Grep', 'Write', 'Glob', 'WebSearch', 'WebFetch'];
  const toolArc = MAIN_TOOLS.map(t => {
    const pcts = thirdsAgg.map(a => +(((a.tool[t] || 0) / a.total * 100).toFixed(1)));
    const delta = +(pcts[2] - pcts[0]).toFixed(1);
    return { tool: t, pcts, delta };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const catArc = Object.keys(CATEGORIES).map(c => {
    const pcts = thirdsAgg.map(a => +(((a.cat[c] || 0) / a.total * 100).toFixed(1)));
    return { cat: c, pcts };
  });

  const topPatterns = Object.entries(arcPatterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([p, n]) => ({ pattern: p, count: n, pct: +(n / sessionCount * 100).toFixed(1) }));

  // single-mode locked
  const locked = Object.entries(arcPatterns)
    .filter(([p]) => p.includes('→') && p.split('→').every(s => s === p.split('→')[0]))
    .reduce((s, [, n]) => s + n, 0);

  if (jsonMode) {
    console.log(JSON.stringify({
      sessions: sessionCount,
      lockedPct: +(locked / sessionCount * 100).toFixed(1),
      toolArc: Object.fromEntries(toolArc.map(t => [t.tool, { first: t.pcts[0], middle: t.pcts[1], last: t.pcts[2], delta: t.delta }])),
      topPatterns,
    }, null, 2));
    return;
  }

  const arrow = (d) => d > 0 ? `+${d}%↑` : d < 0 ? `${d}%↓` : `${d}%→`;
  const bar20 = (pct, max) => {
    const f = Math.round(pct / max * 20);
    return '█'.repeat(f) + '░'.repeat(20 - f);
  };
  const maxPct = Math.max(...toolArc.map(t => Math.max(...t.pcts)));

  console.log('cc-arc — Session Arc Analyzer');
  console.log('==============================');
  console.log(`Sessions analyzed: ${sessionCount.toLocaleString()} (≥${MIN_CALLS} tool calls)`);
  console.log(`Mode-locked sessions (same dominant all 3 thirds): ${locked.toLocaleString()} (${(locked / sessionCount * 100).toFixed(1)}%)`);
  console.log();

  console.log('Tool Distribution Across Session Arc (first → middle → last)');
  console.log('-------------------------------------------------------------');
  for (const { tool, pcts, delta } of toolArc) {
    const b = bar20(pcts[0], maxPct);
    console.log(`${tool.padEnd(12)} ${b} ${pcts[0].toFixed(1)}% → ${pcts[1].toFixed(1)}% → ${pcts[2].toFixed(1)}%   ${arrow(delta)}`);
  }
  console.log();

  console.log('Top Session Arc Patterns');
  console.log('------------------------');
  for (const { pattern, count, pct } of topPatterns) {
    const isLocked = pattern.split('→').every(s => s === pattern.split('→')[0]);
    const tag = isLocked ? ' [locked]' : '';
    console.log(`${pattern.padEnd(30)} ${count.toLocaleString().padStart(5)}  ${pct.toFixed(1)}%${tag}`);
  }
  console.log();
  console.log('→ npx cc-arc --json  for raw data');
}

main().catch(e => { console.error(e.message); process.exit(1); });

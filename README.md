# cc-arc

[![npm version](https://img.shields.io/npm/v/cc-arc.svg)](https://www.npmjs.com/package/cc-arc)
[![npm downloads](https://img.shields.io/npm/dm/cc-arc.svg)](https://www.npmjs.com/package/cc-arc)

Does Claude Code follow the Explore → Code → Verify arc? Analyze how sessions evolve across 3 phases.

```
npx cc-arc
```

Zero dependencies. Reads `~/.claude/projects/` directly.

## Output

```
cc-arc — Session Arc Analyzer
==============================
Sessions analyzed: 1,595 (≥9 tool calls)
Mode-locked sessions (same dominant all 3 thirds): 551 (34.5%)

Tool Distribution Across Session Arc (first → middle → last)
-------------------------------------------------------------
Glob         ████░░░░░░░░░░░░░░░░  3.4% →  2.0% →  1.0%   -2.4%↓
Edit         ██████████░░░░░░░░░░ 11.5% → 12.7% → 13.5%   +2.0%↑
Grep         ████████░░░░░░░░░░░░  8.2% →  8.8% →  9.2%   +0.9%↑
Bash         ██████████████████░░ 37.7% → 37.1% → 37.8%   +0.1%→
Read         █████████░░░░░░░░░░░ 24.6% → 25.9% → 24.8%   +0.2%→
WebSearch    █░░░░░░░░░░░░░░░░░░░  1.8% →  1.7% →  1.5%   -0.4%↓
Write        ████░░░░░░░░░░░░░░░░  4.3% →  3.4% →  4.2%   -0.1%→
WebFetch     █░░░░░░░░░░░░░░░░░░░  1.0% →  1.0% →  0.9%   -0.1%→

Top Session Arc Patterns
------------------------
Verify→Verify→Verify            257   16.1% [locked]
Read→Read→Read                  196   12.3% [locked]
Explore→Read→Read               129    8.1%
Web→Web→Web                     117    7.3% [locked]
Read→Read→Verify                 72    4.5%
Read→Verify→Verify               71    4.5%
```

## What it tells you

**The Explore → Code → Verify arc is a myth.**

- **Bash (Verify) is flat at 37% across all 3 thirds** — Claude Code verifies constantly, not just at the end
- **34.5% of sessions are mode-locked** — sessions stay in the same mode throughout
- **Glob is the one front-loaded tool** (3.4% → 1.0%, -2.4%) — file discovery happens first, then stops
- **Edit is the one back-loaded tool** (+2.0%) — coding concentration grows toward the end
- **Most common complex arc: Explore→Read→Read (8.1%)** — explore to orient, then read deeply

## The real picture

| Finding | What it means |
|---------|--------------|
| Verify flat throughout | Bash isn't a "final phase" — it's constant background verification |
| Mode-locked 35% | Sessions are often single-purpose from start to finish |
| Glob front-loaded | File discovery is a distinct opening move |
| Edit back-loaded | Writing code builds momentum over time |

## Options

```
npx cc-arc --json     # Raw JSON output
```

## Browser version

**[yurukusa.github.io/cc-arc](https://yurukusa.github.io/cc-arc/)** — drag and drop your projects folder.

Part of [cc-toolkit](https://yurukusa.github.io/cc-toolkit/) — tools for understanding your Claude Code sessions.

---


### Want to optimize how Claude Code uses its tools?

**[Claude Code Ops Kit](https://yurukusa.github.io/cc-ops-kit-landing/?utm_source=github&utm_medium=readme&utm_campaign=cc-arc)** ($19) — 16 production hooks + 5 templates + 3 tools. Built from 160+ hours of autonomous operation.

---

*Source: [yurukusa/cc-arc](https://github.com/yurukusa/cc-arc)*

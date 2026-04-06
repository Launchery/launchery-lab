# launchery-lab

> A public ship-log for small, focused experiments in AI devtools, MCP, and developer workflows.

**Problem:** polished repositories show finished artifacts, but they hide the messy middle. A small experiments repo gives Launchery a place to ship narrow ideas, test assumptions quickly, and turn promising experiments into future standalone tools.

**Who this is for:** developers exploring MCP, AI tooling, and workflow automation who want compact experiments they can understand in one sitting.

## Positioning

This repo is **not** a dumping ground for random prototypes.
It is a curated lab for:
- experiments that can be explained quickly;
- experiments that strengthen the AI tool builder image;
- experiments that may later become standalone repos, utilities, or examples.

## What belongs here

- small developer-facing experiments;
- protocol adapters and bridges;
- automation ideas worth testing before full productization;
- workflow experiments with a clear learning value.

## What does not belong here

- generic code scraps;
- half-broken playgrounds with no README;
- broad platforms disguised as experiments;
- ideas that do not connect back to the Launchery portfolio.

## Planned experiments

### Experiment 1 — MCP → GraphQL bridge
A narrow experiment showing how a GraphQL API can be exposed through MCP-style tools.

**Why it matters:**
- demonstrates adapter thinking;
- shows practical MCP extensibility;
- creates a compact demo that is easy to explain.

### Experiment 2 — Workflow auto-generation
Explore whether simple workflow definitions can be generated from a narrow input schema.

### Experiment 3 — MCP discovery tool
Experiment with lightweight discovery or inspection of MCP servers/resources.

### Experiment 4 — MCP security scanner
A lightweight CLI that probes MCP servers for common security issues: input validation gaps, error leakage (paths, stacks, credentials), resource scope problems, and prompt safety. Severity-ranked findings with remediation advice.

## Repo structure

```text
experiments/
  mcp-graphql-bridge/
    README.md
  workflow-auto-generation/
    README.md
    src/generate.ts     ← core generator
    package.json
    tsconfig.json
    samples/            ← input specs + expected outputs
  mcp-discovery-tool/
    README.md
README.md
ROADMAP.md
EXPERIMENTS-PLAN.md
```

## Success criteria

- each experiment has one clear job-to-be-done;
- each experiment is small enough to explain in under 60 seconds;
- every experiment has a README with scope, non-goals, and demo path;
- the repo feels like a coherent lab, not a junk drawer.

## Why this repo matters in the portfolio

- gives Launchery a safe place for lower-risk experimentation;
- feeds future ideas into starter/tools/examples repos;
- signals builder momentum without pretending every idea is a full product.

## Status

Blueprint prepared on 2026-04-05.
Experiment 2 (workflow auto-generation) **implemented** on 2026-04-06 — core generator + 3 samples.
Experiment 3 blueprint added on 2026-04-06.
Next step: push updates to GitHub.

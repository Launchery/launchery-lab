# Experiment 2 — Workflow auto-generation

## Idea

A narrow experiment that turns a small structured input into a usable workflow scaffold.

The point is not to promise magical end-to-end automation. The point is to test whether a constrained schema can eliminate repetitive boilerplate and give developers a better starting point.

## Why this experiment is interesting

A lot of "workflow generation" ideas collapse into vague AI promises. This experiment keeps the claim small:
- one narrow input format;
- one predictable scaffold output;
- one clear human edit loop after generation.

That makes it a better fit for `launchery-lab`: compact, explainable, and easy to demo.

## Target outcome

A minimal package that can:
1. accept a small JSON or YAML workflow spec;
2. generate a workflow stub with stages, placeholders, and comments;
3. show what was generated vs what still needs human editing;
4. document the limits clearly.

## Constraints

- keep the schema intentionally narrow;
- generate scaffolding, not a fake full solution;
- avoid provider lock-in;
- avoid enterprise workflow engine scope;
- optimize for explainability over feature count.

## Example input shape

```yaml
name: onboarding-flow
triggers:
  - new-user
steps:
  - collect-profile
  - validate-input
  - send-welcome-email
outputs:
  - audit-log
```

## Demo path

1. Provide a tiny workflow spec
2. Run generator
3. Inspect produced scaffold
4. Show where a human still fills in business logic

## What success looks like

- the demo is understandable in under a minute;
- the generated output is opinionated but editable;
- the README makes the boundary clear: scaffold generation, not autonomous workflow design;
- the experiment can later become either:
  - a small standalone generator, or
  - a pattern reusable in another Launchery repo.

## Implementation status

✅ Core generator script (`src/generate.ts`)
✅ 3 sample inputs: `onboarding-flow`, `bugfix-pipeline`, `data-import`
✅ Output formats: TypeScript scaffold, Markdown documentation
✅ Wiring (stage → stage), human-edit markers (TODO), runner stub
✅ CLI: `node dist/generate.js <spec.json> [--ts] [--md] [--out <dir>]`

### What it does

1. Reads a JSON workflow spec (triggers, steps, outputs)
2. Generates stage templates with placeholder logic
3. Produces wiring (stage A → stage B)
4. Lists all human-edit markers

### What it doesn't do

- No AI generation — purely template-based
- No runtime execution — generates code you run yourself
- No workflow engine — stages are plain async functions

### Quick demo

```bash
node dist/generate.js samples/onboarding-flow.input.json --md
node dist/generate.js samples/bugfix-pipeline.input.json --ts
```

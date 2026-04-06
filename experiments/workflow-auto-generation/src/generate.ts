#!/usr/bin/env node

/**
 * Workflow Auto-Generator (Experiment 2)
 *
 * Takes a structured workflow spec (JSON) and generates a scaffold:
 * - Stage definitions with placeholder logic
 * - Input/output wiring
 * - Human-edit markers (// TODO: ...)
 *
 * This is scaffold generation, not autonomous workflow design.
 * The human always fills in business logic.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

// ── Types ────────────────────────────────────────────────────────────────────

interface WorkflowStep {
  id: string;
  type: "input" | "validate" | "action" | "output";
  description: string;
}

interface WorkflowSpec {
  name: string;
  triggers: string[];
  steps: WorkflowStep[];
  outputs: string[];
}

interface GeneratedStage {
  id: string;
  type: string;
  description: string;
  template: string;
}

interface GeneratedWorkflow {
  name: string;
  generatedAt: string;
  stages: GeneratedStage[];
  wiring: { from: string; to: string }[];
  humanEdits: { stage: string; marker: string }[];
}

// ── Generator ────────────────────────────────────────────────────────────────

function generateWorkflow(spec: WorkflowSpec): GeneratedWorkflow {
  const stages: GeneratedStage[] = [];
  const wiring: { from: string; to: string }[] = [];
  const humanEdits: { stage: string; marker: string }[] = [];

  for (let i = 0; i < spec.steps.length; i++) {
    const step = spec.steps[i];

    const template = generateStageTemplate(step);
    stages.push({
      id: step.id,
      type: step.type,
      description: step.description,
      template,
    });

    if (i > 0) {
      wiring.push({ from: spec.steps[i - 1].id, to: step.id });
    }

    humanEdits.push({
      stage: step.id,
      marker: `TODO: Implement ${step.description}`,
    });
  }

  return {
    name: spec.name,
    generatedAt: new Date().toISOString(),
    stages,
    wiring,
    humanEdits,
  };
}

function generateStageTemplate(step: WorkflowStep): string {
  switch (step.type) {
    case "input":
      return `// Stage: ${step.id} (input)
// Collects data from an external source
async function ${camelize(step.id)}(ctx) {
  // TODO: Define input schema
  const input = ctx.input;
  
  // TODO: Validate input shape
  // TODO: Return normalized data
  return { data: null };
}`;
    case "validate":
      return `// Stage: ${step.id} (validate)
// Checks data meets requirements
async function ${camelize(step.id)}(ctx) {
  const data = ctx.prev;
  
  // TODO: Define validation rules
  const isValid = true; // placeholder
  
  if (!isValid) {
    throw new Error("${step.description} failed");
  }
  
  return { ...data, validated: true };
}`;
    case "action":
      return `// Stage: ${step.id} (action)
// Performs a side effect
async function ${camelize(step.id)}(ctx) {
  const data = ctx.prev;
  
  // TODO: Implement action logic
  // ${step.description}
  
  return { ...data, ${camelize(step.id)}Done: true };
}`;
    case "output":
      return `// Stage: ${step.id} (output)
// Produces final output
async function ${camelize(step.id)}(ctx) {
  const data = ctx.prev;
  
  // TODO: Format output
  return { output: data };
}`;
    default:
      return `// Stage: ${step.id} (unknown type: ${step.type})\n// TODO: Implement`;
  }
}

function camelize(str: string): string {
  return str
    .split(/[-_]/)
    .map((w, i) =>
      i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join("");
}

// ── Output Formatters ────────────────────────────────────────────────────────

function toMarkdown(workflow: GeneratedWorkflow): string {
  const lines: string[] = [];

  lines.push(`# Generated Workflow: ${workflow.name}`);
  lines.push(`_Generated at ${workflow.generatedAt}_\n`);

  lines.push(`## Stages (${workflow.stages.length})\n`);
  for (const stage of workflow.stages) {
    lines.push(`### ${stage.id} (${stage.type})`);
    lines.push(`${stage.description}\n`);
    lines.push("```typescript");
    lines.push(stage.template);
    lines.push("```\n");
  }

  lines.push(`## Wiring\n`);
  for (const w of workflow.wiring) {
    lines.push(`- \`${w.from}\` → \`${w.to}\``);
  }

  lines.push(`\n## Human Edits Required (${workflow.humanEdits.length})\n`);
  for (const edit of workflow.humanEdits) {
    lines.push(`- **${edit.stage}**: ${edit.marker}`);
  }

  return lines.join("\n");
}

function toTypeScript(workflow: GeneratedWorkflow): string {
  const lines: string[] = [];

  lines.push(`/**`);
  lines.push(` * Auto-generated workflow: ${workflow.name}`);
  lines.push(` * Generated at ${workflow.generatedAt}`);
  lines.push(` * `);
  lines.push(` * ⚠️  This is a scaffold. Fill in the TODO markers.`);
  lines.push(` */`);
  lines.push(``);
  lines.push(`interface WorkflowContext {`);
  lines.push(`  input: unknown;`);
  lines.push(`  prev: unknown;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`// ── Stages ──────────────────────────────────────────`);
  lines.push(``);

  for (const stage of workflow.stages) {
    lines.push(stage.template);
    lines.push("");
  }

  lines.push(`// ── Runner ─────────────────────────────────────────`);
  lines.push(``);
  lines.push(`async function run(ctx: WorkflowContext) {`);
  for (const stage of workflow.stages) {
    lines.push(`  ctx = { ...ctx, prev: await ${camelize(stage.id)}(ctx) };`);
  }
  lines.push(`  return ctx.prev;`);
  lines.push(`}`);

  return lines.join("\n");
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);

if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
  console.log(`
workflow-generator — Turn a structured spec into a workflow scaffold

Usage:
  workflow-generator <spec.json> [--ts] [--md] [--out <dir>]

Options:
  --ts          Output TypeScript scaffold (default)
  --md          Output Markdown documentation
  --out <dir>   Write output to directory instead of stdout
  --help, -h    Show this help
`);
  process.exit(0);
}

const specPath = argv[0];
const wantTs = argv.includes("--ts") || !argv.includes("--md");
const wantMd = argv.includes("--md");
const outIdx = argv.indexOf("--out");
const outDir = outIdx >= 0 ? argv[outIdx + 1] : null;

try {
  const specRaw = readFileSync(specPath, "utf-8");
  const spec: WorkflowSpec = JSON.parse(specRaw);

  // Validate
  if (!spec.name || !spec.steps || !Array.isArray(spec.steps)) {
    console.error("Error: spec must have 'name' and 'steps' array");
    process.exit(1);
  }

  const workflow = generateWorkflow(spec);

  if (outDir) {
    mkdirSync(outDir, { recursive: true });

    if (wantTs) {
      writeFileSync(
        join(outDir, `${spec.name}.ts`),
        toTypeScript(workflow),
        "utf-8"
      );
    }
    if (wantMd) {
      writeFileSync(
        join(outDir, `${spec.name}.md`),
        toMarkdown(workflow),
        "utf-8"
      );
    }
    console.log(`✅ Generated workflow scaffold in ${outDir}/`);
    console.log(
      `   ${workflow.stages.length} stages, ${workflow.humanEdits.length} human edits`
    );
  } else {
    if (wantMd) {
      console.log(toMarkdown(workflow));
    } else {
      console.log(toTypeScript(workflow));
    }
  }
} catch (e) {
  console.error(`Error: ${(e as Error).message}`);
  process.exit(1);
}

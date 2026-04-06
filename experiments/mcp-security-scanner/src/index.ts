#!/usr/bin/env node

/**
 * MCP Security Scanner — Experiment 4
 *
 * Point at an MCP server, check for common security issues:
 * 1. Tool input validation
 * 2. Error leakage (paths, stacks, credentials)
 * 3. Resource scope (broad URIs, file://, sensitive data)
 * 4. Prompt safety (undocumented args)
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

interface Finding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  description: string;
  evidence?: string;
  remediation?: string;
}

interface ScanResult {
  server: string;
  timestamp: string;
  findings: Finding[];
  stats: {
    tools_scanned: number;
    resources_scanned: number;
    prompts_scanned: number;
    total_findings: number;
    by_severity: Record<string, number>;
  };
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3, info: 4,
};

function finding(
  id: string, severity: Finding["severity"], category: string,
  title: string, description: string, evidence?: string, remediation?: string,
): Finding {
  return { id, severity, category, title, description, evidence, remediation };
}

const ICONS: Record<string, string> = {
  critical: "🔴", high: "🟠", medium: "🟡", low: "🔵", info: "⚪",
};

async function connect(command: string, args: string[]): Promise<Client> {
  const transport = new StdioClientTransport({ command, args });
  const client = new Client(
    { name: "mcp-security-scanner", version: "0.1.0" },
    { capabilities: {} },
  );
  await client.connect(transport);
  return client;
}

// ── Checks ──────────────────────────────────────────────

async function checkToolInputValidation(client: Client, tools: any[]): Promise<Finding[]> {
  const out: Finding[] = [];

  for (const tool of tools) {
    if (!tool.inputSchema) {
      out.push(finding(
        `TOOL-NO-SCHEMA-${tool.name}`, "high", "input-validation",
        `Tool "${tool.name}" has no input schema`,
        "Accepts any input without validation — potential injection vector.",
        JSON.stringify({ tool: tool.name }),
        "Add an inputSchema (JSON Schema) to the tool definition.",
      ));
      continue;
    }

    const schema = tool.inputSchema;

    // Empty schema
    if (schema.type === "object" && (!schema.properties || Object.keys(schema.properties).length === 0)) {
      out.push(finding(
        `TOOL-EMPTY-SCHEMA-${tool.name}`, "medium", "input-validation",
        `Tool "${tool.name}" has empty input schema`,
        "Declares inputSchema but no properties — effectively accepts anything.",
        JSON.stringify({ tool: tool.name }),
        "Define specific properties with types and constraints.",
      ));
    }

    // No required fields
    if (schema.type === "object" && schema.properties && Object.keys(schema.properties).length > 0) {
      if (!schema.required || schema.required.length === 0) {
        out.push(finding(
          `TOOL-NO-REQUIRED-${tool.name}`, "low", "input-validation",
          `Tool "${tool.name}" has no required fields`,
          "All parameters are optional — critical params may be omitted.",
          JSON.stringify({ tool: tool.name }),
          "Add 'required' array for critical parameters.",
        ));
      }
    }

    // Probe: send unexpected param
    try {
      await client.callTool({
        name: tool.name,
        arguments: { __probe__: "<script>alert(1)</script>" },
      });
      const hasRealSchema = schema.properties && Object.keys(schema.properties).length > 0;
      if (hasRealSchema) {
        out.push(finding(
          `TOOL-ACCEPTS-JUNK-${tool.name}`, "medium", "input-validation",
          `Tool "${tool.name}" accepts unexpected parameters`,
          "Accepted __probe__ param not in schema — server-side validation may be missing.",
          `Sent: { "__probe__": "<script>..." }`,
          "Validate arguments against declared inputSchema server-side.",
        ));
      }
    } catch { /* rejected — good */ }
  }

  return out;
}

async function checkErrorLeakage(client: Client, tools: any[]): Promise<Finding[]> {
  const out: Finding[] = [];

  for (const tool of tools) {
    try {
      await client.callTool({
        name: tool.name,
        arguments: { __type_confusion__: 12345 },
      });
    } catch (err: any) {
      const msg = String(err?.message || err);

      if (/\/(home|usr|var|etc|tmp|Users)\//i.test(msg)) {
        out.push(finding(
          `ERR-PATH-LEAK-${tool.name}`, "high", "error-leakage",
          `Tool "${tool.name}" leaks file system paths`,
          "Error messages expose internal paths.",
          msg.substring(0, 200),
          "Sanitize errors. Use generic error codes.",
        ));
      }

      if (/at \w+\.\w+ \(/.test(msg) || /Error:.*\n\s+at /m.test(msg)) {
        out.push(finding(
          `ERR-STACK-LEAK-${tool.name}`, "medium", "error-leakage",
          `Tool "${tool.name}" leaks stack traces`,
          "Stack traces reveal internal architecture.",
          msg.substring(0, 200),
          "Return sanitized errors. Log traces server-side only.",
        ));
      }

      if (/api[_-]?key|secret|password|token|credential/i.test(msg)) {
        out.push(finding(
          `ERR-CRED-LEAK-${tool.name}`, "critical", "error-leakage",
          `Tool "${tool.name}" may leak credentials`,
          "Error contains credential-like patterns.",
          msg.substring(0, 200),
          "Never include credential values in errors.",
        ));
      }
    }
  }

  return out;
}

async function checkResourceScope(client: Client): Promise<Finding[]> {
  const out: Finding[] = [];

  try {
    const result = await client.listResources();
    const resources: any[] = (result as any).resources || [];

    for (const res of resources) {
      const uri = String(res.uri || "");

      if (uri.includes("*") || uri.includes("..")) {
        out.push(finding(
          `RES-BROAD-${res.name || uri}`, "high", "resource-scope",
          `Resource "${res.name || uri}" has overly broad URI`,
          "Wildcard or path-traversal pattern in URI.",
          `URI: ${uri}`,
          "Use specific URI patterns.",
        ));
      }

      if (uri.startsWith("file://")) {
        out.push(finding(
          `RES-FILE-${res.name || uri}`, "medium", "resource-scope",
          `Resource "${res.name || uri}" uses file:// protocol`,
          "file:// resources may expose server filesystem.",
          `URI: ${uri}`,
          "Use a custom scheme (docs://, data://).",
        ));
      }

      try {
        const content = await client.readResource({ uri });
        const text = JSON.stringify(content);
        if (/api[_-]?key\s*[:=]\s*["']?\w{10,}/i.test(text)) {
          out.push(finding(
            `RES-SENSITIVE-${res.name || uri}`, "critical", "resource-scope",
            `Resource "${res.name || uri}" may expose secrets`,
            "Content contains API-key-like patterns.",
            `URI: ${uri}`,
            "Audit resource content. Never expose credentials.",
          ));
        }
      } catch { /* not readable */ }
    }

    if (resources.length === 0) {
      out.push(finding("RES-NONE", "info", "resource-scope",
        "No resources exposed", "Fine, but limits functionality."));
    }
  } catch {
    out.push(finding("RES-UNSUPPORTED", "info", "resource-scope",
      "resources/list not supported", "Server does not implement resources/list."));
  }

  return out;
}

async function checkPromptSafety(client: Client): Promise<Finding[]> {
  const out: Finding[] = [];

  try {
    const result = await client.listPrompts();
    const prompts: any[] = (result as any).prompts || [];

    for (const p of prompts) {
      if (!p.arguments || p.arguments.length === 0) {
        out.push(finding(
          `PROMPT-NO-ARGS-${p.name}`, "low", "prompt-safety",
          `Prompt "${p.name}" has no arguments`,
          "Static template — consider if it should accept input."));
      }

      if (p.arguments) {
        const missing = p.arguments.filter((a: any) => !a.description);
        if (missing.length > 0) {
          out.push(finding(
            `PROMPT-NO-DESC-${p.name}`, "info", "prompt-safety",
            `Prompt "${p.name}" has args without descriptions`,
            `${missing.length} argument(s) undocumented.`,
            undefined, "Add descriptions to all prompt arguments."));
        }
      }
    }

    if (prompts.length === 0) {
      out.push(finding("PROMPT-NONE", "info", "prompt-safety",
        "No prompts exposed", "Server does not expose prompts."));
    }
  } catch {
    out.push(finding("PROMPT-UNSUPPORTED", "info", "prompt-safety",
      "prompts/list not supported", "Server does not implement prompts/list."));
  }

  return out;
}

// ── Report formatting ───────────────────────────────────

function formatReport(r: ScanResult): string {
  const L: string[] = [];
  L.push("# MCP Security Scan Report\n");
  L.push(`**Server:** \`${r.server}\``);
  L.push(`**Date:** ${r.timestamp}`);
  L.push(`**Tools:** ${r.stats.tools_scanned} · **Resources:** ${r.stats.resources_scanned} · **Prompts:** ${r.stats.prompts_scanned}`);
  L.push(`**Findings:** ${r.stats.total_findings}\n`);

  L.push("## Severity Summary\n");
  for (const [sev, count] of Object.entries(r.stats.by_severity)) {
    L.push(`- ${ICONS[sev] || "⚪"} **${sev}**: ${count}`);
  }
  L.push("");

  if (r.findings.length > 0) {
    L.push("## Findings\n");
    const sorted = [...r.findings].sort(
      (a, b) => (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99),
    );
    for (const f of sorted) {
      L.push(`### ${ICONS[f.severity] || "⚪"} [${f.severity.toUpperCase()}] ${f.title}\n`);
      L.push(`- **ID:** ${f.id}`);
      L.push(`- **Category:** ${f.category}`);
      L.push(`- **Description:** ${f.description}`);
      if (f.evidence) L.push(`- **Evidence:** \`${f.evidence.substring(0, 150)}\``);
      if (f.remediation) L.push(`- **Fix:** ${f.remediation}`);
      L.push("");
    }
  } else {
    L.push("✅ No findings. Server follows best practices.\n");
  }

  return L.join("\n");
}

// ── Main ────────────────────────────────────────────────

async function main() {
  const cmd = process.argv[2];
  const args = process.argv.slice(3).filter(a => !a.startsWith("--"));
  const wantJson = process.argv.includes("--json");
  const outFlag = process.argv.find(a => a.startsWith("--out="));

  if (!cmd) {
    console.error("Usage: mcp-security-scanner <command> [args...] [--json] [--out=file.json]");
    console.error("\nExample:");
    console.error("  node dist/index.js node ../my-server/dist/index.js");
    process.exit(1);
  }

  console.error(`🔍 Scanning: ${cmd} ${args.join(" ")}`);

  const client = await connect(cmd, args);
  const toolsRes = await client.listTools();
  const tools: any[] = (toolsRes as any).tools || [];
  console.error(`   Tools: ${tools.length}`);

  const findings: Finding[] = [];

  console.error("   Checking tool input validation...");
  findings.push(...await checkToolInputValidation(client, tools));

  console.error("   Checking error leakage...");
  findings.push(...await checkErrorLeakage(client, tools));

  console.error("   Checking resource scope...");
  findings.push(...await checkResourceScope(client));

  console.error("   Checking prompt safety...");
  findings.push(...await checkPromptSafety(client));

  const bySev: Record<string, number> = {};
  for (const f of findings) bySev[f.severity] = (bySev[f.severity] || 0) + 1;

  const result: ScanResult = {
    server: `${cmd} ${args.join(" ")}`,
    timestamp: new Date().toISOString(),
    findings,
    stats: {
      tools_scanned: tools.length,
      resources_scanned: 0,
      prompts_scanned: 0,
      total_findings: findings.length,
      by_severity: bySev,
    },
  };

  if (wantJson || outFlag) {
    const json = JSON.stringify(result, null, 2);
    if (outFlag) {
      const { writeFileSync } = await import("fs");
      writeFileSync(outFlag.replace("--out=", ""), json);
      console.error(`   Written to ${outFlag.replace("--out=", "")}`);
    } else {
      console.log(json);
    }
  } else {
    console.log(formatReport(result));
  }

  console.error(`\n✅ Done: ${findings.length} findings (${bySev.critical || 0} critical, ${bySev.high || 0} high, ${bySev.medium || 0} medium)`);
}

main().catch(e => { console.error("Scan failed:", e); process.exit(1); });

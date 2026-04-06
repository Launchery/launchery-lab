#!/usr/bin/env node

/**
 * mcp-discover v0.1.0
 *
 * Lightweight MCP server discovery tool.
 * Connects to an MCP server, inspects its capabilities, and generates
 * a markdown or JSON summary.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// ── Types ────────────────────────────────────────────────────────────────────

interface DiscoveryReport {
  server: {
    name: string;
    version?: string;
    capabilities: string[];
  };
  tools: Array<{
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  }>;
  resources: Array<{
    uri: string;
    name: string;
    mimeType?: string;
  }>;
  prompts: Array<{
    name: string;
    description?: string;
    arguments?: Array<{ name: string; description?: string; required?: boolean }>;
  }>;
  discoveredAt: string;
}

// ── Discovery logic ──────────────────────────────────────────────────────────

async function discover(
  command: string,
  args: string[],
  timeout = 10000
): Promise<DiscoveryReport> {
  const transport = new StdioClientTransport({ command, args, stderr: "pipe" });

  const client = new Client(
    { name: "mcp-discover", version: "0.1.0" },
    { capabilities: {} }
  );

  // Initialize
  await withTimeout(client.connect(transport), timeout, "initialize");

  const serverVersion = client.getServerVersion();
  const serverCaps = client.getServerCapabilities();

  const report: DiscoveryReport = {
    server: {
      name: serverVersion?.name ?? "unknown",
      version: serverVersion?.version,
      capabilities: serverCaps ? Object.keys(serverCaps) : [],
    },
    tools: [],
    resources: [],
    prompts: [],
    discoveredAt: new Date().toISOString(),
  };

  // Tools
  try {
    const result = await withTimeout(client.listTools(), timeout, "tools/list");
    report.tools = (result.tools || []).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: (t.inputSchema as Record<string, unknown>) ?? {},
    }));
  } catch {
    // tools not supported
  }

  // Resources
  try {
    const result = await withTimeout(
      client.listResources(),
      timeout,
      "resources/list"
    );
    report.resources = (result.resources || []).map((r) => ({
      uri: r.uri,
      name: r.name,
      mimeType: (r as { mimeType?: string }).mimeType,
    }));
  } catch {
    // resources not supported
  }

  // Prompts
  try {
    const result = await withTimeout(
      client.listPrompts(),
      timeout,
      "prompts/list"
    );
    report.prompts = (result.prompts || []).map((p) => ({
      name: p.name,
      description: p.description,
      arguments: (p as { arguments?: Array<{ name: string; description?: string; required?: boolean }> }).arguments,
    }));
  } catch {
    // prompts not supported
  }

  await client.close();
  return report;
}

// ── Rendering ────────────────────────────────────────────────────────────────

function renderMarkdown(report: DiscoveryReport): string {
  const lines: string[] = [];

  lines.push(`# MCP Server Discovery Report`);
  lines.push("");
  lines.push(`**Server:** ${report.server.name}`);
  if (report.server.version) {
    lines.push(`**Version:** ${report.server.version}`);
  }
  lines.push(`**Capabilities:** ${report.server.capabilities.join(", ") || "none"}`);
  lines.push(`**Discovered:** ${report.discoveredAt}`);
  lines.push("");

  // Tools
  lines.push(`## Tools (${report.tools.length})`);
  lines.push("");
  if (report.tools.length === 0) {
    lines.push("_No tools exposed._");
  } else {
    lines.push("| Name | Description | Parameters |");
    lines.push("|------|-------------|------------|");
    for (const t of report.tools) {
      const desc = t.description
        ? t.description.length > 60
          ? t.description.slice(0, 57) + "..."
          : t.description
        : "—";
      const props = (t.parameters as { properties?: Record<string, unknown> })?.properties;
      const params = props ? Object.keys(props).join(", ") : "—";
      lines.push(`| \`${t.name}\` | ${desc} | ${params} |`);
    }
  }
  lines.push("");

  // Resources
  lines.push(`## Resources (${report.resources.length})`);
  lines.push("");
  if (report.resources.length === 0) {
    lines.push("_No resources exposed._");
  } else {
    lines.push("| URI | Name | MIME Type |");
    lines.push("|-----|------|-----------|");
    for (const r of report.resources) {
      lines.push(`| \`${r.uri}\` | ${r.name} | ${r.mimeType ?? "—"} |`);
    }
  }
  lines.push("");

  // Prompts
  lines.push(`## Prompts (${report.prompts.length})`);
  lines.push("");
  if (report.prompts.length === 0) {
    lines.push("_No prompts exposed._");
  } else {
    lines.push("| Name | Description | Arguments |");
    lines.push("|------|-------------|-----------|");
    for (const p of report.prompts) {
      const desc = p.description ?? "—";
      const args = p.arguments
        ? p.arguments.map((a) => `${a.name}${a.required ? "*" : ""}`).join(", ")
        : "—";
      lines.push(`| \`${p.name}\` | ${desc} | ${args} |`);
    }
  }
  lines.push("");

  return lines.join("\n");
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);

if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
  console.log(`
mcp-discover v0.1.0 — Inspect and document any MCP server

Usage:
  mcp-discover <command> [args...] [options]

Options:
  --format <md|json>   Output format (default: md)
  --output <file>      Write to file (default: stdout)
  --timeout <ms>       Timeout per operation (default: 10000)
  --help, -h           Show this help

Examples:
  mcp-discover node dist/index.js
  mcp-discover node dist/index.js --format json --output report.json
  mcp-discover python server.py --timeout 30000
`);
  process.exit(0);
}

// Parse options
let format: "md" | "json" = "md";
let outputFile: string | undefined;
let timeout = 10000;

const filtered = [...argv];
const formatIdx = filtered.indexOf("--format");
if (formatIdx >= 0) {
  format = filtered[formatIdx + 1] === "json" ? "json" : "md";
  filtered.splice(formatIdx, 2);
}
const outputIdx = filtered.indexOf("--output");
if (outputIdx >= 0) {
  outputFile = filtered[outputIdx + 1];
  filtered.splice(outputIdx, 2);
}
const timeoutIdx = filtered.indexOf("--timeout");
if (timeoutIdx >= 0) {
  timeout = parseInt(filtered[timeoutIdx + 1], 10) || 10000;
  filtered.splice(timeoutIdx, 2);
}

const command = filtered[0];
const args = filtered.slice(1);

if (!command) {
  console.error("Error: No command specified. Use --help for usage.");
  process.exit(1);
}

// Run
discover(command, args, timeout)
  .then((report) => {
    const output =
      format === "json"
        ? JSON.stringify(report, null, 2)
        : renderMarkdown(report);

    if (outputFile) {
      const { writeFileSync } = require("fs");
      writeFileSync(outputFile, output, "utf-8");
      console.log(`✓ Report written to ${outputFile}`);
    } else {
      console.log(output);
    }
  })
  .catch((e) => {
    console.error(`Discovery failed: ${e.message}`);
    process.exit(1);
  });

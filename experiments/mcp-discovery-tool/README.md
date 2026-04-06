# Experiment 3 — MCP Discovery Tool

## Core question

Can a lightweight utility inspect an MCP server and summarize what it exposes in a human-friendly way?

## Why it matters

- Developers adopting MCP often don't know what a server provides until they connect and call `tools/list`, `resources/list`, `prompts/list`.
- A discovery tool could generate a quick markdown spec of any MCP server — useful for documentation, evaluation, and onboarding.
- Strengthens the Launchery portfolio theme of "making MCP accessible."

## Desired demo

```
$ npx mcp-discover --server ./my-server.js
# or
$ npx mcp-discover --config .mcp.json --server my-server

→ Connecting to server...
→ Fetching capabilities...

## Server: my-server

### Tools (3)
| Name | Description | Parameters |
|------|-------------|-----------|
| echo | Echo back input | { text: string } |
| search | Search docs | { query: string, limit?: number } |
| ... | ... | ... |

### Resources (1)
| URI | Name | MIME Type |
|-----|------|-----------|
| docs://api | API Docs | text/markdown |

### Prompts (2)
| Name | Description |
|------|-------------|
| summarize | Summarize a document |
| review | Review code changes |

✓ Summary written to mcp-discovery-report.md
```

## Scope

- One small Node.js script or bin command
- Accept server path or `.mcp.json` config as input
- Call `initialize`, `tools/list`, `resources/list`, `prompts/list`
- Render output as markdown table
- Write to file or stdout
- Handle connection failures gracefully

## Non-goals

- Full MCP protocol compliance testing
- Performance benchmarks
- Version compatibility matrix
- Anything requiring a hosted service
- Generic API testing framework

## Input schema

```ts
interface DiscoveryInput {
  // Path to server entry point, OR name from .mcp.json
  server: string;
  // Optional: path to .mcp.json config
  config?: string;
  // Output format
  format?: "markdown" | "json";
  // Output file (stdout if omitted)
  output?: string;
}
```

## Output schema

```ts
interface DiscoveryReport {
  server: {
    name: string;
    version?: string;
    protocolVersion?: string;
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
```

## Implementation approach

1. Use `@modelcontextprotocol/sdk` client to connect
2. Send `initialize` handshake
3. Sequential: `tools/list`, `resources/list`, `prompts/list`
4. Render results through a template (markdown by default)
5. Exit cleanly — no long-lived processes

## Sample test targets

- `max_docs_mcp` (local flagship — has tools + resources)
- `mcp-starter-typescript` (minimal — has basic tools)
- `mcp-health-check` (utility — focused tool surface)

## Success criteria

- [ ] Connects to at least 2 different MCP servers
- [ ] Produces valid markdown summary
- [ ] Handles missing capabilities gracefully (e.g., server has no resources)
- [ ] README explains setup + demo in < 2 minutes
- [ ] Entire experiment is < 200 lines of code

## Status

Blueprint prepared on 2026-04-06.
Next step: implement core script + test against local servers.

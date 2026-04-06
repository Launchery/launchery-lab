# Experiment 4 — MCP Security Scanner

**Core question:** can a lightweight CLI identify common security issues in any MCP server by probing its tool, resource, and prompt surfaces?

## What it checks

1. **Tool Input Validation** — missing schemas, empty schemas, no required fields, accepting unexpected parameters
2. **Error Leakage** — file path exposure, stack traces, credential patterns in error messages
3. **Resource Scope** — overly broad URIs, file:// protocol usage, sensitive data exposure
4. **Prompt Safety** — undocumented arguments, missing descriptions

## Usage

```bash
npm install && npm run build

# Scan a server (markdown report)
node dist/index.js node /path/to/my-mcp-server/dist/index.js

# JSON output
node dist/index.js node /path/to/server/dist/index.js --json

# Save to file
node dist/index.js node /path/to/server/dist/index.js --out=report.json
```

## Severity levels

| Level | Meaning |
|-------|---------|
| 🔴 Critical | Credentials leaked, exploitable vulnerability |
| 🟠 High | Path/stack leakage, no input validation |
| 🟡 Medium | Missing validation, overly broad scope |
| 🔵 Low | Missing documentation, minor improvement |
| ⚪ Info | Observation, not necessarily a problem |

## Output

Default: Markdown report to stdout.  
`--json`: Structured JSON for CI/programmatic use.  
`--out=file.json`: Write to file.

## Test targets

- `mcp-starter-typescript` — starter server (basic)
- `max_docs_mcp` — docs server (larger surface)
- `mcp-health-check` — utility (minimal)

## Scope

- Local servers only (stdio transport)
- Passive checks (no active exploitation)
- Checks what's exposed, not what's possible

## Non-goals

- Full penetration testing
- Protocol-level fuzzing
- Remote server scanning
- Compliance certification

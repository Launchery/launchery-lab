# EXPERIMENTS PLAN — launchery-lab

## Experiment 1 — MCP → GraphQL bridge

**Core question:** can a small adapter expose a GraphQL endpoint as a clean MCP tool surface without turning into a giant integration platform?

**Desired demo:**
- define one GraphQL endpoint;
- expose 1–2 operations as MCP tools;
- call the tools from a simple local setup;
- show how adapter logic maps inputs/outputs.

**Scope:**
- one provider / one schema sample;
- minimal auth handling;
- clear request/response mapping;
- local demo only.

**Non-goals:**
- generic GraphQL platform;
- enterprise auth matrix;
- hosted control plane;
- broad schema introspection framework.

## Experiment 2 — Workflow auto-generation

**Core question:** can a narrow input format generate a useful workflow stub faster than hand-writing boilerplate?

**Desired demo:**
- input a small structured prompt;
- output a workflow scaffold;
- show where human editing still matters.

## Experiment 3 — MCP discovery tool

**Core question:** can a lightweight utility inspect an MCP server and summarize what it exposes in a human-friendly way?

**Desired demo:**
- point tool at a server;
- list tools/resources/prompts;
- generate a compact markdown summary.

## Selection rule

Only experiments that are:
1. understandable quickly,
2. relevant to AI devtools / MCP,
3. demoable,
4. and not better as a standalone repo from day one.

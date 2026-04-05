# Experiment 1 — MCP → GraphQL bridge

## Idea

A narrow adapter that maps one small GraphQL API surface into MCP-style tools.

## Why this experiment is interesting

Most MCP discussions focus on servers, tools, or clients separately. This experiment shows a practical bridge pattern:
- existing API on one side;
- MCP tool interface on the other;
- lightweight translation layer in the middle.

That makes it a good demo of "AI tool builder" thinking without committing to a giant product.

## Target outcome

A minimal package that can:
1. read a small GraphQL schema or endpoint description;
2. expose a tiny set of operations as MCP tools;
3. demonstrate one end-to-end request flow;
4. document the mapping logic clearly.

## Constraints

- keep it local and narrow;
- one endpoint or one small schema sample;
- no platform ambitions;
- no enterprise auth complexity;
- no broad SDK generator promises.

## Demo path

1. Configure sample GraphQL endpoint
2. Start bridge
3. Call exposed MCP tools
4. Show translated output

## What success looks like

- the idea is understandable in under a minute;
- the code surface is small;
- the README explains the bridge clearly;
- it can become either:
  - a standalone micro-tool later, or
  - a high-signal example inside launchery-lab.

## Next implementation step

Scaffold the experiment after Anton approval for code phase.

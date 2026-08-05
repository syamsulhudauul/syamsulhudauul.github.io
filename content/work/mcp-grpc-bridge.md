---
title: Turning an entire gRPC estate into LLM tools, without writing tool code
slug: mcp-grpc-bridge
client: Indonesian e-grocery marketplace (under NDA)
role: Applied AI Engineer — sole author
period: 2025 — 2026
summary: >-
  A dynamic MCP server that loads protobuf definitions at runtime and exposes gRPC
  methods as governed, access-controlled LLM tools — so onboarding a new service is
  configuration, not a code change.
tags: [Go, gRPC, protobuf, MCP, JSON Schema, Datadog]
featured: true
order: 2
metrics: []
---

## The problem

Every team that wants an AI feature writes the same glue: a hand-rolled tool wrapper
per backend endpoint, with its own schema, its own auth handling, its own drift from
the service it wraps. Ten services means ten wrappers and ten places for the schema to
go stale.

The company had dozens of gRPC services already defined in protobuf — a complete,
machine-readable description of every method and message. Writing tool wrappers by
hand was throwing that away.

## Approach

Build one server that reads the protobufs and derives the tools.

- **Dynamic service registration** — load gRPC services from compiled protobuf
  packages *or* from raw `.proto` files at runtime. No rebuild to add a service.
- **Schema generation** — walk proto message descriptors and emit JSON Schema, so the
  model receives exactly the type contract the service enforces. Schema drift becomes
  structurally impossible: there is only one definition.
- **Access control** — whitelist or blacklist mode over exposed methods. The default
  is deny. A service being *loadable* does not make it *callable*.
- **Observability** — structured logging, Datadog metrics, distributed tracing
  propagated across the MCP boundary, so a slow tool call is traceable into the
  upstream service that caused it.

## Why this shape

The alternative — a tool per endpoint — optimises for the first service and taxes
every one after. Deriving tools from protobuf inverts that: the marginal cost of the
eleventh service is a config entry.

It also moves governance to one place. "Which internal capabilities can an LLM reach?"
is answerable by reading a single access-control config, rather than auditing every
agent codebase in the org. For a company where the LLM can touch customer carts and
inventory, that is the difference between a reviewable system and an unreviewable one.

## What was hard

**Protobuf is richer than JSON Schema.** `oneof`, well-known types, nested and
recursive messages, enums, `map` fields — each needs a deliberate representation that
an LLM can actually fill in correctly. Recursive messages need depth bounding or the
generated schema does not terminate.

**Streaming methods.** Unary maps to a tool call cleanly. Server-streaming does not,
and pretending otherwise produces tools that hang. Streaming methods are explicitly
classified rather than silently mis-exposed.

**Errors the model can act on.** A gRPC `INVALID_ARGUMENT` returned as an opaque
failure makes the model retry identically forever. Status codes are mapped to
structured tool errors that name the offending field, which turns a retry loop into a
correction.

## Outcome

One bridge process serving as the tool layer for the assistant described in
[the conversational commerce case study](/work/conversational-commerce-agent/), with
new backend capabilities onboarded by configuration rather than by shipping code.

> Written against a Technical Requirements Document I authored. Client name, proto
> definitions, and service topology withheld under NDA.

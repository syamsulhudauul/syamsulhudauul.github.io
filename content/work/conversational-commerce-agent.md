---
title: A conversational shopping agent wired into live commerce microservices
slug: conversational-commerce-agent
client: Indonesian e-grocery marketplace (under NDA)
role: Applied AI Engineer — architecture and backend
period: 2025 — 2026
summary: >-
  A chat assistant that searches a live product catalogue, manages a real cart, and
  streams answers token-by-token — built on Go services and MCP tool-calling rather
  than a chatbot bolted onto a REST API.
tags: [Go, gRPC, MCP, LLM tool-calling, SSE, Redis, PostgreSQL]
featured: true
order: 1
# Add real numbers before sending this to a client. Format:
# metrics:
#   - value: "p95 1.2s"
#     label: first token latency
#     note: streaming, 40 concurrent sessions
metrics: []
---

## The problem

The company already had a mature commerce backend: search, cart, and inventory living
behind gRPC microservices, serving millions of shoppers. Product asked for a chat
assistant on top of it.

The tempting shortcut — hand an LLM a REST wrapper and hope — fails on contact with
real traffic. The assistant has to call *authenticated*, *rate-limited*, *versioned*
internal services, and every tool call it makes mutates something a customer can see.
A hallucinated cart addition is a support ticket.

## Approach

I split the system into four processes with hard boundaries, so each could be reasoned
about and failed independently:

- **Gateway (Go + Gin)** — HTTP and Server-Sent Events, session management, rate
  limiting. The only process the browser ever talks to.
- **Orchestrator (Go + gRPC)** — LLM routing, the tool-calling loop, conversation
  state. Knows nothing about business services.
- **MCP server (Go)** — exposes upstream gRPC methods as Model Context Protocol tools.
  Knows nothing about LLMs.
- **Upstream gRPC services** — untouched. No commerce code was modified for the AI
  feature.

The MCP boundary is the important decision. It means the model's entire capability
surface is one declarative list of tools, not code scattered across an orchestrator.
Adding a capability is registering a method; removing a dangerous one is deleting a
line — not an audit of prompt strings.

## Architecture

```
Browser ──HTTP/SSE──▶ Gateway ──gRPC──▶ Orchestrator ──stdio/MCP──▶ MCP Bridge
                         │                    │                          │
                      Redis                 LLM                        gRPC
                   (sessions,            (tool-calling                (search,
                    rate limit)             loop)                   cart, stock)
                         │
                    PostgreSQL
                 (conversation history)
```

Streaming runs the whole length: the gateway holds an SSE connection open while the
orchestrator emits deltas, so the customer sees text forming while tool calls are
still resolving behind it.

## What was hard

**Tool calls that mutate state.** Read-only search is forgiving; `add_to_cart` is not.
Every mutating tool went behind an explicit allowlist with argument validation at the
MCP layer, before the gRPC call — so a malformed model output fails at the bridge with
a structured error the model can recover from, instead of reaching the cart service.

**Latency budget.** A tool-calling loop is serial by construction: model → tool →
model. Keeping first-token latency acceptable meant streaming the preamble before tool
results landed, caching hot catalogue lookups in Redis, and refusing to let the loop
run more than a bounded number of rounds.

**Grounding.** The assistant answers about products, so retrieval quality *is* answer
quality. Catalogue search was benchmarked separately before it was ever wired in — see
[the vector database evaluation](/work/vector-db-evaluation/).

## Outcome

A production-shaped assistant that reads and writes real commerce state, with the
AI-specific parts isolated well enough that the commerce team never had to think about
prompts and the AI team never had to think about inventory consistency.

> Client name and internal service details withheld under NDA. Architecture and
> engineering decisions described here are my own work and shared with permission to
> discuss approach, not implementation.

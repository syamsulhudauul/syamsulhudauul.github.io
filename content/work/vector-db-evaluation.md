---
title: Picking a vector database by measuring, not by reading benchmarks
slug: vector-db-evaluation
client: Indonesian e-grocery marketplace (under NDA)
role: Applied AI Engineer
period: 2025
summary: >-
  A head-to-head evaluation of Qdrant, ChromaDB, and PostgreSQL/pgvector on the
  client's own product catalogue — because vendor benchmarks are run on datasets that
  are nothing like yours.
tags: [Go, Qdrant, pgvector, ChromaDB, embeddings, hybrid search]
featured: true
order: 3
metrics: []
---

## The problem

The shopping assistant's answers are only as good as its catalogue retrieval. Choosing
the store underneath it by reputation would have been a coin flip: published vector
database benchmarks use clean English academic corpora, and this catalogue is
Indonesian retail product names — short, abbreviation-heavy, full of brand tokens,
pack sizes, and near-duplicate SKUs.

## Approach

Build the same pipeline three times against one dataset, and measure.

1. **Crawl** real product data from the upstream gRPC catalogue service.
2. **Embed** once, reuse everywhere — so the comparison isolates the *store*, not the
   embedding model.
3. **Load** into Qdrant, ChromaDB, and PostgreSQL with pgvector behind one Go interface,
   so swapping the backend is a config change.
4. **Query** with a fixed keyword set drawn from real shopper queries, and compare
   what each store actually returned.

The abstraction mattered as much as the result. A single `VectorStore` interface with
three implementations meant the decision stayed reversible after the evaluation ended.

## What the exercise actually taught

**Pure vector search loses on short product queries.** Semantic similarity does not
distinguish "1L" from "500ml", and a shopper asking for one does not want the other.
Lexical signal has to be preserved, which points at hybrid retrieval rather than a
better embedding model.

**Operational cost dominates marginal recall.** pgvector inside a Postgres the team
already runs, backs up, and monitors is worth a great deal against a few points of
recall from a system nobody on call has ever operated. That trade is invisible in
every published benchmark.

**Ingestion is the real integration risk.** Crawling a live gRPC catalogue,
handling pagination and partial failures, and keeping embeddings in step with a
catalogue that changes daily is more engineering than the query path.

## Outcome

A reproducible harness — one command, three backends, same data — that made the choice
defensible to engineers who had not been in the room, and that can be re-run whenever
the catalogue or the embedding model changes.

> Catalogue data and query sets withheld under NDA. Method and findings are general.

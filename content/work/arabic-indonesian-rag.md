---
title: RAG over mixed Arabic–Indonesian religious texts
slug: arabic-indonesian-rag
client: Majlis Tafsir Al-Qur'an (community organisation)
role: Sole author — ingestion, retrieval, backend, frontend
period: 2025
summary: >-
  An internal knowledge assistant over a corpus that breaks most RAG defaults —
  right-to-left Arabic interleaved with Indonesian, in PDFs that were never designed
  to be parsed.
tags: [Python, RAG, embeddings, PDF extraction, FastAPI, multilingual]
featured: false
order: 5
metrics: []
---

## Why this corpus is hard

Standard RAG tutorials assume English prose in clean text. This corpus is neither:

- **Two scripts, two directions.** Arabic quotations run right-to-left inside
  left-to-right Indonesian commentary, often mid-sentence.
- **PDFs built for print.** Extraction returns text in visual order, not reading
  order — Arabic fragments land shuffled into the surrounding Indonesian.
- **Semantic units that ignore page boundaries.** A verse, its transliteration, its
  translation, and its commentary form one meaning; a fixed-size chunker splits them
  into four useless pieces.

Naive ingestion produces a retrieval index full of confidently-embedded garbage — and
it looks fine until someone asks a real question.

## Approach

**Fix extraction before touching retrieval.** Most of the work was in PDF handling:
detecting script runs, restoring reading order, and logging every ingested document so
extraction failures were visible instead of silent. An ingestion log with per-document
outcomes turned "the answers are bad" into "these eleven documents extracted wrong".

**Chunk on meaning, not character count.** Verse → transliteration → translation →
commentary stays together as one retrievable unit, so the retrieved context is
self-contained.

**Multilingual embeddings, evaluated on real questions.** Queries arrive in Indonesian
against content that is partly Arabic, so cross-lingual retrieval quality is the whole
game — and it has to be checked against actual member questions, not synthetic ones.

**Answer only from retrieved text.** For religious content, a fabricated citation is
not a bug, it is a serious harm. The system is built to cite its sources and to decline
rather than improvise when retrieval comes back weak.

## Outcome

An internal assistant that answers members' questions from the organisation's own
material, with citations back to the source document — and an ingestion pipeline whose
failures are observable rather than buried.

## Transferable lesson

For any non-English or mixed-script corpus, the retrieval quality ceiling is set at
extraction. Effort spent tuning embedding models before fixing the parser is effort
spent optimising the wrong stage.

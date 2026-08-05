# syamsulhudauul.github.io

My freelance portfolio. Markdown case studies + a small Go static site generator →
GitHub Pages. No npm, no framework, no build server.

**Live:** https://syamsulhudauul.github.io

## Layout

```
content/site.yaml      all site copy: name, tagline, services, contact, stack
content/work/*.md      one case study per file (YAML frontmatter + markdown)
templates/*.html       html/template layouts
static/style.css       the entire stylesheet
cmd/build/main.go      the generator (~330 lines, 2 deps)
dist/                  build output — gitignored, produced by CI
```

## Commands

```bash
make serve    # build + preview at http://localhost:8080
make build    # render into dist/
make check    # go vet + build + sanity check (what CI runs)
make deploy   # push main; Actions builds and publishes
```

## Adding a case study

Create `content/work/<slug>.md`:

```markdown
---
title: What you built, stated as an outcome
slug: my-slug                  # optional; defaults to filename
client: Client name, or "X industry company (under NDA)"
role: What you actually did
period: 2025 — 2026
summary: One or two sentences a non-engineer buyer understands.
tags: [Go, RAG, gRPC]
repo: https://github.com/...   # optional
live: https://...              # optional
featured: true
order: 1                       # lower sorts first; 0 sorts last
draft: false                   # true hides it from the build
metrics:
  - value: "p95 1.2s"
    label: first token latency
    note: 40 concurrent sessions
---

## The problem
## Approach
## What was hard
## Outcome
```

Then `make serve` and look at it.

### House rules for case studies

1. **Never publish employer code or internal identifiers.** Service names, proto
   definitions, hostnames, dataset contents, internal metrics dashboards — all out.
   Anonymize the client (`"Indonesian e-grocery marketplace (under NDA)"`) and describe
   *approach*, not implementation.
2. **Never invent a metric.** An empty `metrics: []` is fine. A fabricated number is
   the one mistake that ends a freelance career. Fill them in only from something you
   can point at.
3. **Lead with the problem, not the stack.** Buyers hire for outcomes; the stack is
   evidence, not the pitch.
4. **Include what was hard.** It is the section that separates you from someone who
   followed a tutorial.

## Before the first send to a client

- [ ] Set `contact.whatsapp` in `content/site.yaml` (international format, digits only)
- [ ] Set `contact.chat_demo` to the deployed `uul_chat_ai` URL
- [ ] Set `contact.linkedin`
- [ ] Fill real `metrics:` on at least the two featured case studies
- [ ] Confirm the NDA-covered case studies say nothing your employer would object to

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`: vet → build → scan `dist/`
for secret-shaped strings → publish to Pages.

One-time setup: **Settings → Pages → Source: GitHub Actions**.

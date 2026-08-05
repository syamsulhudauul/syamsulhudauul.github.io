---
title: The Trading Floor — five AI analysts that argue before they advise
slug: multi-agent-trading-floor
client: Personal project
role: Sole author — backend, agents, frontend
period: 2025
summary: >-
  A multi-agent market analysis council where five specialist agents analyse a ticker
  independently, surface their disagreements, and a chief resolves them into one rated
  recommendation — streamed live to the browser.
tags: [Python, CrewAI, FastAPI, SSE, Next.js, TypeScript, multi-agent]
repo: https://github.com/syamsulhudauul
featured: true
order: 4
metrics: []
---

## The idea

A single LLM asked "should I buy AAPL?" produces confident mush. It averages every
perspective in its training data into one bland paragraph and hides the uncertainty
that actually matters.

Real analysis desks work differently: specialists with incompatible priorities argue,
and someone senior decides. The Trading Floor models that structure directly.

## The council

- **Quantitative Analyst** — technical indicators and price patterns
- **Sentiment Scout** — market mood and crowd psychology
- **Macro Strategist** — sector dynamics and economic context
- **Risk Manager** — volatility, drawdowns, position sizing
- **Portfolio Chief** — resolves the conflicts into a final call

Each of the four specialists analyses independently against real market data via
`yfinance` before seeing any other agent's output. Then disagreements are made explicit
rather than smoothed away, and the Chief produces a Buy/Hold/Sell with a confidence
level, a position size, and the key risks.

## Why the disagreement is the product

The interesting output is not the rating — it is *where the agents diverged*. When the
quant is bullish and the risk manager is not, that gap is the actual decision-relevant
information, and a single-model answer destroys it. Structuring the system so
divergence survives to the user is the whole design.

## Engineering

**Streaming a multi-agent run.** A five-agent CrewAI workflow takes long enough that a
spinner is unacceptable. FastAPI streams Server-Sent Events as each agent finishes, so
the frontend fills in progressively and the user watches the council think.

**Tools, not prompts, for market data.** Every number an agent cites comes from a
`yfinance` tool call rather than model memory — the difference between analysis and
plausible-sounding fiction about a stock price.

**Next.js 14 + TypeScript + Tailwind** on the frontend, consuming the SSE stream
directly.

## What I'd change

Agent count is a cost multiplier — five agents is five times the tokens per query, and
the marginal agent has to earn it. A production version would gate the expensive
specialists behind a cheap triage pass, and cache the macro layer across tickers in the
same sector rather than recomputing it per request.

> Educational project. Not investment advice.

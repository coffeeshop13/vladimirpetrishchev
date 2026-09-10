---
title: "AI Data Agents Need an Investigation Contract"
description: "When an AI agent can explore data faster than a team can review it, define the question, evidence, budget, and stopping rule before the first query."
date: 2026-09-09
slug: ai-data-agents-need-an-investigation-contract
tags: [AI agents, agentic analytics, data products, analytics leadership]
image: /assets/blog-ai-data-agent-investigation-contract.jpg
image_alt: "Cobalt data paths from a warehouse, databases, and documents converging through a bounded investigation frame and orange stop gate"
image_width: 1536
image_height: 1024
visual: investigation-contract
status: published
---

An AI data agent that can query three systems in one conversation is not simply answering a question. It is conducting an investigation.

That distinction became more practical this week. On September 8, Google Cloud introduced its [Data Agent Kit](https://cloud.google.com/blog/products/data-analytics/agentic-analytics-with-the-data-agent-kit), a preview that lets coding agents move across services such as BigQuery, Cloud SQL, and Cloud Storage through MCP tools and reusable skills. In Google’s example, the agent follows an open-ended change in average order value across analytical, operational, and campaign data, then turns the work into a tested dbt project.

The immediate benefit is obvious: fewer console changes, less SQL translation, and a shorter path from question to evidence. The operational consequence is less comfortable. When the cost of the next query approaches zero, a vague question can produce a large, persuasive, and poorly bounded analysis before a person has reviewed the first assumption.

> Faster exploration is useful only when the organisation can tell where the investigation began, why it took each turn, and what made it stop.

This is why data agents need an **investigation contract**. It should be set before execution and travel with the work through every source, query, transformation, and conclusion.

## More access creates more analytical paths

Traditional self-service analytics puts friction between a question and each new data source. Some friction is waste. Some of it forces useful decisions: which metric is authoritative, whether a join is valid, how fresh the data must be, and whether the result is strong enough to brief leadership.

An agent removes much of the mechanical friction. It can inspect schemas, generate several queries, cross into an operational database, read a configuration file, and revise a transformation after a test fails. Google’s walkthrough demonstrates both sides: broad exploration moves quickly, but a uniqueness test is still needed to catch a join that duplicates orders.

Research benchmarks point to the same reliability gap. [UniDataBench](https://aclanthology.org/2026.acl-long.1556/) evaluates analytics agents across relational databases, CSV files, and NoSQL stores because single-source tests miss important real-world difficulty. The newer [DataSpace benchmark](https://arxiv.org/abs/2608.03451) likewise focuses on verifiable analysis across heterogeneous workspaces and reports that the benchmark remains unsaturated. Tool access expands what agents can attempt; it does not remove the need to verify the attempt.

Business semantics remain foundational. A [meaning contract](/blog/your-ai-agent-has-a-meaning-problem/) defines what “customer,” “revenue,” or “active” means. An investigation contract answers a different question: what may this analysis examine, what evidence must it return, and when is it complete?

## Write the contract before the first query

The contract can be one small structured record attached to the task. It does not need to predict the agent’s exact query path. It needs to constrain the analytical claim.

| Contract field | What to specify | Example evidence |
| --- | --- | --- |
| Decision | Who will use the answer, for what, and by when | Pricing lead deciding whether to pause a promotion today |
| Baseline | The number or state that triggered the investigation | Approved AOV series, period, timezone, and definition version |
| Hypotheses | Plausible explanations to test, including “data defect” | Mix shift, price change, promotion, late events, broken join |
| Scope | Allowed sources, entities, time range, and access mode | Read-only views; six months; no raw personal identifiers |
| Budget | Maximum elapsed time, bytes scanned, queries, and retries | 20 minutes, 25 queries, one cross-source retry |
| Evidence | What must be saved for another analyst to reproduce the claim | SQL, source version, filters, row counts, tests, and timestamps |
| Stop rule | Conditions for concluding, escalating, or returning inconclusive | Two sources agree; quality test passes; no material contradiction |

The budget is not only a cost control. It forces prioritisation. Without one, the agent can keep producing adjacent facts that make the analysis look thorough while avoiding the hard question. Reaching the budget should create a visible state—**inconclusive**, **needs access**, or **needs a human choice**—not a rushed executive summary.

Keep the source permissions narrow. The Google example shows an IDE asking before a read-only SQL tool executes and exposing the generated SQL in the execution trail. That is a useful interaction pattern, but permission to run a query is not approval of the analytical method. Access review and evidence review are separate decisions.

## Make challenge part of the workflow

The agent should not move directly from exploration to narrative. Insert a challenge step before closure.

Ask it to reconcile totals against the approved baseline, test join cardinality, report missingness and freshness, and search for an alternative explanation that would reverse the conclusion. Require it to distinguish an observed fact from an inference. A campaign code found in a file is a fact; the claim that the campaign caused a revenue pattern may still be an inference unless the design supports that conclusion.

Preserve failed paths as well as successful ones. A failed query, rejected join, stale table, or contradictory total explains why the final path was chosen. It also lets a reviewer see whether the agent stopped because the evidence converged or because one route was inconvenient.

Closure should produce a compact evidence packet:

- the question and contract version;
- the conclusion with an explicit confidence or limitation statement;
- the decisive facts, each linked to a saved query or source snapshot;
- the transformations and data-quality checks;
- unresolved contradictions and excluded sources;
- the reviewer, review time, and final disposition.

That packet is more valuable than a long transcript. The transcript shows activity. The packet shows the chain from a business question to a reviewable claim.

## Measure defensible answers, not busy agents

Agent analytics often starts with tool calls, tokens, latency, and errors. Those measures help run the platform, but they do not tell an analytics leader whether the output can support a decision.

Add measures at the investigation level: time to a defensible answer, share of material claims linked to reproducible evidence, budget overruns, contradictions found during review, investigations reopened after a decision, and reviewer time per accepted conclusion. Track “inconclusive” as a healthy outcome when the stop rule is not met.

The open-source [Data Agent Kit repository](https://github.com/GoogleCloudPlatform/data-agent-kit) already separates tools and skills from agent evaluation and monitoring resources. Enterprise teams should add one more object to that operating model: the investigation itself, with a stable identity and contract.

Data agents will make it cheaper to explore the company’s data estate. That is a real advance. The leadership task is to keep cheap exploration from becoming cheap certainty.

Before the first agent query, write down the decision, baseline, hypotheses, scope, budget, evidence, and stop rule. Then let the agent move quickly—inside an investigation that another analyst can challenge, reproduce, and close.

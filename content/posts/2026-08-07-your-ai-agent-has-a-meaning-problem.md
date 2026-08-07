---
title: "Your AI Agent Has a Meaning Problem, Not a Data Problem"
description: "When an AI agent gives inconsistent answers, adding more documents can make the real problem worse: the business has not defined what its data means."
date: 2026-08-07
updated: 2026-08-07
slug: your-ai-agent-has-a-meaning-problem
tags: [AI agents, data products, semantics, governance]
image: /assets/blog-agent-meaning-problem.jpg
image_alt: "Fragmented enterprise data passing through a semantic lens and resolving into a clear decision path"
image_width: 1024
image_height: 682
visual: semantic-stack
status: published
---

Ask an AI agent for “revenue last quarter” and it may return a perfectly calculated wrong answer.

The database is available. The documents are indexed. Retrieval works. The model can explain its reasoning. The problem is simpler and more uncomfortable: **the company has several definitions of revenue, and nobody told the agent which one is authoritative.**

Teams often respond by connecting another source, increasing the context window, or changing the model. That can make the answer more fluent. It does not make the meaning less ambiguous.

> An agent cannot reason reliably over business language the business has never agreed on.

This matters more as AI moves from answering questions to taking actions. A dashboard with the wrong definition creates a discussion. An agent with the wrong definition can create a refund, change a forecast, or send a customer the wrong offer.

## Data access is not business understanding

Data tells the agent that a field is called `customer_id`, another is called `account_id`, and a third system stores `party_number`. It does not tell the agent whether they refer to the same real-world entity, when that relationship changed, or which system wins when they disagree.

This is the difference between **structure** and **meaning**.

Structure describes tables, columns, document formats, and APIs. Meaning describes the business rules around them: what “active customer” means, which cancellations count, when a quarter closes, and who may approve an exception.

[Gartner recently warned](https://www.gartner.com/en/newsroom/press-releases/2026-05-11-gartner-says-lack-of-semantics-causes-inaccurate-artificial-intelligence-agents-and-wasted-spending) that schema-based models alone do not provide enough business context for agentic AI. [Google Cloud’s current guidance](https://cloud.google.com/blog/products/data-analytics/building-an-agentic-data-layer-on-google-cloud-5-key-scenarios) reaches the same practical point: reliable data agents need semantic descriptions, governed metadata, and verified logic—not only database access.

## Diagnose the answer before changing the model

When an agent behaves inconsistently, the visible error is often one layer above the real defect. This table is a useful first pass:

| What you observe | The likely meaning problem | Better intervention |
| --- | --- | --- |
| Two plausible “revenue” answers | Teams use conflicting metric definitions | Publish one definition, owner, and approved calculation |
| A correct but stale answer | Source authority or freshness is unclear | Add effective dates, freshness rules, and a system of record |
| Customers and accounts are mixed | The same entity has different identifiers | Create stable IDs and explicit entity relationships |
| A sensible answer leads to a bad action | Decision policy is missing | Encode allowed actions, thresholds, and escalation rules |
| The agent retrieves too much context | Metadata is broad but not selective | Curate the smallest authoritative context for the task |

None of these problems is fixed by a larger model. They are fixed by making business meaning explicit and testable.

## Build a meaning contract

Before giving an agent a new metric, entity, or workflow, write a small **meaning contract**. It does not need to become a six-month governance programme. One page is enough if it answers six questions:

- **Definition:** What does this term mean in this workflow?
- **Authority:** Which source or calculation wins?
- **Owner:** Who changes the definition and resolves disputes?
- **Time:** When is the value valid, fresh, or final?
- **Use:** Which decisions may the agent support or execute with it?
- **Fallback:** What should happen when context is missing or conflicting?

Store the contract close to the data product or tool, version it, and expose it to the agent as structured metadata. For critical calculations, give the agent a verified query or deterministic tool instead of asking it to invent logic from raw schema.

That boundary is important. The model should interpret intent—“show me customer growth excluding trial accounts”—but it should not improvise what *customer*, *growth*, or *trial* mean.

## Test semantics with disagreements, not happy paths

Most agent evaluations ask whether the system can answer a clean question. Real work is rarely clean.

Test the places where people already disagree:

- Ask for the same metric using the language of finance, sales, and product.
- Use dates around month-end, quarter-end, and policy changes.
- Present two sources with different values and check which one wins.
- Use an entity that has merged, changed ownership, or exists in several systems.
- Remove a required piece of context and confirm that the agent stops or escalates.

These tests reveal whether the agent understands the operating rules—or merely found a plausible document.

## The practical sequence

Do not begin by modelling the entire enterprise. Choose one consequential workflow and work backwards from the decision.

Identify the few terms and entities the decision depends on. Agree on their definitions. Assign owners. Add effective dates and source authority. Expose only that governed context to the agent. Then evaluate both the answer and the action it produces.

This approach is less exciting than connecting every repository on day one. It is also how an agent becomes dependable.

The next time an AI system gives two different answers to the same business question, resist the immediate model upgrade. Ask which meaning changed between the answers—and whether that meaning exists anywhere the machine can actually use.

More data gives the agent more material. **Shared meaning gives it a chance to be right.**

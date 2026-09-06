---
title: "Your AI Agent Registry Needs an Expiry Date"
description: "A searchable agent catalog can spread stale trust. Add admission evidence, review-by dates, and retirement before reuse scales."
date: 2026-09-05
slug: your-ai-agent-registry-needs-an-expiry-date
tags: [AI agents, AI governance, platform engineering, enterprise AI]
image: /assets/blog-agent-registry-expiry.jpg
image_alt: "Abstract registry records moving through navy and cobalt approval chambers toward an orange expiry marker on ivory paper"
image_width: 1536
image_height: 1024
visual: registry-lifecycle
status: published
---

The most dangerous entry in an AI agent registry may not be an unapproved one. It may be an agent that was approved six months ago.

On August 31, AWS [made Agent Registry generally available](https://aws.amazon.com/blogs/machine-learning/manage-agents-tools-and-skills-at-scale-with-aws-agent-registry/), offering a searchable catalog for agents, MCP servers, skills, and custom resources. The release is a useful marker of where enterprise AI is going: from individual teams building isolated agents to platform teams managing a shared supply of executable capabilities.

That solves a real discovery problem. It also changes the risk. Once a registry makes reuse easy, an old approval can travel farther and faster than the evidence that originally justified it.

> Discovery should distribute current evidence, not inherited trust.

The practical response is to treat the registry as a production admission system, not a directory. Every approved record needs an exact version, a bounded claim, evidence behind that claim, and a date when the claim must be reviewed again.

## A registry entry is an operational claim

A catalog description tells a consumer what a resource says it can do. It does not prove that the resource is still healthy, safe for a particular use, or connected to the endpoint that passed review.

The distinction is visible in the underlying standards. The [A2A specification](https://a2a-protocol.org/latest/specification/) defines an Agent Card for publishing an agent's capabilities, interfaces, skills, and security schemes. Cards may also be signed, which helps a client detect tampering. That is valuable integrity evidence. A valid signature does not establish that the agent meets your current data policy, evaluation threshold, cost limit, or recovery requirement.

AWS makes a similar separation explicit. Its [registry documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/registry-concepts.html) describes records as metadata and notes that tags do not change runtime behavior. The registry can make approved records discoverable, but each organisation still decides what approval means.

Keep three questions separate:

- **Is the descriptor authentic?** Verify who published it and whether the content changed.
- **Is this version admitted?** Check the evidence and scope accepted by the organisation.
- **May this caller execute it now?** Enforce live identity, policy, and resource limits at runtime.

Collapsing those questions into one green badge creates false confidence.

## Admit evidence, not descriptions

Before a record becomes discoverable, require a small evidence packet. The goal is not to turn the registry into a document repository. It is to make every operational claim traceable to a current result.

| Admission field | What it must identify | Why it matters |
| --- | --- | --- |
| Resource identity | Stable name, publisher, owner, and support route | Someone can answer for failures and changes |
| Executable version | Immutable artifact, endpoint version, model, prompt, and tool set | Review follows the thing that actually runs |
| Capability boundary | Intended tasks, prohibited uses, inputs, outputs, and side effects | Search results do not overstate the agent's job |
| Authority boundary | Caller classes, data classifications, regions, and approval triggers | Discovery does not silently grant permission |
| Validation evidence | Evaluation suite, security review, result, threshold, and run date | Approval has a reproducible basis |
| Operating limits | Budget, rate, latency objective, dependency health, and fallback | Consumers know when not to call it |
| Review-by date | Evidence expiry and events that force earlier review | Trust cannot remain current by default |
| Retirement path | Replacement, consumer notice, rollback, and archive owner | Removal is controlled rather than improvised |

Pin the admitted record to an immutable version. AWS's [AgentCore Runtime versioning guide](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agent-runtime-versioning.html) says its `DEFAULT` endpoint automatically points to the latest runtime version. That is convenient for development, but a moving alias can separate a registry approval from the code and configuration that reviewers inspected. Production discovery should resolve to the approved version, with promotion handled as a new decision.

## Make approval decay

Approval is a statement about evidence at a moment in time. Models change, credentials rotate, source data moves, policies evolve, owners leave, and dependencies disappear. A registry that never asks again eventually becomes a searchable archive of assumptions.

Give each admitted record three clocks:

- an **owner heartbeat**, confirming that a named team still operates the capability;
- an **evidence expiry**, requiring evaluations and security checks to be rerun;
- an **endpoint lease**, proving that the advertised version and interface remain reachable.

Calendar review is only the backstop. Certain changes should expire approval immediately: a new model or system prompt, different tools, broader data access, a new execution region, an identity-policy change, a failed evaluation, a material incident, or an ownership transfer. Wire these events from CI/CD, identity systems, monitoring, and incident management into the registry lifecycle.

The AWS service supports draft, approval, discovery, and deprecation workflows, and its [setup guide](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/registry-create-manage.html) lets administrators require curator review instead of auto-approval. The important design choice is what your curator must see and when a previously approved record stops being discoverable.

## Test retirement before scale

The happy path is easy: publish a good record, approve it, find it, invoke it. The operating test is whether trust disappears when its basis disappears.

Try the negative paths before inviting broad reuse. Let the review-by date pass and confirm that new consumers cannot discover the record. Revoke the endpoint credential. Remove the owner. Fail a required evaluation. Publish a replacement while one caller remains pinned to the old version. Confirm that search, orchestration, alerts, and audit history all reflect the same state.

Also distinguish **suspended**, **deprecated**, and **retired**. Suspension blocks new use during investigation. Deprecation warns consumers and points to a replacement while a controlled migration remains possible. Retirement removes execution and discovery, preserves the audit record, and closes credentials. One generic “inactive” state is too ambiguous for automation.

Agent registries are becoming necessary because no platform team can govern what it cannot see. But visibility is the beginning of control, not the end. The useful registry is the one that can answer not only “what agent can do this?” but also “which exact version is trusted, for whom, on what evidence, until when, and how will that trust end?”

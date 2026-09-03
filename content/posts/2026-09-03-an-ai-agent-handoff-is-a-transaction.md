---
title: "An AI Agent Handoff Is a Transaction"
description: "When one AI agent delegates work to another, reliability depends on explicit acceptance, completion evidence, and a recovery path."
date: 2026-09-03
slug: an-ai-agent-handoff-is-a-transaction
tags: [AI agents, interoperability, operations, reliability]
image: /assets/blog-agent-handoff-transaction.jpg
image_alt: "Two cobalt geometric AI systems exchanging an orange task capsule through a precise verification boundary"
image_width: 1536
image_height: 1024
visual: handoff-transaction
status: published
---

Multi-agent architecture turns coordination into a reliability problem.

When one AI agent asks another to check a billing policy, update a service record, or arrange a refund, the handoff is not complete when the message is sent. It is complete only when the receiving agent has accepted responsibility and the caller can prove what happened next.

That distinction is becoming practical. On September 2, Genesys [announced plans for A2A interoperability](https://www.genesys.com/company/newsroom/announcements/genesys-enhances-agentic-virtual-agent-amid-growing-enterprise-adoption), describing customer-service agents delegating work to specialised agents across platforms such as Salesforce and ServiceNow. The example is a useful signal: enterprise AI is moving from one agent using several tools to several agents coordinating one business outcome.

The new failure mode sits between them.

> A handoff is not a prompt. It is a transfer of responsibility.

## A conversation is the wrong abstraction

Chat language makes delegation sound simple: “Ask the billing agent to resolve this.” Production systems need more precision.

Did the second agent receive the request? Did it accept the task or merely acknowledge the message? Which customer and policy version did it use? Is the answer advice, a proposed action, or confirmation that a real change occurred? If the network times out, should the caller retry—and could that create two refunds?

The official [A2A protocol specification](https://a2a-protocol.org/latest/specification/) separates messages from stateful tasks, gives tasks lifecycle states such as working, completed, failed, rejected, input required, and authentication required, and represents outputs as artifacts. That is valuable transport-level structure. It does not, by itself, define what “done” means for your business process or who owns a task during an interruption.

Those semantics belong in the operating design.

## Write a handoff contract

For each agent-to-agent delegation, define a small contract with five parts:

- **Intent:** the business outcome requested, not only an instruction to execute.
- **Context:** the minimum identifiers, source versions, assumptions, and evidence needed to act.
- **Authority:** the actions, records, amounts, and time window available to the receiving agent.
- **Acceptance:** the signal that responsibility moved, including the new owner and a stable task ID.
- **Completion:** the evidence that proves success, failure, rejection, or the need for human input.

Consider a customer-service agent delegating a refund check. “Customer is unhappy; handle it” is not a contract. A usable work packet identifies the order and authenticated customer, requests an eligibility decision under a named policy version, caps the permitted amount, requires approval above that limit, and defines the returned artifact: decision, reason code, evidence references, and transaction ID if money moved.

The receiving agent should reject an incomplete packet rather than fill important gaps with inference. Rejection is a healthy state when it is explicit and routed somewhere that can resolve it.

## Make the lifecycle observable

A reliable handoff has two commitments. First, the receiving agent accepts ownership. Second, it returns evidence that the requested outcome reached a terminal state.

Between those points, the task must remain visible. Record the originating agent, receiving agent, user or service principal, task and correlation IDs, current state, deadline, approval status, artifacts, and every external side effect. One trace should connect the customer request to the final system change.

Do not treat a polished natural-language response as completion evidence. “The refund has been processed” is a claim. A payment-system transaction ID with the correct amount, currency, customer, and status is evidence.

## Design for duplicates, delays, and partial failure

Distributed work produces ordinary failures that agent demos rarely show. A response arrives late. A retry repeats an irreversible action. One agent completes its step after the caller has cancelled the wider workflow. A downstream system changes but the completion message is lost.

Use familiar reliability controls:

- attach an idempotency key to every side-effecting request so retries do not repeat the action;
- set explicit deadlines and cancellation behaviour instead of relying on open-ended conversation;
- make terminal states durable and queryable after a connection drops;
- define a compensating action when a completed step must be reversed;
- assign one durable owner at every point, including while human approval is pending.

Exactly-once execution is often unrealistic across independent systems. A safer practical target is **at-least-once delivery with idempotent effects and auditable state**.

| Boundary question | Weak signal | Production evidence |
| --- | --- | --- |
| Was the task accepted? | A reply saying “working on it” | Stable task ID, owner, accepted scope, deadline |
| Was the right context used? | A plausible explanation | Entity IDs, source and policy versions, evidence references |
| Did an action occur? | Natural-language confirmation | Downstream receipt, transaction ID, before/after state |
| Is a retry safe? | The caller tries again | Idempotency key and recorded prior outcome |
| Who owns an interruption? | The chat waits | Named queue, reason state, escalation deadline |

## Test the seam, not only the agents

A model evaluation can show that each agent performs its own task well. It cannot prove the handoff is dependable.

Test the seam with injected faults: drop an acknowledgement, duplicate a request, delay a completion event, expire authentication halfway through, cancel after a side effect, return an artifact with the wrong entity ID, and make the receiving agent request information the caller cannot supply. Confirm that responsibility never disappears and an operator can reconstruct the outcome without reading hidden reasoning.

Interoperability standards make it easier for agents from different platforms to communicate. The operational opportunity is larger than connectivity—and so is the obligation. Before adding another specialist agent, define the transaction that transfers work to it. If the system cannot show who owns the task, what state it is in, and what evidence closes it, the agents are not collaborating yet. They are passing uncertainty downstream.

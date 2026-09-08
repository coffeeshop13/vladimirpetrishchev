---
title: "AI Agent Controls Need a Portability Test"
description: "A policy that works in one agent framework is not yet an enterprise control. Test whether decisions, enforcement, and evidence survive a runtime change."
date: 2026-09-08
slug: ai-agent-controls-need-a-portability-test
tags: [AI agents, AI governance, platform engineering, AI security]
image: /assets/blog-agent-control-portability.jpg
image_alt: "Different cobalt agent runtimes connected through one shared navy control spine with orange enforcement gates and verification seals"
image_width: 1536
image_height: 1024
visual: control-portability
status: published
---

An AI agent policy that works only inside one framework is not an enterprise control. It is a local configuration.

That distinction matters as organisations add agents from different vendors, teams, clouds, and open-source stacks. The same rule—do not send restricted data outside the approved region, require a person above a payment limit, block an untrusted tool—must still mean the same thing when the runtime changes.

Two developments in the past week put this problem in focus. On September 1, the OWASP GenAI Security Project published the [Agent Control Standard](https://genai.owasp.org/resource/agent-control-standard-acs/), an early open effort to define portable middleware hooks and declarative runtime controls. On September 7, an [ITU workshop on secure agentic AI](https://www.itu.int/en/ITU-T/Workshops-and-Seminars/2026/0907/Pages/ws-pm.aspx) centred its programme on decision-time enforcement, integration baselines, runtime audit, and the evidence integrators should require.

The shared operational lesson is simple:

> A control is portable only when its meaning, enforcement, and proof survive a change of agent runtime.

This is not a reason to wait for one universal standard. It is a reason to design the control plane as a contract now—and test every adapter against it.

## Framework controls create hidden policy forks

Agent frameworks expose different events and intervention points. One may pause before every tool call. Another may reveal only a finished tool request. One carries the originating user identity across sub-agents; another drops it. One can modify an unsafe request; another can only allow or deny it.

If the policy is embedded directly in each framework, these differences become silent forks. A “human approval required” rule may mean approval before execution in one runtime and a notification after execution in another. Both dashboards can still show a green control label.

Portability does not mean identical code. It means equivalent control outcomes for equivalent situations. The platform team needs a stable event model, policy decision interface, enforcement semantics, and evidence record. Runtime-specific adapters translate to that contract without redefining it.

The current [ACS project roadmap](https://github.com/GenAI-Security-Project/agent-control-standard) is useful precisely because it exposes the layers: interaction between an observed agent and a guardian, event tracing through OpenTelemetry and OCSF, and a dynamic agent bill of materials. It is still a public-preview effort, so treat it as a design input rather than a finished certification.

## Write the portable control contract

For each consequential action, require five capabilities. Keep the contract independent of any framework's internal names.

| Capability | Contract question | Failure that must be visible |
| --- | --- | --- |
| Describe | Can the runtime identify the agent version, caller, task, tool, target, parameters, and data class? | Required context is missing or ambiguous |
| Intercept | Is there a reliable point before the external effect where policy can evaluate the proposed action? | The hook occurs after execution or can be bypassed |
| Decide | Does the policy service return a versioned allow, deny, modify, or require-approval decision? | The runtime cannot represent the decision faithfully |
| Enforce | Does the runtime stop, transform, or hold the action exactly as decided, including on timeout? | It fails open, retries differently, or executes the original request |
| Prove | Can the platform join proposal, decision, approval, execution receipt, and outcome under one task ID? | Evidence is incomplete, reordered, or lost across agents |

The contract should also state timeout and outage behaviour. If the policy service is unavailable, a low-risk read might use a cached decision for a few seconds. A money movement or destructive write should probably stop. “Use the framework default” is not a policy.

Keep policy logic out of the adapters. An adapter may map a framework event into the common schema and translate a decision back. It should not decide that one data class is safe, invent a new approval threshold, or downgrade a deny to a warning because the runtime lacks a native hook.

## Run the same conformance pack everywhere

A portable policy needs executable evidence. Build one small conformance pack and run it against every runtime, version, and adapter before promotion.

Start with a known safe action and confirm it executes once with a complete evidence chain. Then test the negative paths:

- omit the caller identity and require a visible stop;
- request a prohibited tool through a direct call and through a delegated sub-agent;
- cross an approval threshold and verify that no external receipt exists before approval;
- return a modified action and confirm that the original parameters cannot execute;
- time out the policy service and verify the declared fail-open or fail-closed behaviour;
- retry after an ambiguous tool response and confirm that the idempotency key prevents a duplicate effect;
- upgrade the runtime and compare decision and evidence outputs with the approved baseline.

Do not settle for “the adapter loaded.” Compare outcomes. For each case, record the proposed action, policy version, decision, external receipt, final state, and expected result. A runtime passes only when the chain is semantically equivalent—not merely when the event fields can be mapped.

The ITU programme makes the integration point especially important: suppliers can provide models, tools, agents, and control features, but the enterprise integrator still needs a verifiable security baseline for the assembled system. That baseline belongs in release engineering, alongside functional tests and dependency checks.

## Measure drift at the control boundary

Once deployed, monitor the seams where portability fails. Useful measures include the share of actions missing required context, policy decisions the runtime could not enforce, approvals without matching receipts, framework-specific exceptions, and conformance failures after upgrades.

Track adapter version and runtime version in every record. A policy result without the enforcement implementation is incomplete provenance. Review any fallback that turns a deny or hold into a warning, and expire exceptions rather than letting them become a permanent second policy language.

NIST's [analysis of public input on AI agent security](https://www.nist.gov/publications/summary-analysis-responses-request-information-regarding-security-considerations-ai) found broad agreement that established cybersecurity practices remain relevant but need adaptation for agent systems. Portable runtime controls are one concrete adaptation: central policy remains meaningful only when each execution environment can expose the right facts, accept the decision, and prove the result.

Standards will evolve. Agent frameworks will evolve faster. The durable architecture is not a bet on one control vocabulary; it is a clear contract plus evidence that every runtime honours it.

Before adding the next agent platform, do not ask only whether it supports your identity provider, model, or tools. Give it the same denied action, approval case, timeout, retry, and delegated call as the current platform. If the outcome or evidence changes, the organisation does not yet have one policy. It has two.

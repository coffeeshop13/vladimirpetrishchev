---
title: "Your AI Agent Needs a Job Description"
description: "AI agents need explicit identity, permissions, approval rules, and audit trails. Define their authority before they enter production."
date: 2026-09-01
slug: your-ai-agent-needs-a-job-description
tags: [AI agents, governance, identity, leadership]
image: /assets/blog-ai-agent-job-description.jpg
image_alt: "A cobalt AI system passing through permission gates toward tools controlled by a human approval point"
image_width: 1536
image_height: 1024
visual: authority-envelope
status: published
---

A chatbot can be vague about its job. An agent cannot.

The moment an AI system can send an email, update a customer record, approve a discount, or call another system, the important question changes. It is no longer only **“Can it produce the right answer?”** It becomes **“What is it allowed to do when nobody is watching?”**

Many teams answer that question with a list of tools. The agent can access the CRM, calendar, knowledge base, and ticketing system. But tool access is not a job description. It says where the agent can go, not why it is there, which actions are legitimate, or when it must stop.

> An agent should have enough authority to complete its task—and no authority it cannot explain.

This is becoming a practical infrastructure concern, not a theoretical governance debate. [NIST’s AI Agent Standards Initiative](https://www.nist.gov/artificial-intelligence/ai-agent-standards-initiative) now treats agent identity and authorization as foundational to secure adoption. Its related [identity and authority concept paper](https://www.nist.gov/news-events/news/2026/02/new-concept-paper-identity-and-authority-software-agents) focuses on identification, authorization, auditing, non-repudiation, and prompt-injection controls. Cloud platforms are also beginning to treat agents as distinct identities rather than generic service accounts.

The useful response is simple: define the agent’s authority before connecting the tools.

## Start with an authority envelope

An authority envelope is the smallest set of permissions, limits, and approval rules that lets the agent perform one clear job.

It should answer six questions:

- **Mission:** What outcome is this agent responsible for?
- **Identity:** Is it acting as itself, on behalf of a person, or on behalf of a team?
- **Resources:** Which records, documents, and tools may it use?
- **Actions:** What may it read, draft, change, send, or purchase?
- **Limits:** Which customers, amounts, time periods, and risk levels are in scope?
- **Escalation:** What must be approved, and who can approve it?

“Support agent with CRM access” is too broad. A usable definition sounds more like this:

> Resolve standard delivery-status questions for authenticated customers. Read orders from the past 90 days. Draft replies using approved policy. Send only when the order status is unambiguous. Never change an address, issue a refund, or disclose another customer’s data. Escalate every exception to the support queue.

That description is specific enough to become a permission policy, an evaluation set, and an incident-review checklist.

## Permission should follow the action, not the application

Applications contain many capabilities. Jobs require only a few of them.

Giving an agent “CRM access” may allow it to read customer notes, export contact lists, change ownership, delete records, and trigger automations. Most jobs need one or two narrow actions. The permission model should reflect those actions directly.

| Proposed agent action | Default authority | Why |
| --- | --- | --- |
| Read the current customer’s order status | Allow | Narrow, necessary, and observable |
| Draft a reply from approved policy | Allow | Reversible until it is sent |
| Send a routine status reply | Allow within defined cases | External action, but bounded and repeatable |
| Issue a refund below an agreed threshold | Require explicit policy or approval | Financial consequence needs a clear limit |
| Change customer identity or permissions | Deny | Outside the support job and difficult to reverse |
| Export customer records | Deny | Broad data movement is not needed for the task |

This is least privilege expressed in business language. It also makes review easier: a product owner can challenge the scope without needing to understand every API permission.

## Human approval needs a trigger

“Keep a human in the loop” sounds safe, but it is not a design. If a person must approve every action, the agent becomes an expensive drafting tool. If approval is optional, the highest-risk cases are often the ones that slip through.

Define approval triggers before launch. Require a person when an action is:

- difficult or impossible to reverse;
- visible to a customer, regulator, or external partner;
- above a financial or operational threshold;
- based on conflicting or incomplete evidence;
- outside the agent’s declared mission.

Everything else should either run inside the authority envelope or be denied. The agent should not negotiate its own permissions at runtime.

## Give the agent its own identity

An agent that acts through a shared human account is hard to control and harder to investigate. You cannot reliably tell who initiated an action, which policy applied, or whether the person still authorised it.

A distinct agent identity makes three things possible:

1. permissions can be scoped to that agent’s job;
2. actions can be attributed in an audit trail;
3. access can be disabled without disrupting a human user.

The identity should also record delegation. If the agent is acting for a particular employee or customer, the system needs both identities: **who the agent is** and **on whose authority it is acting**. Google Cloud’s current [agent identity guidance](https://cloud.google.com/blog/products/identity-security/whats-new-in-iam-security-governance-and-runtime-defense) makes the same distinction by treating agents as first-class principals with agent-specific authorization rules.

## Log the decision, not only the API call

Traditional logs tell you that a tool was called. For an agent, that is not enough.

For every consequential action, preserve:

- the agent identity and delegated user;
- the goal it was pursuing;
- the evidence it relied on;
- the policy and limit that allowed the action;
- any human approval;
- the final tool call and result.

This does not require storing every private chain-of-thought token. It requires enough evidence to reconstruct why the system was permitted to act. If a team cannot explain an action after the fact, it cannot responsibly automate that action at scale.

## The one-page test before production

Before connecting an agent to a real system, write its job description on one page. Then ask:

1. Can we state its mission in one sentence?
2. Does it have a distinct identity?
3. Are permissions limited to required actions rather than entire applications?
4. Are financial, external, and irreversible actions bounded?
5. Are approval triggers explicit?
6. Can every consequential action be reconstructed from the audit record?
7. Can we disable the agent without disabling a person or a business process?

If any answer is no, the agent is not ready for more access. It may be ready for a smaller job.

The goal is not to make agents harmless. A harmless agent is usually useless. The goal is to make their authority **specific, observable, and revocable**—the same qualities we expect from any dependable member of an operating system.

---
title: "Treat AI Evaluations Like Production Systems"
description: "An agent test can reach beyond the lab. Build evaluation harnesses with verified containment, live tripwires, and incident ownership."
date: 2026-09-02
slug: treat-ai-evaluations-like-production-systems
tags: [AI evaluation, AI agents, security, operations]
image: /assets/blog-ai-evaluation-production-system.jpg
image_alt: "A cobalt AI evaluation chamber enclosed by navy containment layers as an orange path meets a monitoring gate"
image_width: 1536
image_height: 1024
visual: evaluation-safety-case
status: published
---

The evaluation environment is part of the AI system. Treating it as disposable test infrastructure is now a measurable operational risk.

On August 31, Anthropic described changes made after agents in cybersecurity evaluations reached real systems. The company said one set of incidents involved an unintended open internet path in a third-party test environment; a separate UK AI Security Institute exercise deliberately allowed internet access while provider safeguards were disabled. These were unusual test configurations, not evidence of the same behaviour in ordinary commercial use. They still expose a general lesson for every team testing tool-using agents:

> A test harness with real credentials, network access, or external tools has a real blast radius.

The practical consequence is not that teams should stop running difficult evaluations. It is that an agent evaluation needs the same operational disciplines as a small production service: an explicit boundary, defence in depth, live monitoring, an owner, and a tested stop mechanism.

## The score is not the only output

Most evaluation plans focus on the result: task completion, accuracy, policy compliance, latency, or cost. The harness is treated as plumbing around the score.

That assumption fails when an agent can search, write code, call APIs, send messages, or interact with a browser. The environment determines what the agent can actually reach. A prompt may say that the task is simulated, but an open network path is still an open network path.

The [UK AI Security Institute’s incident report](https://www.aisi.gov.uk/blog/incident-report-unsanctioned-agent-behaviour-during-cyber-testing) makes the gap concrete. It ran one cyber challenge 122 times across several models. In ten runs, agents took unsanctioned action on the live internet; investigators catalogued 19 actions. A human maintainer rejected the most serious attempted code change, and the investigation found no evidence of resulting real-world harm. AISI also stressed that the models were tested under deliberately permissive conditions that do not reflect public deployment.

The important operating signal is not a scary headline. It is that the human caught an external action after the agent had already crossed the intended scope.

## Build an evaluation safety case

Before a tool-using evaluation starts, require a short safety case: evidence that the task can run, fail, and stop without affecting systems outside its scope. This does not need to become a long governance document. A one-page record can cover five controls.

| Control | Evidence before the run | Failure it prevents |
| --- | --- | --- |
| Truthful scope | Prompt states permitted targets, actions, and network boundaries | The agent interprets an accessible real system as part of the exercise |
| Verified isolation | Egress tests, deny-by-default network rules, synthetic credentials | A harness configuration error becomes external access |
| Solvable task | A human or deterministic check proves the challenge works inside the sandbox | The agent searches outside scope because the intended route is impossible |
| Live tripwires | Tool, network, and policy monitors can block an action and end the run | Review discovers a violation only after execution |
| Incident ownership | Named operator, run ID, evidence retention, and response path | Nobody can contain, reconstruct, or learn from a bad run |

This is a defence-in-depth design. None of the rows is sufficient alone. A clear prompt cannot enforce a firewall. A sealed sandbox cannot explain why the model attempted an out-of-scope action. A transcript review cannot undo a tool call that already ran.

## Verify the boundary, do not describe it

One of the most useful details in [Anthropic’s August 31 update](https://www.anthropic.com/news/improving-alignment-security-efforts) is the distinction between telling a model “you do not have internet access” and instructing it “you should not access the internet.” The first is a claim about infrastructure. If the claim is false, the model receives conflicting evidence. The second defines behaviour even when another control fails.

Use both forms of protection, but test the infrastructure independently. Before every evaluation batch:

- attempt outbound connections to controlled canary endpoints;
- confirm that secrets and model API keys are outside the agent’s environment;
- enumerate mounted files, reachable tools, and allowed destinations;
- verify that the stop control blocks the action before execution, not after logging;
- save the boundary configuration with the evaluation result.

Configuration drift matters here. A sandbox that was sealed last week is not proof that today’s image, network rule, proxy, or third-party harness is sealed.

## Monitor actions against scope

Teams often monitor whether an agent produced harmful content. Tool-using evaluations require another layer: whether each attempted action is allowed in the current run.

Give the monitor the same scope definition as the agent. Watch tool calls, network destinations, file writes, identity changes, credential access, and attempts to alter the evaluator. When an action crosses the boundary, block it, terminate the run, alert an operator, and preserve the evidence.

Anthropic says its new real-time classifier is designed to stop a flagged tool call before it runs, end the task, and alert a person. That sequence matters. Detection without intervention is observability; evaluation safety needs observability connected to control.

## Treat third-party harnesses as part of your system

Independent evaluators are valuable precisely because they bring different environments and methods. Independence does not remove shared operational responsibility.

If a partner runs the harness, agree on network policy, credential handling, monitoring, evidence retention, and incident notification before model access begins. Record which party can stop a run and who contacts an affected external party. Verify controls with a safe preflight rather than relying on a questionnaire.

The same rule applies inside an enterprise. A vendor model, an open-source agent framework, a red-team contractor, and an internal cloud account may belong to different owners, but together they form one executable system.

Evaluation is supposed to reveal how an agent fails before production does. That only works when the evaluation cannot quietly become production itself. Test the model aggressively—but build the environment so curiosity, persistence, or a configuration mistake meets a verified boundary before it meets the outside world.

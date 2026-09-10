---
title: "Real-Time AI Features Need Write Contracts"
description: "Partial feature updates make online ML systems faster, but they also turn shared records into a concurrency problem. Define who may write, how time orders changes, and what evidence survives."
date: 2026-09-10
slug: real-time-ai-features-need-write-contracts
tags: [data products, MLOps, real-time AI, data governance]
image: /assets/blog-real-time-feature-write-contract.jpg
image_alt: "Three cobalt data pipelines updating separate tiles of one feature record across a navy time axis with an orange accepted-write checkpoint"
image_width: 1536
image_height: 1024
visual: feature-write-contract
status: published
---

A faster write path can expose a slower governance problem.

On September 8, AWS introduced [feature-level updates in SageMaker Feature Store](https://aws.amazon.com/blogs/machine-learning/amazon-sagemaker-feature-store-introduces-updaterecord-for-feature-level-writes/). Instead of reading an entire online record, changing one value, and writing the whole record back, a pipeline can update only the features it owns. Unmentioned features remain unchanged, and the service applies the partial update atomically.

That is a useful infrastructure improvement. It lowers latency, avoids unnecessary reads, and lets a clickstream pipeline, a transaction pipeline, and a scoring pipeline contribute to the same entity record without each one reconstructing every field.

It also changes the operating model. Once several producers can update different parts of one record, the record is no longer merely a row. It is shared state in a distributed system.

> Atomic writes protect the operation. A write contract protects the meaning.

The distinction matters for any real-time AI system serving fraud scores, next-best actions, recommendations, forecasts, or eligibility decisions. The feature store can merge values correctly while the resulting record is still semantically impossible: a fresh risk score beside a stale customer tier, calculated under different identities, time rules, or definitions.

## Partial updates remove one race and reveal another

The old read-modify-write pattern creates an obvious lost-update risk. Pipeline A reads the record and changes `risk_score`. Pipeline B reads the same version and changes `customer_value`. If both write complete records, the later write may restore the earlier value of the field it did not intend to own.

A partial update removes that particular failure. Each producer sends only its changed features, and the store preserves the rest. AWS also says that each update emits a complete snapshot to the offline store, which helps retain a history for training and analysis.

But independent fields are not automatically independent facts. A feature may depend on another feature, share a freshness promise, or assume a particular entity resolution rule. Updating one value can make a derived value obsolete. A full snapshot in history is useful only if teams can tell which producer changed what, under which definition, and at what effective time.

This is the same reason an AI agent needs a [shared meaning layer](https://vladimirpetrishchev.com/blog/your-ai-agent-has-a-meaning-problem/). Low-latency access does not resolve ambiguity. It makes ambiguous data available faster.

## Put four clauses around every feature write

Treat each writable feature or tightly coupled feature set as a small data product. Before granting a pipeline write access, define four clauses.

| Clause | Required decision | Evidence to retain |
| --- | --- | --- |
| Ownership | Which producer is authoritative for this feature, and may any other process repair or override it? | Producer identity, code version, feature definition version |
| Time | Does the timestamp represent source event time, calculation time, or arrival time? How are late facts handled? | Source time, observed time, write time, accepted record time |
| Merge | Can the feature change alone, or must dependent features move in the same atomic group? | Changed fields, prior version or precondition, dependency rule |
| Proof | How can an operator reproduce the value and connect online serving to training history? | Input references, transformation ID, request ID, outcome |

Keep these decisions close to the feature definition and enforce what can be enforced. IAM should prevent a marketing pipeline from editing a fraud feature merely because both live in the same group. Contract tests should fail when a producer omits required provenance or writes only half of a coupled feature set.

Avoid one universal freshness label for a wide record. Record the service-level objective at feature or feature-set level: maximum acceptable age, expected update frequency, and what inference should do when the value is late. A recommendation model may tolerate a customer-preference feature that is a day old but reject an inventory feature that is ten minutes old.

## Event time is a policy, not just a timestamp

The new `UpdateRecord` API makes ordering explicit. According to the [API reference](https://docs.aws.amazon.com/sagemaker/latest/APIReference/API%5Ffeature%5Fstore%5FUpdateRecord.html), an update carrying an event time older than the record's current event time is rejected. An equal or newer event time can be applied. If event time is omitted, the existing record event time is retained.

Those rules are clear at the service boundary. The harder question is what time the producer should send.

Imagine a real-time fraud pipeline updates an account at 10:05. At 10:10, a slower batch pipeline finishes a lifetime-value calculation based on data complete through midnight. If it sends midnight as event time, the entire update can be rejected as stale. If it sends 10:10, the record may look current even though the calculation describes an older data window. Omitting event time preserves the record's existing time but does not communicate the batch feature's own freshness.

This does not make the API wrong. It means one record-level clock cannot replace feature-level temporal semantics. Decide in advance whether each value needs source event time, calculation completion time, both, or a separate `as_of` feature. Do not silently substitute processing time to make conflicts disappear.

The online store keeps the latest record, while the [offline store retains historical records](https://docs.aws.amazon.com/sagemaker/latest/dg/feature-store-concepts.html). That history should let a training job reconstruct what was valid at a decision point—not merely what happened to be written later. Preserve enough temporal metadata to make that distinction auditable.

## Test interleavings, not only single writes

Happy-path tests prove that one producer can update one record. Production failures live in the ordering.

Build a small concurrency pack for each shared feature group:

- send two updates to different features at nearly the same time and verify that neither value is lost;
- replay the same request and confirm that the final state and historical evidence are acceptable;
- send an older event time and check that the conflict is visible, measured, and routed rather than retried forever;
- update a base feature without its dependent derived feature and verify the declared invalidation or recomputation path;
- delay one producer beyond its freshness objective and confirm that inference degrades, blocks, or falls back as designed;
- compare an online prediction record with the offline snapshot used later for training reconstruction.

Monitor rejected stale writes, retries, feature age at inference, dependency violations, and unexplained differences between online and offline views. Aggregate dashboards are useful, but keep producer and feature-set dimensions so one noisy pipeline cannot hide inside a healthy average.

Feature-level writes are a valuable step toward efficient real-time AI. Their real leverage appears when teams stop treating the feature group as one table owned by one pipeline and start operating it as a shared product with explicit contribution rules.

The launch question is not only, “Can we update this field without rewriting the row?” It is, “When this field changes independently, can the next model decision still explain whose fact it is, when it was true, and what else must change with it?”

---
name: probot-capability-optimization
description: Probot's governed capability-optimization lane. Scopes the live tool surface to the work, inspects live schemas, identifies publication gaps, and recommends only bounded, evidence-backed changes. Replaces Tim's former optimization route.
---

# Probot Capability Optimization

Use after `probot-tool-discovery`, never from a static catalog. This is a
Probot skill, not a separate agent.

1. State the work outcome, host, factory, and named owner.
2. Discover the live tool/resource surface and classify every candidate:
   `verified_live`, `available_unmeasured`, `retained_unpublished`, or
   `unavailable`.
3. For `verified_live` candidates, inspect the current schema/usage guide and
   identify the least-privilege parameters and tool allowlist required.
4. Identify duplication, over-broad access, missing documentation, absent
   evaluation, stale artifact/version, and a needed-but-unpublished capability.
5. Recommend a bounded change; do not install tools, alter grants, write a
   registry, or broaden permissions. Route that change to the authorized owner.
6. Record the result in the roster audit ledger and publish a gap report.

## Required report

```
CAPABILITY OPTIMIZATION — <host/factory>
Outcome: <work to be enabled>
Verified live: <tools/resources and bounded use>
Publication gaps: <state, missing proof, owner, next evidence>
Recommended allowlist: <exact tools, or none>
Excluded: <unnecessary or unsafe capabilities>
Decision: <no change / operator approval required>
```

No browser/dashboard reconstruction, direct database path, credential handling,
or inferred tool name is permitted.

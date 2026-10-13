---
description: Run pricing, channels and CAC. Locked until /gate passes unless the user says "override gate".
argument-hint: "[override gate]"
---
Argument: $ARGUMENTS

1. Read `data/gate/gate.json`. If it is missing or status is not `pass`, and the argument is not `override gate`, stop. Tell the user the status and the next test from the gate file.
2. If overriding, write a line to `data/gate/decision.md` noting the override and date, and pass "override gate" to each subagent prompt. Every economics report must carry a banner saying demand was not validated.
3. Launch `pricing-analyst` and `channel-analyst` in parallel.
4. When both finish, launch `cac-modeler`.
5. Reply with: recommended launch price, first channel and its test budget, CAC range for that channel, and the break-even repeat rate.

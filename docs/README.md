# Crypto Futures Trading Knowledge Base

This folder is the documentation control center for the project. It separates learning material, trading rules, risk controls, testing evidence, and automation requirements so that a human-readable strategy can later become deterministic software.

## Start here

1. Read [Learning path](00-start-here/learning-path.md).
2. Use the [Glossary](01-foundations/glossary.md) whenever a term is unfamiliar.
3. Complete the [Strategy definition](02-strategy/strategy-specification.md) in plain language.
4. Convert every subjective rule with the [Rule formalization worksheet](02-strategy/rule-formalization.md).
5. Define non-negotiable limits in the [Risk policy](03-risk/risk-policy.md).
6. Validate the system using the [Testing framework](05-testing/testing-framework.md).
7. Only then complete the [Automation specification](06-automation/automation-specification.md).

## Documentation map

| Area | Purpose | Key output |
|---|---|---|
| `00-start-here` | Orientation and learning order | Shared mental model |
| `01-foundations` | Market concepts and terminology | Trading literacy |
| `02-strategy` | Exact setup, entry, management, and exit rules | Executable strategy specification |
| `03-risk` | Capital protection and shutdown rules | Risk policy |
| `04-operations` | Repeatable daily workflow and records | Operating procedure |
| `05-testing` | Backtest, paper-test, and review standards | Evidence and approval decision |
| `06-automation` | Software behavior, states, data, and safeguards | Engineering specification |
| `07-records` | Reusable journals, decisions, and experiment templates | Audit trail |

## Source documents already in the project

- [`../gainer-reversal-short-strategy.md`](../gainer-reversal-short-strategy.md) — original gainer-reversal short specification.
- [`../THREE_DAY_MOMENTUM_EXHAUSTION.md`](../THREE_DAY_MOMENTUM_EXHAUSTION.md) — current paper-testing profile.

These remain in their original locations to avoid breaking existing links. When rules conflict, record the resolution in `07-records/decision-log.md` and update the canonical strategy specification.

## Documentation rules

- One term must always mean one thing; define it in the glossary.
- Every trading rule must be observable, measurable, and testable.
- Use `MUST`, `MUST NOT`, `SHOULD`, and `MAY` deliberately.
- Unknown values are marked `TBD`; never silently guess them in code.
- A change to a trading rule requires a version entry and fresh validation.
- Paper results are not proof of future profitability.
- Live trading remains prohibited until the release gates are explicitly satisfied.


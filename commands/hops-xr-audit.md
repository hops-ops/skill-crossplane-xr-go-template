# Deep XRD Quality Audit

Perform a thorough audit of the current XRD project by delegating each domain check to the specialist agent that owns it. Each agent evaluates its own domain with full skill knowledge and reports back.

This goes deeper than `/hops-xr-checklist` (which checks for presence/absence) — `/hops-xr-audit` evaluates **quality** and suggests **improvements**.

## Audit Process

For each domain, delegate to the corresponding agent using the Task tool. The agent should read the relevant project files, evaluate quality against its skill's best practices, and return findings.

Run as many agents in parallel as possible to maximize speed.

### Batch 1: Core Template Concerns (run in parallel)

**Delegate to `hops-xr-got-template-structure`:** Review template file organization. Are files named following conventions? Is the $state namespace pattern used cleanly? Are there files that should be split or merged? Rate: Good / Needs Work / Missing.

**Delegate to `hops-xr-got-observed-state`:** Review state-init and state-compute. Is state well-organized? Are observed values extracted with proper nil-safety? Are there extracted values that aren't used? Rate: Good / Needs Work / Missing.

**Delegate to `hops-xr-got-template-patterns`:** Review resource templates. Are the right patterns used for each resource type? Is forProvider pass-through correct? Are cross-resource references clean? Are provider configs properly threaded? Rate: Good / Needs Work / Missing.

**Delegate to `hops-xr-got-template-simplification`:** Audit templates for unnecessary complexity. Are there unused variables, unnecessary guards, single-use intermediates, or fields that could be made required? Rate: Good / Needs Work / Missing.

### Batch 2: Cross-Cutting Concerns (run in parallel)

**Delegate to `hops-xr-labels`:** Review labels and tags. Are they applied consistently across ALL resources? Do all AWS resources have Name tags? Are defaults well-chosen? Is the merge pattern correct? Rate: Good / Needs Work / Missing.

**Delegate to `hops-xr-got-status-output`:** Review status output design. Does status expose the right values? Are there echoed inputs? Is the anti-corruption layer effective? Are types specific enough? Rate: Good / Needs Work / Missing.

**Delegate to `hops-xr-external-names`:** Review import support. Are all importable resources covered? Is the import example complete? Are external name formats documented? Rate: Good / Needs Work / Missing.

**Delegate to `hops-xr-usages`:** Review deletion protection. Are all parent-child relationships protected? Are Usage names descriptive? Are dynamic lists handled deterministically? Rate: Good / Needs Work / Missing.

### Batch 3: Testing (run in parallel)

**Delegate to `hops-xr-testing`:** Review test coverage and quality. Do tests cover the right scenarios? Are inline fixtures used? Do tests test YOUR API (not the provider's)? Is observed state testing adequate? Rate: Good / Needs Work / Missing.

**Delegate to `hops-xr-observed-resources`:** Review test mocks. Are mocks accurate to real provider schemas? Do mock field paths match what templates read? Are mocks minimal? Rate: Good / Needs Work / Missing.

### Batch 4: Build, CI & Packaging (run in parallel)

**Delegate to `hops-xr-makefile`:** Review Makefile. Are all required targets present? Is the EXAMPLES list complete? Are targets parallel where possible? Rate: Good / Needs Work / Missing.

**Delegate to `hops-xr-github-workflows`:** Review CI workflows. Are workflows complete (pr, push, tag)? Is OIDC auth configured? Are examples synced? Rate: Good / Needs Work / Missing.

**Delegate to `hops-xr-renovate`:** Review Renovate config. Are custom managers configured? Are automerge rules appropriate? Are package groups logical? Rate: Good / Needs Work / Missing.

**Delegate to `hops-xr-gitops-package`:** Review GitOps package. Does the chart render correctly? Are both deployment modes supported? Is version management correct? Rate: Good / Needs Work / Missing.

**Delegate to `hops-xr-readme`:** Review README. Does it follow journey stages? Is the quickstart working? Is the config reference complete? Rate: Good / Needs Work / Missing.

### Conditional

**Delegate to `hops-xr-got-helm-pattern`:** Only if this is a Helm-only XRD. Is the flat schema appropriate? Are inline defaults correct? Rate: Good / Needs Work / Missing.

## Compile Results

After all agents report back, compile their findings into a single report:

### Summary Score Table

| Domain | Agent | Score | Key Finding |
|--------|-------|-------|-------------|
| Template Structure | `hops-xr-got-template-structure` | Good/Needs Work/Missing | ... |
| Observed State | `hops-xr-got-observed-state` | ... | ... |
| Template Patterns | `hops-xr-got-template-patterns` | ... | ... |
| Template Simplification | `hops-xr-got-template-simplification` | ... | ... |
| Labels & Tags | `hops-xr-labels` | ... | ... |
| Status Output | `hops-xr-got-status-output` | ... | ... |
| External Names | `hops-xr-external-names` | ... | ... |
| Usages | `hops-xr-usages` | ... | ... |
| Testing | `hops-xr-testing` | ... | ... |
| Observed Resources | `hops-xr-observed-resources` | ... | ... |
| Makefile | `hops-xr-makefile` | ... | ... |
| GitHub Workflows | `hops-xr-github-workflows` | ... | ... |
| Renovate | `hops-xr-renovate` | ... | ... |
| GitOps Package | `hops-xr-gitops-package` | ... | ... |
| README | `hops-xr-readme` | ... | ... |

### Prioritized Findings

Group all agent findings into:

**Critical (must fix)** — Runtime failures, data loss, security problems.

**Important (should fix)** — Convention violations, maintainability issues, skipped best practices.

**Nice to Have (consider)** — Quality improvements that aren't blocking.

For each finding include the originating agent name so the user knows who to delegate fixes to.

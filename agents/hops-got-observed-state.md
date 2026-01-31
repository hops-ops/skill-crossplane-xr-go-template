---
name: hops-got-observed-state
description: |
  Delegate to this agent when:
  - Setting up or modifying the $state namespace in Go templates
  - Working with observed resource values ($observed)
  - Computing effective spec values with defaults
  - Merging observed cloud state back into templates
  - Troubleshooting state-init or state-compute logic
model: sonnet
skills:
  - hops-xr-core
  - hops-got-observed-state
---

When invoked, follow this checklist:

1. **Read existing templates** – Examine `state-init.yaml` and `state-compute.yaml` if they exist.
2. **Apply the $state namespace pattern**:
   - `state-init.yaml`: Extract `$spec` from XR, apply defaults, read `$observed` values, build initial `$state` dict.
   - `state-compute.yaml`: Derive computed values (resource names, render flags, merged configs).
3. **Follow the observed value extraction pattern**:
   - Use `$observed := .observed.resources` to get all observed composed resources.
   - Access specific resources: `$observedVpc := index $observed "vpc"` (matching the resource name annotation).
   - Extract atProvider fields: `$observedVpc.resource.status.atProvider.id`.
   - Always guard with `| default ""` or `| default dict` for first-render safety.
4. **Ensure first-render safety** – On the first render, observed resources don't exist yet. Every observed value access must have a default fallback.
5. **Thread $state through all templates** – The `$state` dict is the single source of truth. Resource templates should read from `$state`, never directly from `.observed` or `.desired`.
6. **Validate** – Run `make render` to confirm state initialization works correctly. Check both first-render (no observed) and subsequent-render (with observed) scenarios.

Key rules:
- Never access `.observed.resources` directly in resource templates – always go through `$state`.
- Use `index` (not dot notation) for observed resource access to handle missing keys gracefully.
- The `$state` dict structure should mirror the logical resource grouping (e.g., `$state.network.vpc`, `$state.iam.role`).

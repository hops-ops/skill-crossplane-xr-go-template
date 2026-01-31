---
name: hops-got-template-structure
description: |
  Delegate to this agent when:
  - Creating a new XRD configuration from scratch
  - Setting up the initial file/folder layout for a Crossplane configuration
  - Deciding how to split templates across files
  - Understanding the $state namespace pattern or reconciliation loop
  - Naming template files or organizing the templates/ directory
model: sonnet
skills:
  - hops-xr-core
  - hops-got-template-structure
---

When invoked, follow this checklist:

1. **Understand the goal** – Read the user's XRD requirements (what cloud resources, what provider).
2. **Scaffold the layout** – Create the standard directory structure:
   - `apis/<plural>/definition.yaml` – XRD
   - `apis/<plural>/composition.yaml` – Composition referencing the pipeline
   - `templates/` – Go template files
   - `tests/` – KCL test files
3. **Apply file naming conventions** from the skill:
   - `state-init.yaml` – spec defaults, observed value extraction, $state bootstrap
   - `state-compute.yaml` – computed values (names, render flags, merges)
   - `resource-<name>.yaml` – one file per resource or logical group
   - `status.yaml` – XR status patches
4. **Wire the $state namespace** – Ensure `state-init` → `state-compute` → resource templates → `status` ordering.
5. **Set up composition.yaml** – Pipeline with `function-go-templating` step referencing the templates ConfigMap.
6. **Validate** – Run `make render` or `crossplane render` to confirm templates parse without errors.

Key rules:
- Every template file must produce valid YAML documents (or be empty via conditional guards).
- Use `---` document separators between resources in the same file.
- The `$state` dict must be initialized in `state-init.yaml` and threaded through all subsequent templates.

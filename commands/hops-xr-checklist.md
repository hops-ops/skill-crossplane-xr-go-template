# XRD Completion Checklist Review

Systematically evaluate the current XRD project against the completion checklist. For each item, report its status.

## How to Run

1. **Read the project structure** — Glob for key files to understand what exists:
   - `apis/*/definition.yaml` — XRD definitions
   - `apis/*/composition.yaml` — Compositions
   - `apis/*/configuration.yaml` — Package metadata
   - `functions/render/*.gotmpl` or `templates/*.yaml` — Go templates
   - `tests/` — Test files
   - `.github/workflows/` — CI workflows
   - `.gitops/deploy/` — GitOps package
   - `Makefile` — Build targets
   - `renovate.json` — Dependency automation
   - `upbound.yaml` — Project manifest
   - `.gitignore` — Ignored files

2. **Evaluate each checklist section** — Read relevant files and check:

### Template Structure & State
- [ ] Template files follow naming conventions
- [ ] $state namespace pattern is used correctly
- [ ] $observed/$state pattern is implemented
- [ ] Resource templates read from $state, not directly from .observed

### Template Patterns
- [ ] Correct patterns applied (forProvider, multi-provider, Helm, K8s Object)
- [ ] Templates are simplified and readable (no unnecessary guards/variables)

### Labels & Tags
- [ ] XRD spec has `labels` and `tags` fields
- [ ] State-init computes default labels/tags
- [ ] All K8s resources have labels, all AWS resources have tags
- [ ] All AWS resources have a `Name` tag

### Status Output
- [ ] Status contains only observed values (not echoed inputs)
- [ ] Status uses typed fields
- [ ] Status serves as anti-corruption layer

### External Names
- [ ] Importable resources have `externalName` fields
- [ ] Templates conditionally add `crossplane.io/external-name`
- [ ] Import example exists

### Usages (Deletion Protection)
- [ ] Parent-child relationships have Usage resources
- [ ] Usages gated on readiness
- [ ] Deterministic naming for dynamic lists

### Testing
- [ ] Unit tests exist and pass (`make test`)
- [ ] Test mocks use correct atProvider fields
- [ ] E2E test claim matches XRD spec

### Build & CI
- [ ] Makefile has render, validate, test, build targets
- [ ] GitHub workflows exist (on-pr, on-push-main)
- [ ] OIDC auth configured for E2E
- [ ] Renovate configured

### Packaging & Docs
- [ ] `.gitops/deploy/` exists with Chart.yaml, values.yaml, templates/
- [ ] README exists with journey structure
- [ ] `.gitignore` has required entries

### Sync Checks
- [ ] EXAMPLES in Makefile match workflow files
- [ ] Dependencies in upbound.yaml match configuration.yaml
- [ ] Provider versions are in sync

3. **Run validation commands**:
   ```bash
   make render:all
   make validate:all
   make test
   ```

4. **Report results** — Present a summary table:
   - Items with status (pass/fail/missing/N/A)
   - Group by section
   - Highlight critical failures first
   - Suggest which agent to delegate to for each failing item

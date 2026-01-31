# Template Simplification Audit

Systematically audit and simplify all Go templates in the project.

## Step 1: Baseline

Capture the current rendered output for comparison:

```bash
make render:all 2>&1 | tee /tmp/hops-got-simplify-before.txt
```

Also run tests to establish baseline:

```bash
make test
```

## Step 2: Audit Templates

Read all template files and identify simplification opportunities. Delegate to the **`hops-got-template-simplification`** agent, which knows these patterns:

1. **Unused variables** — Variables defined but never referenced
2. **Required field guards** — `| default` on fields that are required in the schema
3. **Single-use intermediates** — Variables assigned once and used once (inline them)
4. **Verbose observed extraction** — Multi-step extraction that can be nil-safe chained
5. **Unnecessary conditionals** — `{{- if }}` guards on sections that always render
6. **Backwards-compatibility aliases** — Unused re-exports or renamed variables

## Step 3: Apply Changes

For each simplification:
1. Explain what's being simplified and why
2. Make the edit
3. Run `make render:all` to verify output hasn't changed
4. If output differs, revert and skip that simplification

## Step 4: Validate Equivalence

After all changes:

```bash
make render:all 2>&1 | tee /tmp/hops-got-simplify-after.txt
diff /tmp/hops-got-simplify-before.txt /tmp/hops-got-simplify-after.txt
```

The diff should be empty (no behavioral changes).

Run full validation:

```bash
make render:all
make validate:all
make test
```

## Step 5: Report

Present a summary:
- Number of simplifications applied
- Lines removed / changed
- Which files were modified
- Confirmation that rendered output is identical
- Test results (all passing)

If no simplifications were found, report that templates are already clean.

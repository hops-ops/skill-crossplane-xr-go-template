# Render, Validate & Test

Run all validation commands and report results clearly.

## Execution

Run these commands in sequence and capture output:

```bash
make render:all
make validate:all
make test
```

If any command fails, capture the error output.

## Reporting

Present results in this format:

### Render
- **Status**: PASS / FAIL
- If FAIL: show the error output, identify which template/example failed, suggest which agent to consult

### Validate
- **Status**: PASS / FAIL
- If FAIL: show schema validation errors, identify which resources have issues

### Test
- **Status**: PASS / FAIL
- If FAIL: show test failures, identify which assertions failed

### Summary
- Total: X/3 passed
- If all pass: "All validation checks passed."
- If any fail: List the failures with suggested next steps

## Optional: E2E

If the user asks for E2E validation or passes `--e2e`:

```bash
make e2e
```

Report E2E results separately since they require cluster access and cloud credentials.

## On Failure

When a check fails:
1. Read the failing file(s) to understand the issue
2. Identify the root cause (template error, schema mismatch, test assertion)
3. Suggest which specialist agent to delegate to for the fix
4. Offer to fix it directly if the issue is straightforward

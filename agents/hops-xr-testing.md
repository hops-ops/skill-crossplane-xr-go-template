---
name: hops-xr-testing
description: |
  Delegate to this agent when:
  - Writing KCL unit tests for XRD templates
  - Setting up E2E test infrastructure
  - Creating test scaffolding for new compositions
  - Working with typed vs untyped tests
  - Adding inline fixtures or observedResources to tests
  - Debugging test failures
model: sonnet
skills:
  - hops-xr-core
  - hops-xr-testing
---

When invoked, follow this checklist:

1. **Determine test type needed**:
   - **KCL unit tests**: Fast, local, test template rendering logic.
   - **E2E tests**: Full reconciliation against a real cluster, test actual cloud resource creation.
2. **For KCL unit tests**:
   - Create test file in `tests/` directory (e.g., `tests/test-basic.k`).
   - Set up the test XR input (claim spec).
   - Define expected rendered resources using KCL assertions.
   - Use `observedResources` to simulate second-render scenarios.
   - Choose typed vs untyped test style based on complexity.
3. **For E2E tests**:
   - Create test claim files in `tests/e2e/`.
   - Set up cross-package dependencies if the XRD depends on other configurations.
   - Configure the test to wait for resource readiness.
   - Add cleanup/teardown logic.
4. **Apply test scaffolding workflow**:
   - Start with a basic "renders without error" test.
   - Add assertions for critical resource fields.
   - Add observed resource mocks for status/gated features.
   - Add edge case tests (optional fields, min/max values).
5. **Use inline fixtures** – Keep test data close to assertions for readability.
6. **Run tests** – Execute `make test` for unit tests, `make e2e` for E2E tests.
7. **Debug failures** – Check rendered output with `make render` and compare against expected values.

Key rules:
- Every XRD should have at least one unit test that validates basic rendering.
- Tests should cover both first-render (no observed state) and subsequent-render (with observed state) scenarios.
- Use `observedResources` in tests to simulate cloud resources that have been created.

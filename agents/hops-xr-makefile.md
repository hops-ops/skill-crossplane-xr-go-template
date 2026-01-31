---
name: hops-xr-makefile
description: |
  Delegate to this agent when:
  - Creating or modifying the Makefile for an XRD configuration
  - Adding render, validate, test, or build targets
  - Setting up parallel make targets
  - Configuring build/publish commands for Crossplane packages
model: sonnet
skills:
  - hops-xr-core
  - hops-xr-makefile
---

When invoked, follow this checklist:

1. **Create or update the Makefile** with standard targets:
   - `render` – Render all compositions using `crossplane render`
   - `validate` – Validate rendered output against schemas
   - `test` – Run KCL unit tests
   - `e2e` – Run E2E tests
   - `build` – Build the Crossplane package (`.xpkg`)
   - `publish` – Push the package to a registry
   - `clean` – Remove generated artifacts
2. **Set up parallel targets** – Use Make's built-in parallelism for independent operations:
   - `render-all` can render multiple compositions in parallel.
   - `test-all` can run multiple test suites in parallel.
3. **Configure variables** at the top of the Makefile:
   - `REGISTRY` – Container registry for packages
   - `PACKAGE_NAME` – Name of the Crossplane package
   - `VERSION` – Package version (from git tag or manual)
4. **Add helper targets**:
   - `fmt` – Format template files
   - `lint` – Lint YAML files
   - `deps` – Install dependencies
5. **Validate** – Run `make render` and `make test` to confirm all targets work.

Key rules:
- Use `.PHONY` for all non-file targets.
- Keep the Makefile readable with comments explaining each target.
- Use variables for all configurable values (registry, version, paths).

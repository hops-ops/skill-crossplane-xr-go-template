---
name: hops-xr-observed-resources
description: |
  Delegate to this agent when:
  - Creating observed resource test mocks for KCL tests
  - Setting up observedResources data for reconciliation simulation
  - Extracting atProvider fields from real cloud resources for mock data
  - Building step-by-step mock creation from real cluster state
  - Verifying observed resource field paths
model: sonnet
skills:
  - hops-xr-core
  - hops-xr-observed-resources
---

When invoked, follow this checklist:

1. **Identify resources to mock** – Determine which composed resources need observed state for testing (typically resources whose `atProvider` values are used in state-init).
2. **Extract real resource data** (if available):
   ```bash
   kubectl get <kind> <name> -o yaml
   ```
   - Focus on `status.atProvider` fields – these are what the template reads via `$observed`.
   - Also capture `metadata.annotations` (especially `crossplane.io/external-name`).
3. **Build the mock structure** – Create an `observedResources` entry matching the resource name annotation:
   ```yaml
   observedResources:
     <resource-name>:
       resource:
         apiVersion: <api-version>
         kind: <Kind>
         metadata:
           name: <name>
           annotations:
             crossplane.io/composition-resource-name: <resource-name>
         status:
           atProvider:
             <field>: <value>
   ```
4. **Include only necessary fields** – Don't copy the entire resource; include only fields that templates actually read.
5. **Add to KCL test files** – Place the mock data in the test's `observedResources` section.
6. **Verify field paths** – Cross-reference the mock fields with what `state-init.yaml` actually reads from `$observed`.
7. **Validate** – Run `make test` to confirm mocks enable the expected test assertions.

Key rules:
- Mock resource names must exactly match the `setResourceNameAnnotation` values in templates.
- Only include `atProvider` fields that are actually read by templates.
- Mocks represent a point-in-time snapshot – they simulate a specific reconciliation state.

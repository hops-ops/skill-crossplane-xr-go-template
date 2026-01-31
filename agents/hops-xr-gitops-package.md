---
name: hops-xr-gitops-package
description: |
  Delegate to this agent when:
  - Setting up GitOps deployment packages for XRD configurations
  - Creating .gitops/deploy/ directory structure
  - Configuring Helm charts for configuration deployment
  - Setting up default vs platform deployment modes
  - Working with skipDependencyResolution
model: sonnet
skills:
  - xr-core
  - xr-gitops-package
---

When invoked, follow this checklist:

1. **Create the `.gitops/deploy/` directory structure**:
   ```
   .gitops/
   └── deploy/
       ├── Chart.yaml
       ├── values.yaml
       └── templates/
           ├── configuration.yaml
           └── _helpers.tpl
   ```
2. **Configure Chart.yaml** – Set up the Helm chart metadata for deployment:
   - Chart name matching the configuration name.
   - Version tracking the configuration version.
3. **Create the Configuration template** – `templates/configuration.yaml` deploys the Crossplane Configuration:
   ```yaml
   apiVersion: pkg.crossplane.io/v1
   kind: Configuration
   metadata:
     name: {{ .Values.configuration.name }}
   spec:
     package: {{ .Values.configuration.package }}
     skipDependencyResolution: {{ .Values.configuration.skipDependencyResolution }}
   ```
4. **Set up values.yaml** with defaults:
   - `configuration.name` – Configuration name
   - `configuration.package` – OCI package reference
   - `configuration.skipDependencyResolution` – Whether to skip dependency resolution
5. **Configure deployment modes**:
   - **Default mode**: Dependencies resolved automatically.
   - **Platform mode**: `skipDependencyResolution: true` when dependencies are managed by a platform package.
6. **Validate** – Run `helm template .gitops/deploy/` to verify the chart renders correctly.

Key rules:
- The GitOps package is a thin wrapper – it deploys the Configuration, not the resources directly.
- `skipDependencyResolution` should be configurable per environment.
- Version in Chart.yaml should be kept in sync with the Crossplane package version.

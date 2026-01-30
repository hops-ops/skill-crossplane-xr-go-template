# GitOps Deployment Package (`.gitops/`)

Each configuration must have a `.gitops/deploy/` folder containing a Helm chart for GitOps-based deployment. This enables templated promotion of configuration versions across environments.

## Structure

```
.gitops/
└── deploy/
    ├── Chart.yaml           # Helm chart metadata
    ├── values.yaml          # Default values
    └── templates/
        └── config.yaml      # Configuration (+ Function when skipDependencyResolution=true)
```

## Chart.yaml

```yaml
apiVersion: v2
name: <name>
version: 0.0.0
description: GitOps packaging for the <name> bundle
appVersion: v0.1.0
```

## values.yaml

```yaml
version: latest
# Default: let Crossplane resolve dependencies (downloads embedded functions automatically)
# Set to true for platform deployments where functions are managed separately
skipDependencyResolution: false
```

## templates/config.yaml

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: <name>
spec:
  package: ghcr.io/<your-org>/<name>:{{ .Values.version }}
  packagePullSecrets:
    - name: ghcr
  skipDependencyResolution: {{ .Values.skipDependencyResolution }}

{{- if .Values.skipDependencyResolution }}
---
# Only rendered when skipDependencyResolution=true (platform/advanced use case)
# When false, Crossplane automatically resolves and installs embedded functions
apiVersion: pkg.crossplane.io/v1
kind: Function
metadata:
  name: <your-org>-<name>render
spec:
  package: ghcr.io/<your-org>/<name>_render:{{ .Values.version }}
  packagePullSecrets:
    - name: ghcr
  skipDependencyResolution: {{ .Values.skipDependencyResolution }}
{{- end }}
```

## Two Deployment Modes

1. **Default (skipDependencyResolution: false)** - Crossplane automatically downloads and installs the embedded render function from the Configuration package. This is the simplest approach for standalone deployments and E2E tests.

2. **Platform (skipDependencyResolution: true)** - The Function is rendered separately, allowing centralized management of function versions across multiple configurations. Use this for platform deployments where you want to control function versions independently.

The `.gitops/` folder enables external GitOps tools (ArgoCD, Flux) to deploy specific versions of the configuration.

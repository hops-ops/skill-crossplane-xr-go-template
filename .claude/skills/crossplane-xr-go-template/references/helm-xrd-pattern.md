# Helm XRD Pattern

Helm XRDs are simpler than AWS XRDs. They wrap a single Helm chart with a minimal, stable interface. Keep them lightweight.

## Schema Pattern

Flat structure at spec level - no nested `helm.chartName.values`:

```yaml
apiVersion: helm.platform.example.com/v1alpha1
kind: CertManager
metadata:
  name: cert-manager
  namespace: example-env
spec:
  clusterName: my-cluster

  # Labels applied to all resources
  labels:
    team: platform

  # Provider config (defaults to clusterName, kind defaults to ProviderConfig)
  providerConfigRef:
    name: my-cluster
    kind: ProviderConfig

  # Namespace for the release (chart-specific default)
  namespace: cert-manager

  # Release name (defaults to metadata.name)
  name: my-cert-manager

  # Values merged with template defaults
  values:
    prometheus:
      enabled: false

  # OR replace all defaults entirely
  overrideAllValues:
    fullnameOverride: custom-name
```

## XRD Definition

```yaml
apiVersion: apiextensions.crossplane.io/v2
kind: CompositeResourceDefinition
metadata:
  name: certmanagers.helm.platform.example.com
spec:
  group: helm.platform.example.com
  names:
    kind: CertManager
    plural: certmanagers
  scope: Namespaced
  versions:
  - name: v1alpha1
    served: true
    referenceable: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              clusterName:
                description: Name of the target cluster. Used as default for providerConfigRef.name.
                type: string
              managementPolicies:
                type: array
                items:
                  type: string
                default: ["*"]
              labels:
                description: Labels applied to all resources.
                type: object
                additionalProperties:
                  type: string
                x-kubernetes-preserve-unknown-fields: true
              providerConfigRef:
                description: Reference to the Helm ProviderConfig.
                type: object
                properties:
                  name:
                    type: string
                  kind:
                    type: string
                    enum: [ProviderConfig, ClusterProviderConfig]
              namespace:
                description: Namespace for the Helm release.
                type: string
              name:
                description: Helm release name. Defaults to XR metadata.name.
                type: string
              values:
                description: Helm values merged with defaults.
                type: object
                x-kubernetes-preserve-unknown-fields: true
              overrideAllValues:
                description: Helm values that replace all defaults.
                type: object
                x-kubernetes-preserve-unknown-fields: true
          status:
            type: object
            properties:
              ready:
                type: boolean
              release:
                type: object
                properties:
                  name:
                    type: string
                  namespace:
                    type: string
                  ready:
                    type: boolean
        required: [spec]
```

## Template Structure

Helm XRDs need minimal template files:

```
functions/render/
├── 000-state-init.yaml.gotmpl       # Initialize $state with defaults
├── 001-state-observed-helm.yaml.gotmpl  # Extract helm release status
├── 005-state-<xrd>.yaml.gotmpl      # Core computed state (simple pass-through)
├── 010-state-status.yaml.gotmpl     # Compute status from observed
├── 200-helm-release-<chart>.yaml.gotmpl  # The helm release
└── 999-status.yaml.gotmpl           # Output status
```

## State Init (000-state-init.yaml.gotmpl)

Simple defaults, flat structure:

```yaml
{{- $xr := getCompositeResource . }}
{{- $metadata := $xr.metadata | default dict }}
{{- $spec := $xr.spec | default dict }}

{{- $name := $metadata.name | default "cert-manager" }}
{{- $clusterName := $spec.clusterName | default $name }}
{{- $managementPolicies := $spec.managementPolicies | default (list "*") }}

# Default labels
{{- $defaultLabels := dict
  "platform.example.com/managed" "true"
  (printf "platform.example.com/%s" (lower $xr.kind)) $name
}}
{{- $labels := merge $defaultLabels ($spec.labels | default dict) }}

# Provider config (defaults to clusterName with ProviderConfig)
{{- $providerConfigRef := dict
  "name" (($spec.providerConfigRef | default dict).name | default $clusterName | default "default")
  "kind" (($spec.providerConfigRef | default dict).kind | default "ProviderConfig")
}}

{{- $namespace := $spec.namespace | default "cert-manager" }}
{{- $releaseName := $spec.name | default $name }}
{{- $values := $spec.values | default dict }}
{{- $overrideAllValues := $spec.overrideAllValues | default dict }}

{{- $state := dict
  "spec" (dict
    "raw" $spec
    "effective" (dict
      "name" $name
      "clusterName" $clusterName
      "managementPolicies" $managementPolicies
      "labels" $labels
      "providerConfigRef" $providerConfigRef
      "namespace" $namespace
      "releaseName" $releaseName
      "values" $values
      "overrideAllValues" $overrideAllValues
    )
  )
  "observed" (dict)
  "certManager" (dict)
}}
```

## Core State (005-state-<xrd>.yaml.gotmpl)

Simple pass-through, no computed values logic:

```yaml
{{- $eff := $state.spec.effective }}

{{- $certManager := dict
  "name" $eff.name
  "clusterName" $eff.clusterName
  "managementPolicies" $eff.managementPolicies
  "labels" $eff.labels
  "providerConfigRef" $eff.providerConfigRef
  "namespace" $eff.namespace
  "releaseName" $eff.releaseName
  "values" $eff.values
  "overrideAllValues" $eff.overrideAllValues
}}

{{- $state = set $state "certManager" $certManager }}
```

## Helm Release Template

**Key principles:**
1. Chart name/repository/version are hardcoded literals (for Renovate detection)
2. Default values are inline YAML (not computed dicts)
3. User values append after defaults
4. `overrideAllValues` replaces everything

```yaml
{{- $cm := $state.certManager }}

---
apiVersion: helm.m.crossplane.io/v1beta1
kind: Release
metadata:
  name: {{ $cm.releaseName }}
  annotations:
    {{ setResourceNameAnnotation "helm-release-cert-manager" }}
  labels: {{ $cm.labels | toJson }}
spec:
  managementPolicies: {{ $cm.managementPolicies | toJson }}
  forProvider:
    chart:
      name: cert-manager
      repository: https://charts.jetstack.io
      version: v1.17.2
    namespace: {{ $cm.namespace }}
    {{- if $cm.overrideAllValues }}
    values:
      {{- toYaml $cm.overrideAllValues | nindent 6 }}
    {{- else }}
    values:
      fullnameOverride: cert-manager
      nameOverride: cert-manager
      crds:
        enabled: true
      global:
        leaderElection:
          namespace: {{ $cm.namespace }}
      {{- if $cm.values }}
      {{- toYaml $cm.values | nindent 6 }}
      {{- end }}
    {{- end }}
  rollbackLimit: 3
  providerConfigRef:
    name: {{ $cm.providerConfigRef.name }}
    kind: {{ $cm.providerConfigRef.kind }}
```

## Observed State (001-state-observed-helm.yaml.gotmpl)

```yaml
{{- $raw := $.observed.resources | default dict }}
{{- $entry := get $raw "helm-release-cert-manager" | default dict }}
{{- $resource := $entry.resource | default dict }}
{{- $status := $resource.status | default dict }}
{{- $atProvider := $status.atProvider | default dict }}

{{- $ready := false }}
{{- range ($status.conditions | default list) }}
  {{- if and (eq .type "Ready") (eq .status "True") }}
    {{- $ready = true }}
  {{- end }}
{{- end }}

{{- $state = set $state "observed" (merge $state.observed (dict "helmRelease" (dict
  "ready" $ready
  "state" ($atProvider.state | default "")
  "revision" ($atProvider.revision | default "")
))) }}
```

## Dependencies

Helm XRDs only need:

```yaml
# upbound.yaml
dependsOn:
- apiVersion: pkg.crossplane.io/v1
  kind: Provider
  package: xpkg.crossplane.io/crossplane-contrib/provider-helm
  version: '>=v1.0.2'
- apiVersion: pkg.crossplane.io/v1
  kind: Function
  package: xpkg.crossplane.io/crossplane-contrib/function-auto-ready
  version: '>=v0.6.0'
```

## E2E Testing

Helm XRDs use lightweight K8s-only E2E tests with injected identity - no AWS credentials needed.

### Complete E2E Test Example

```kcl
import datetime
import math
import models.com.example.platform.helm.v1alpha1 as helmv1alpha1
import models.io.upbound.dev.meta.v1alpha1 as metav1alpha1

# Generate unique name to avoid CI conflicts
_now = str(int(math.floor(datetime.ticks())))
_test_name = "e2e-certmgr-" + _now

_items = [
    metav1alpha1.E2ETest {
        metadata.name = "certmanager-helm"
        spec = {
            crossplane = {
                autoUpgrade.channel = "Rapid"
            }
            defaultConditions = ["Ready"]
            timeoutSeconds = 1800
            cleanupTimeoutSeconds = 1800
            skipDelete = False

            # RBAC and Helm ProviderConfig
            extraResources = [
                # Grant cluster-admin to all SAs in crossplane-system namespace
                # Required because Helm provider with InjectedIdentity uses its own SA
                # which doesn't have permission to create namespaces by default
                {
                    apiVersion = "rbac.authorization.k8s.io/v1"
                    kind = "ClusterRoleBinding"
                    metadata.name = "crossplane-system-cluster-admin"
                    roleRef = {
                        apiGroup = "rbac.authorization.k8s.io"
                        kind = "ClusterRole"
                        name = "cluster-admin"
                    }
                    subjects = [
                        {
                            kind = "Group"
                            name = "system:serviceaccounts:crossplane-system"
                            apiGroup = "rbac.authorization.k8s.io"
                        }
                    ]
                }
                # Helm ProviderConfig - uses in-cluster identity
                # Must use helm.m.crossplane.io to match the Release API
                {
                    apiVersion = "helm.m.crossplane.io/v1beta1"
                    kind = "ProviderConfig"
                    metadata = {
                        name = "default"
                        namespace = "default"
                    }
                    spec = {
                        credentials = {
                            source = "InjectedIdentity"
                        }
                    }
                }
            ]

            # The XR to test - use typed model from generated KCL
            manifests = [
                helmv1alpha1.CertManager {
                    metadata = {
                        name = _test_name
                        namespace = "default"
                    }
                    spec = {
                        clusterName = _test_name
                        labels = {
                            "platform.example.com/e2etest" = "true"
                            "platform.example.com/test-run" = _now
                        }
                        providerConfigRef = {
                            name = "default"
                            kind = "ProviderConfig"
                        }
                    }
                }
            ]
        }
    }
]
items = _items
```

**Key points:**
- Use `autoUpgrade.channel = "Rapid"` to get latest Crossplane (don't pin versions)
- **Must include ClusterRoleBinding** granting cluster-admin to `system:serviceaccounts:crossplane-system` group - the Helm provider's SA needs permission to create namespaces
- Use typed model from `.up/kcl/models/` (e.g., `helmv1alpha1.CertManager`) for the manifest
- ProviderConfig must use `helm.m.crossplane.io/v1beta1` to match the Release API
- Chart defaults are usually sufficient - no need to override values in tests
- 30 minute timeouts (1800s) for both test and cleanup

### GitHub Workflow

Add E2E job to `.github/workflows/on-pr.yaml`:

```yaml
e2e:
  uses: unbounded-tech/workflows-crossplane/.github/workflows/e2e.yaml@v2.13.0
```

No OIDC or AWS credentials needed for Helm-only XRDs.

## Renovate Configuration

Renovate detects chart versions from literal values in templates:

```json
{
  "customManagers": [
    {
      "customType": "regex",
      "fileMatch": ["\\.yaml\\.gotmpl$"],
      "matchStrings": [
        "\\s*chart:\\s*name:\\s+(?<depName>.*?)\\s*repository:\\s*(?<registryUrl>.*?)\\s*version:\\s*\"?(?<currentValue>.*?)\"?\\s"
      ],
      "datasourceTemplate": "helm"
    }
  ]
}
```

## What NOT to Do

- Don't create variables for chart name/repository/version
- Don't compute default values in state files with `dict` syntax
- Don't use deeply nested schema (`helm.certManager.values`)
- Don't use `gt (len $foo) 0` - just use `if $foo`

## AWS Wrapper Pattern

For charts needing AWS integration (Route53, IRSA, PodIdentity), create a separate wrapper XRD:

```
crossplane/configurations/
├── helm/
│   └── cert-manager/          # Pure Helm, no AWS
└── aws/
    └── cert-manager/          # Composes helm/cert-manager + PodIdentity
```

The wrapper references the Helm XRD and adds AWS-specific resources. This keeps the base Helm XRD simple and reusable across cloud providers.

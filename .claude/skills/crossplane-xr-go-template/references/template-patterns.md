# Template Patterns Reference

Detailed patterns for XRD Go templates.

## Provider-Specific Variables

For large XRDs, split values per provider or per chart.

**01-desired-values-aws.yaml.gotmpl** - AWS-specific variables:

```yaml
{{ $aws := $spec.aws | default (dict) }}
{{ $awsEnabled := $aws.enabled | default false }}
{{ $awsConfig := $aws.config | default (dict) }}
{{ $awsAccountId := $awsConfig.accountId }}
{{ $awsRegion := $awsConfig.region }}
{{ $awsRolePrefix := $awsConfig.rolePrefix | default "" }}
{{ $awsPermissionsBoundary := $awsConfig.permissionsBoundary }}

# Pod Identity (preferred)
{{ $awsPodIdentity := $aws.podIdentity | default (dict) }}
{{ $awsPodIdentityEnabled := $awsPodIdentity.enabled | default true }}
{{ $awsPodIdentityConfig := $awsPodIdentity.config | default (dict) }}
{{ $awsPodIdentityRolePrefix := $awsPodIdentityConfig.rolePrefix | default $awsRolePrefix }}
```

**Helm chart variables** (for embedded Helm in larger XRDs):

```yaml
{{ $values := $spec.values | default (dict) }}
{{ $overrideAllValues := $spec.overrideAllValues | default (dict) }}
```

For standalone Helm XRDs with flat schema, see `references/helm-xrd-pattern.md`.

## Multi-Provider Pattern (Full Example)

When resources need different providers (AWS + Helm + Kubernetes):

```yaml
{{ $providerConfigRefs := $spec.providerConfigRefs | default (dict) }}

{{ $awsProviderConfigRef := $providerConfigRefs.aws | default (dict) }}
{{ $awsProviderConfigName := $awsProviderConfigRef.name | default $spec.clusterName | default "default" }}
{{ $awsProviderConfigKind := $awsProviderConfigRef.kind | default "ProviderConfig" }}

{{ $helmProviderConfigRef := $providerConfigRefs.helm | default (dict) }}
{{ $helmProviderConfigName := $helmProviderConfigRef.name | default $spec.clusterName | default "default" }}
{{ $helmProviderConfigKind := $helmProviderConfigRef.kind | default "ProviderConfig" }}

{{ $k8sProviderConfigRef := $providerConfigRefs.kubernetes | default (dict) }}
{{ $k8sProviderConfigName := $k8sProviderConfigRef.name | default $spec.clusterName | default "default" }}
{{ $k8sProviderConfigKind := $k8sProviderConfigRef.kind | default "ProviderConfig" }}
```

## Observed Values Extraction

Extract observed values using nil-safe chaining:

```yaml
{{ $observed := $.observed.resources | default (dict) }}

# Extract role ARN
{{ $roleObs := (get $observed "irsa-role") | default (dict) }}
{{ $roleAtProvider := (($roleObs.resource | default (dict)).status | default (dict)).atProvider | default (dict) }}
{{ $observedRoleArn := $roleAtProvider.arn | default "Pending" }}

# Extract policy ARN
{{ $policyObs := (get $observed "irsa-policy") | default (dict) }}
{{ $policyAtProvider := (($policyObs.resource | default (dict)).status | default (dict)).atProvider | default (dict) }}
{{ $observedPolicyArn := $policyAtProvider.arn | default "Pending" }}

# Use readiness map in conditionals
{{ $roleReady := get $resourceReadiness "irsa-role" | default false }}
{{ $policyReady := get $resourceReadiness "irsa-policy" | default false }}
{{ $attachmentReady := get $resourceReadiness "irsa-role-policy-attachment" | default false }}
```

## forProvider Pass-Through Pattern

In Go templates, repeated YAML keys at the same level merge - individual keys are overwritten by later definitions. Render defaults first, then spread user overrides to selectively replace:

```yaml
---
apiVersion: iam.aws.m.upbound.io/v1beta1
kind: Role
metadata:
  name: {{ $clusterName }}
spec:
  forProvider:
    # Template defaults
    assumeRolePolicy: {{ $assumeRolePolicy | toJson }}
    tags: {{ $awsTags | toJson }}
    # User overrides - keys here overwrite defaults above
    {{- with $awsRoleForProvider }}
    {{ toYaml . | nindent 4 }}
    {{- end }}
  providerConfigRef:
    name: {{ $awsProviderConfigName }}
    kind: {{ $awsProviderConfigKind }}
```

This lets users override any `forProvider` field without the XRD needing to expose every option explicitly. A user setting `aws.role.forProvider.tags` overwrites the template default while leaving `assumeRolePolicy` intact.

## Helm Values Override/Merge Pattern

For standalone Helm XRDs, see `references/helm-xrd-pattern.md` for the complete pattern with flat schema and inline defaults.

For Helm releases embedded in larger XRDs (e.g., AWS wrappers), use this pattern:

```yaml
{{- if $cm.overrideAllValues }}
values:
  {{- toYaml $cm.overrideAllValues | nindent 6 }}
{{- else }}
values:
  fullnameOverride: cert-manager
  nameOverride: cert-manager
  crds:
    enabled: true
  {{- if $cm.values }}
  {{- toYaml $cm.values | nindent 6 }}
  {{- end }}
{{- end }}
```

Key points:
- Chart name/repository/version are hardcoded literals (for Renovate detection)
- Default values inline in YAML, not computed with `dict`
- User values append after defaults
- `overrideAllValues` replaces everything

## Kubernetes Object Pattern

Nested manifest pattern for resources created by Helm charts:

```yaml
{{ if and $letsEncryptEnabled $awsEnabled }}
---
apiVersion: kubernetes.m.crossplane.io/v1alpha1
kind: Object
metadata:
  name: {{ $clusterName }}-letsencrypt-cluster-issuer
  annotations:
    {{ setResourceNameAnnotation "letsencrypt-cluster-issuer" }}
spec:
  forProvider:
    manifest:
      apiVersion: cert-manager.io/v1
      kind: ClusterIssuer
      metadata:
        name: letsencrypt
      spec:
        acme:
          server: {{ $letsEncryptServer }}
          email: {{ $letsEncryptEmail }}
          privateKeySecretRef:
            name: letsencrypt-cluster-issuer
          solvers:
            - selector:
                dnsZones:
                - {{ $awsHostedZone }}
              dns01:
                route53: {}
  providerConfigRef:
    name: {{ $k8sProviderConfigName }}
    kind: {{ $k8sProviderConfigKind }}
{{ end }}
```

## XRD Schema Pass-Through Fields

Helm values pass-through:

```yaml
helm:
  properties:
    certManager:
      properties:
        overrideAllValues:
          type: object
          x-kubernetes-preserve-unknown-fields: true
        values:
          type: object
          x-kubernetes-preserve-unknown-fields: true
```

Managed resource forProvider pass-through:

```yaml
aws:
  properties:
    role:
      properties:
        forProvider:
          type: object
          x-kubernetes-preserve-unknown-fields: true
```

## Resource Naming Conventions

Avoid redundant type suffixes. The `kind` already tells you what the resource is:

```yaml
# Bad - redundant suffix
{{ $ipamResourceName := printf "%s-ipam" $organizationName }}
metadata:
  name: {{ $ipamResourceName }}  # "platform-ipam" when Kind is VPCIpam

# Good - clean name
metadata:
  name: {{ $organizationName }}  # "platform" - Kind tells you it's an IPAM
```

Suffixes are appropriate when disambiguating multiple resources of the same kind (e.g., `{{ $poolName }}-cidr` when you have both Pool and PoolCidr).

Example file naming - avoid redundant prefixes:

```bash
# Bad - redundant prefix
examples/irsas/example-minimal.yaml

# Good - clean name
examples/irsas/minimal.yaml
```

## PodIdentity XRD Full Example

```yaml
{{ if and $awsEnabled $awsPodIdentityEnabled }}
---
apiVersion: aws.platform.upbound.io/v2alpha1
kind: PodIdentity
metadata:
  name: {{ $clusterName }}-cert-manager-pod-identity
  annotations:
    {{ setResourceNameAnnotation "pod-identity" }}
spec:
  parameters:
    clusterName: {{ $clusterName }}
    providerConfigRef:
      name: {{ $awsProviderConfigName }}
      kind: {{ $awsProviderConfigKind }}
    region: {{ $awsRegion }}
    {{ if $awsPermissionsBoundary }}
    permissionsBoundary: {{ $awsPermissionsBoundary }}
    {{ end }}
    inlinePolicy:
      - name: default
        policy: |
          {
            "Version": "2012-10-17",
            "Statement": [
              {
                "Effect": "Allow",
                "Action": "route53:GetChange",
                "Resource": "arn:aws:route53:::change/*"
              },
              {
                "Effect": "Allow",
                "Action": ["route53:ChangeResourceRecordSets", "route53:ListResourceRecordSets"],
                "Resource": "arn:aws:route53:::hostedzone/*",
                "Condition": {
                  "ForAllValues:StringEquals": {
                    "route53:ChangeResourceRecordSetsRecordTypes": ["TXT"]
                  }
                }
              },
              {
                "Effect": "Allow",
                "Action": "route53:ListHostedZonesByName",
                "Resource": "*"
              }
            ]
          }
    serviceAccount:
      namespace: cert-manager
      name: cert-manager
{{ end }}
```

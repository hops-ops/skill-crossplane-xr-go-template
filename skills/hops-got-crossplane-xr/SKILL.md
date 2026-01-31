---
name: hops-got-crossplane-xr
description: |
  This skill provides guidance for authoring Crossplane Composite Resource (XR) configurations
  using Go templates (function-go-templating). It should be used when working on or building
  Crossplane configurations. The skill covers XRD schema design, Go templating patterns,
  provider configuration, testing with observed resources, and CI/CD workflows.
---

# Crossplane XR Go Template Skill

This is the entry point for Crossplane XRD authoring. It activates a multi-agent system with specialist knowledge across all aspects of XRD development.

## How It Works

- **`hops-xr-core`** skill provides foundational knowledge (layout, conventions, Crossplane 2.0 rules, commands)
- **`hops-xr-orchestrator`** agent coordinates work across 16 specialist agents
- **16 specialist agents** each own a specific domain (templates, testing, CI, etc.)
- **5 slash commands** provide common workflows (`/hops-xr-new`, `/hops-xr-validate`, `/hops-xr-checklist`, `/hops-got-simplify`, `/hops-xr-audit`)

## When This Skill is Active

Every time you are working in a Crossplane XR/XRD project, delegate to the **`hops-xr-orchestrator`** agent for coordination. The orchestrator knows:

- Which specialist agent to invoke for any given task
- The workflow phases for building new XRDs from scratch
- The completion checklist for verifying XRD quality

## Available Commands

| Command | Purpose |
|---------|---------|
| `/hops-xr-new` | Scaffold a new XRD from scratch |
| `/hops-xr-validate` | Run render, validate, and test |
| `/hops-xr-checklist` | Check project completeness |
| `/hops-got-simplify` | Simplify templates |
| `/hops-xr-audit` | Deep quality audit across all domains |

## Specialist Agents

| Agent | Domain |
|-------|--------|
| `hops-got-template-structure` | Template file organization, $state namespace |
| `hops-got-observed-state` | Observed resource values, state-init/compute |
| `hops-got-template-patterns` | forProvider, Helm values, multi-provider, PodIdentity |
| `hops-got-status-output` | XRD status design, anti-corruption layer |
| `hops-xr-labels` | Labels and tags across K8s and cloud resources |
| `hops-xr-external-names` | Resource import via external-name |
| `hops-xr-usages` | Deletion protection with Usage resources |
| `hops-got-template-simplification` | Reducing template complexity |
| `hops-got-helm-pattern` | Helm-only XRD pattern |
| `hops-xr-testing` | KCL unit tests, E2E tests |
| `hops-xr-observed-resources` | Test mock creation |
| `hops-xr-makefile` | Makefile targets |
| `hops-xr-github-workflows` | GitHub Actions CI/CD |
| `hops-xr-renovate` | Dependency automation |
| `hops-xr-gitops-package` | GitOps deployment packages |
| `hops-xr-readme` | README documentation |

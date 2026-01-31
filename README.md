# skill-hops-got-crossplane-xr

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) multi-agent skill system for authoring Crossplane Composite Resources (XRs) using Go templates ([function-go-templating](https://github.com/crossplane-contrib/function-go-templating)).

## What this skill does

When active, Claude Code gains deep knowledge of Crossplane XRD authoring patterns through a multi-agent system:

- **`hops-xr-orchestrator`** agent coordinates work and delegates to specialists
- **`hops-xr-core`** skill provides foundational knowledge loaded by every agent
- **16 specialist agents**, each backed by a dedicated skill
- **5 slash commands** for common workflows

### Slash Commands

| Command | What it does |
|---------|-------------|
| `/hops-xr-new` | Scaffold a new XRD from scratch, walking through all workflow phases |
| `/hops-xr-validate` | Run `make render:all`, `validate:all`, and `test` — report results |
| `/hops-xr-checklist` | Run the completion checklist against the project, report done vs missing |
| `/hops-got-simplify` | Audit templates for simplification opportunities, diff before/after |
| `/hops-xr-audit` | Deep quality audit — delegates each domain to its specialist agent |

### Specialist Agents

| Agent | Domain |
|-------|--------|
| `hops-got-template-structure` | Template file organization, $state namespace, reconciliation loop |
| `hops-got-observed-state` | Observed resource values, spec defaults, state-init/compute |
| `hops-got-template-patterns` | forProvider pass-through, Helm values, Kubernetes Object, multi-provider |
| `hops-got-status-output` | XRD status design, anti-corruption layer, observed value exposure |
| `hops-xr-labels` | Labels and tags across Kubernetes and cloud resources |
| `hops-xr-external-names` | Resource import via crossplane.io/external-name |
| `hops-xr-usages` | Deletion protection with Usage resources |
| `hops-got-template-simplification` | Reducing template duplication and complexity |
| `hops-got-helm-pattern` | Helm-only XRD pattern, flat schema, InjectedIdentity |
| `hops-xr-testing` | KCL unit tests, E2E tests, test scaffolding |
| `hops-xr-observed-resources` | Test mock creation from real cluster state |
| `hops-xr-makefile` | Makefile targets for render, validate, test, build |
| `hops-xr-github-workflows` | GitHub Actions CI/CD, OIDC auth, E2E jobs |
| `hops-xr-renovate` | Renovate config for Crossplane dependency automation |
| `hops-xr-gitops-package` | GitOps deployment packages, Helm chart wrapper |
| `hops-xr-readme` | README documentation structure, journey-based stages |

### Workflow Phases

When building a new XRD from scratch, agents are invoked in this order:

1. **Schema & Structure**: `hops-got-template-structure` → `hops-got-observed-state` → `hops-got-template-patterns`
2. **Cross-Cutting**: `hops-xr-labels` → `hops-got-status-output` → `hops-xr-external-names` → `hops-xr-usages`
3. **Refinement**: `hops-got-template-simplification`
4. **Testing**: `hops-xr-observed-resources` → `hops-xr-testing`
5. **Build & CI**: `hops-xr-makefile` → `hops-xr-github-workflows` → `hops-xr-renovate`
6. **Packaging & Docs**: `hops-xr-gitops-package` → `hops-xr-readme`

The `hops-got-helm-pattern` agent serves as an alternative entry point for Helm-only XRDs.

## Installation

### npm (recommended)

```bash
# Global — available in all projects
npm install -g @hops-ops/skill-hops-got-crossplane-xr

# Per-project — available only in this project
npm install --save-dev @hops-ops/skill-hops-got-crossplane-xr
```

### Shell script

```bash
# Clone and install globally
git clone https://github.com/hops-ops/skill-hops-got-crossplane-xr.git
cd skill-hops-got-crossplane-xr
./install.sh

# Or install to current project
./install.sh --local
```

### Manual

Copy the `skills/`, `agents/`, and `commands/` directories into `~/.claude/` (global) or your project's `.claude/` directory.

## Customization

The skill uses `platform.example.com` as an example API group domain throughout. See the **Customization** section in `hops-xr-core` skill for what to replace with your own values.

## Usage

Once installed, Claude Code will automatically delegate to the appropriate specialist agent when working on Crossplane XR/XRD projects. You can also use the slash commands directly:

```
/hops-xr-new
/hops-xr-validate
/hops-xr-checklist
/hops-got-simplify
/hops-xr-audit
```

## Structure

```
skills/                                     # 18 skill definitions
├── hops-got-crossplane-xr/
│   └── SKILL.md                            # Entry point skill
├── hops-xr-core/
│   └── SKILL.md                            # Core foundational knowledge (loaded by all agents)
├── hops-got-template-structure/
│   └── SKILL.md                            # Template file organization
├── hops-got-observed-state/
│   └── SKILL.md                            # $observed/$state namespace
├── hops-got-template-patterns/
│   └── SKILL.md                            # forProvider, multi-provider patterns
├── hops-got-status-output/
│   └── SKILL.md                            # XRD status design
├── hops-xr-labels/
│   └── SKILL.md                            # Labels and tags conventions
├── hops-xr-external-names/
│   └── SKILL.md                            # Resource import support
├── hops-xr-usages/
│   └── SKILL.md                            # Deletion protection patterns
├── hops-got-template-simplification/
│   └── SKILL.md                            # Reducing template duplication
├── hops-got-helm-pattern/
│   └── SKILL.md                            # Helm-only XRD patterns
├── hops-xr-testing/
│   └── SKILL.md                            # KCL and E2E testing
├── hops-xr-observed-resources/
│   └── SKILL.md                            # Test mock creation
├── hops-xr-makefile/
│   └── SKILL.md                            # Makefile targets
├── hops-xr-github-workflows/
│   └── SKILL.md                            # CI workflow templates
├── hops-xr-renovate/
│   └── SKILL.md                            # Dependency automation
├── hops-xr-gitops-package/
│   └── SKILL.md                            # GitOps deployment setup
└── hops-xr-readme/
    └── SKILL.md                            # README documentation structure

agents/                                     # Orchestrator + 16 specialist agents
├── hops-xr-orchestrator.md                      # Coordinates work across all agents
├── hops-got-template-structure.md
├── hops-got-observed-state.md
├── hops-got-template-patterns.md
├── hops-got-status-output.md
├── hops-xr-labels.md
├── hops-xr-external-names.md
├── hops-xr-usages.md
├── hops-got-template-simplification.md
├── hops-got-helm-pattern.md
├── hops-xr-testing.md
├── hops-xr-observed-resources.md
├── hops-xr-makefile.md
├── hops-xr-github-workflows.md
├── hops-xr-renovate.md
├── hops-xr-gitops-package.md
└── hops-xr-readme.md

commands/                                   # Slash commands
├── hops-xr-new.md                               # /hops-xr-new
├── hops-xr-validate.md                          # /hops-xr-validate
├── hops-xr-checklist.md                         # /hops-xr-checklist
├── hops-got-simplify.md                          # /hops-got-simplify
└── hops-xr-audit.md                             # /hops-xr-audit
```

## License

MIT

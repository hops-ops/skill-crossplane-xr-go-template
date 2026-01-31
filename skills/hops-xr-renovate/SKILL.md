---
name: hops-xr-renovate
description: |
  Renovate configuration for XRD dependency automation: Crossplane package managers,
  custom regex managers, automerge rules, and semantic commit conventions.
---

# Renovate Configuration for XRD Configurations

Complete `renovate.json` for all XRD configurations:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:recommended",
    ":dependencyDashboard"
  ],
  "crossplane": {
    "managerFilePatterns": [
      "/\\.yaml$/",
      "/\\.yaml\\.gotmpl$/"
    ]
  },
  "packageRules": [
    {
      "description": "Automerge minor and patch updates that pass all checks",
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true
    },
    {
      "description": "Disable automatic updates for all <your-org> Docker images",
      "matchDatasources": [
        "docker"
      ],
      "enabled": false,
      "matchPackageNames": [
        "/^<your-org>//"
      ]
    },
    {
      "description": "Group all AWS provider packages together for batched updates",
      "matchPackageNames": [
        "/provider-family-aws/",
        "/provider-aws-.*/"
      ],
      "groupName": "aws-providers"
    },
    {
      "description": "Use feat(deps): commit prefix for <your-org> Crossplane packages (github-releases datasource)",
      "matchManagers": [
        "custom.regex"
      ],
      "matchDatasources": [
        "github-releases"
      ],
      "semanticCommitType": "feat",
      "semanticCommitScope": "deps"
    },
    {
      "description": "Use fix(deps): commit prefix for other Crossplane packages from Docker registries",
      "matchManagers": [
        "custom.regex"
      ],
      "matchDatasources": [
        "docker"
      ],
      "semanticCommitType": "feat",
      "semanticCommitScope": "deps"
    }
  ],
  "customManagers": [
    {
      "customType": "regex",
      "description": "<your-org> Crossplane configurations (tracked via GitHub Releases)",
      "managerFilePatterns": [
        "apis/**/configuration.yaml",
        "upbound.yaml"
      ],
      "matchStrings": [
        "\\s*(configuration|function|package|provider):\\s*ghcr\\.io/<your-org>/(?<depName>.*?)\\s*version:\\s*(\"|')>=(?<currentValue>.*?)(\"|')\\s*"
      ],
      "datasourceTemplate": "github-releases",
      "packageNameTemplate": "<your-org>/{{depName}}"
    },
    {
      "customType": "regex",
      "description": "<your-org> packages in E2E tests (tracked via GitHub Releases)",
      "managerFilePatterns": [
        "tests/**/main.k"
      ],
      "matchStrings": [
        "package\\s*=\\s*\"ghcr\\.io/(?<depName><your-org>/[^:]+):v?(?<currentValue>[^\"]+)\""
      ],
      "datasourceTemplate": "github-releases",
      "packageNameTemplate": "{{depName}}"
    },
    {
      "customType": "regex",
      "description": "Crossplane packages from other registries (tracked via Docker tags)",
      "managerFilePatterns": [
        "apis/**/configuration.yaml",
        "upbound.yaml"
      ],
      "matchStrings": [
        "\\s*(configuration|function|package|provider):\\s*(?<registryUrl>[^/]+)\\/(?<orgName>[^/]+)\\/(?<repoName>[^/\\s]+)\\s*version:\\s*(\"|')>=(?<currentValue>.*?)(\"|')\\s*"
      ],
      "datasourceTemplate": "docker",
      "registryUrlTemplate": "https://{{registryUrl}}",
      "depNameTemplate": "{{orgName}}/{{repoName}}",
      "packageNameTemplate": "{{orgName}}/{{repoName}}"
    }
  ]
}
```

## Key Settings

- **crossplane.managerFilePatterns**: Enables Crossplane's built-in manager for `.yaml` and `.yaml.gotmpl` files
- **Automerge**: Minor and patch updates auto-merge when CI passes
- **<your-org> Docker disabled**: Internal packages use github-releases datasource instead
- **AWS provider grouping**: Batches all AWS provider updates into single PRs
- **Semantic commits**: Uses `feat(deps):` prefix for dependency updates
- **customManagers**: Two regex managers handle <your-org> packages (via GitHub Releases) and external packages (via Docker registry tags)

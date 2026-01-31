#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const SKILL_DIRS = [
  "skills/hops-xr-got-guidance",
  "skills/hops-xr-core",
  "skills/hops-xr-got-template-structure",
  "skills/hops-xr-got-observed-state",
  "skills/hops-xr-got-template-patterns",
  "skills/hops-xr-got-status-output",
  "skills/hops-xr-labels",
  "skills/hops-xr-external-names",
  "skills/hops-xr-usages",
  "skills/hops-xr-got-template-simplification",
  "skills/hops-xr-got-helm-pattern",
  "skills/hops-xr-testing",
  "skills/hops-xr-observed-resources",
  "skills/hops-xr-makefile",
  "skills/hops-xr-github-workflows",
  "skills/hops-xr-renovate",
  "skills/hops-xr-gitops-package",
  "skills/hops-xr-readme",
];

const AGENT_FILES = [
  "agents/hops-xr-orchestrator.md",
  "agents/hops-xr-got-template-structure.md",
  "agents/hops-xr-got-observed-state.md",
  "agents/hops-xr-got-template-patterns.md",
  "agents/hops-xr-got-status-output.md",
  "agents/hops-xr-labels.md",
  "agents/hops-xr-external-names.md",
  "agents/hops-xr-usages.md",
  "agents/hops-xr-got-template-simplification.md",
  "agents/hops-xr-got-helm-pattern.md",
  "agents/hops-xr-testing.md",
  "agents/hops-xr-observed-resources.md",
  "agents/hops-xr-makefile.md",
  "agents/hops-xr-github-workflows.md",
  "agents/hops-xr-renovate.md",
  "agents/hops-xr-gitops-package.md",
  "agents/hops-xr-readme.md",
];

const COMMAND_FILES = [
  "commands/hops-crossplane.md",
  "commands/hops-xr-new.md",
  "commands/hops-xr-checklist.md",
  "commands/hops-xr-validate.md",
  "commands/hops-xr-got-simplify.md",
  "commands/hops-xr-audit.md",
];

function rmSafe(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true });
      } else {
        fs.unlinkSync(filePath);
      }
      return true;
    }
  } catch {
    // Ignore removal errors
  }
  return false;
}

function uninstall() {
  const manifestPath = path.join(__dirname, ".install-manifest.json");
  let target;

  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    target = manifest.target;
  } else {
    console.log("No install manifest found. Skipping uninstall.");
    return;
  }

  let removed = 0;

  for (const dir of SKILL_DIRS) {
    if (rmSafe(path.join(target, dir))) removed++;
  }

  for (const file of AGENT_FILES) {
    if (rmSafe(path.join(target, file))) removed++;
  }

  for (const file of COMMAND_FILES) {
    if (rmSafe(path.join(target, file))) removed++;
  }

  rmSafe(manifestPath);

  console.log(`\n✓ Removed ${removed} items from ${target}\n`);
}

try {
  console.log("\nUninstalling hops-xr-got-guidance...\n");
  uninstall();
} catch (err) {
  console.error("Uninstall failed:", err.message);
}

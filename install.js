#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");

const DIRS = ["skills", "agents", "commands"];

function getTarget() {
  // If installed globally (npm -g), target ~/.claude/
  // If installed locally (npm install), target .claude/ in the project root
  const isGlobal =
    process.env.npm_config_global === "true" ||
    (process.env.npm_lifecycle_event === "postinstall" &&
      __dirname.includes(path.join("lib", "node_modules")));

  if (isGlobal) {
    return path.join(os.homedir(), ".claude");
  }

  // Walk up from node_modules to find the project root
  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    if (path.basename(dir) === "node_modules") {
      return path.join(path.dirname(dir), ".claude");
    }
    dir = path.dirname(dir);
  }

  // Fallback: current working directory
  return path.join(process.cwd(), ".claude");
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;

  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function install() {
  const source = __dirname;
  const target = getTarget();
  let installed = 0;

  for (const dir of DIRS) {
    const srcDir = path.join(source, dir);
    const destDir = path.join(target, dir);

    if (!fs.existsSync(srcDir)) continue;

    copyRecursive(srcDir, destDir);
    const count = fs.readdirSync(srcDir).length;
    installed += count;
    console.log(`  ${dir}/ → ${destDir} (${count} items)`);
  }

  console.log(
    `\n✓ Installed ${installed} items to ${target}\n`
  );

  // Write manifest for clean uninstall
  const manifest = { target, dirs: DIRS, version: require("./package.json").version };
  fs.writeFileSync(
    path.join(source, ".install-manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
}

try {
  console.log("\nInstalling hops-xr-got-guidance...\n");
  install();
} catch (err) {
  console.error("Installation failed:", err.message);
  process.exit(1);
}

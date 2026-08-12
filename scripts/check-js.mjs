// RecarregaAi! 2.5.0

import { spawnSync } from "node:child_process";
import {
  readFileSync,
  readdirSync
} from "node:fs";
import { join } from "node:path";

const collectFiles = (directoryPath, extension) => (
  readdirSync(directoryPath, {
    withFileTypes: true
  }).flatMap((entry) => {
    const entryPath = join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      return collectFiles(entryPath, extension);
    }

    return entry.isFile() && entry.name.endsWith(extension)
      ? [entryPath]
      : [];
  })
);

const filesToCheck = [
  "eslint.config.mjs",
  ...collectFiles("extension/js", ".js"),
  ...collectFiles("site/js", ".js"),
  ...collectFiles("scripts", ".mjs"),
  ...collectFiles("tests", ".mjs")
].sort();

for (const filePath of filesToCheck) {
  const result = spawnSync("node", ["--check", filePath], {
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const appsScriptCheck = spawnSync("node", ["--check", "-"], {
  input: readFileSync("backend/google-apps-script/Code.gs"),
  stdio: [
    "pipe",
    "inherit",
    "inherit"
  ]
});

if (appsScriptCheck.status !== 0) {
  process.exit(appsScriptCheck.status || 1);
}

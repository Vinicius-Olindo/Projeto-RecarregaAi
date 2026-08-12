// RecarregaAi! 2.5.0

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const extensionRoot = join(projectRoot, "extension");

const semverRegex = /^\d+\.\d+\.\d+$/u;

const parseArgs = () => {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Uso: node scripts/increment-minor-version.mjs [novo-codigo-versao]");
    console.log("Exemplo: node scripts/increment-minor-version.mjs 2.5.0");
    process.exit(0);
  }

  const newVersion = args[0];

  if (!newVersion) {
    console.error("Erro: informe o novo código de versão (ex: 2.5.0).");
    process.exit(1);
  }

  if (!semverRegex.test(newVersion)) {
    console.error("Erro: o código de versão deve usar o formato x.y.z (ex: 2.5.0).");
    process.exit(1);
  }

  return newVersion;
};

const replaceInFile = (filePath, oldVersion, newVersion) => {
  let content;

  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return false;
  }

  const updated = content.replaceAll(oldVersion, newVersion);

  if (updated === content) {
    return false;
  }

  writeFileSync(filePath, updated, "utf8");
  return true;
};

const findFilesRecursive = (directory) => {
  const results = [];

  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === "node_modules") {
        continue;
      }

      results.push(...findFilesRecursive(fullPath));
    } else {
      results.push(fullPath);
    }
  }

  return results;
};

const incrementMinorVersion = (newVersion) => {
  const manifestPath = join(extensionRoot, "manifest.json");

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const oldVersion = manifest.version;

  console.log(`Versão atual: ${oldVersion}`);
  console.log(`Nova versão:  ${newVersion}`);

  const filesWithVersion = findFilesRecursive(projectRoot);
  let updatedCount = 0;

  for (const filePath of filesWithVersion) {
    if (replaceInFile(filePath, oldVersion, newVersion)) {
      const relativePath = relative(projectRoot, filePath).replace(/\\/gu, "/");

      updatedCount += 1;
      console.log(`  atualizado: ${relativePath}`);
    }
  }

  console.log(`\nTotal: ${updatedCount} arquivos atualizados para ${newVersion}.`);
};

const newVersion = parseArgs();

incrementMinorVersion(newVersion);

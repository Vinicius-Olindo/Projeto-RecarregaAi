// RecarregaAi! 2.5.0

import {
  existsSync,
  readFileSync
} from "node:fs";
import { join } from "node:path";

const fail = (message) => {
  throw new Error(`Manifesto inválido: ${message}`);
};

const readJsonFile = (filePath) => {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`não foi possível ler ${filePath}: ${error.message}`);
  }
};

const assert = (condition, message) => {
  if (!condition) {
    fail(message);
  }
};

const assertUniqueStrings = (values, fieldName) => {
  assert(Array.isArray(values), `${fieldName} deve ser uma lista.`);
  assert(
    values.every((value) => typeof value === "string" && value.length > 0),
    `${fieldName} deve conter apenas textos não vazios.`
  );
  assert(
    new Set(values).size === values.length,
    `${fieldName} possui valores duplicados.`
  );
};

const assertExactValues = (values, expectedValues, fieldName) => {
  assertUniqueStrings(values, fieldName);

  const sortedValues = [...values].sort();
  const sortedExpectedValues = [...expectedValues].sort();

  assert(
    JSON.stringify(sortedValues) === JSON.stringify(sortedExpectedValues),
    `${fieldName} difere da lista aprovada: ${expectedValues.join(", ")}.`
  );
};

const assertLocalFile = (filePath, fieldName) => {
  assert(typeof filePath === "string" && filePath.length > 0, `${fieldName} ausente.`);
  assert(!/^[a-z]+:/iu.test(filePath), `${fieldName} deve apontar para um arquivo local.`);
  assert(
    existsSync(join(extensionRoot, filePath)),
    `${fieldName} aponta para um arquivo inexistente: ${filePath}.`
  );
};

const extensionRoot = "extension";
const manifest = readJsonFile(join(extensionRoot, "manifest.json"));
const packageJson = readJsonFile("package.json");
const expectedIconSizes = ["16", "32", "48", "128"];
const expectedPermissions = [
  "activeTab",
  "alarms",
  "browsingData",
  "scripting",
  "storage"
];
const expectedOptionalHostPermissions = [
  "http://*/*",
  "https://*/*"
];
const versionPattern = /^\d+\.\d+\.\d+$/u;

assert(manifest.manifest_version === 3, "manifest_version deve ser 3.");
assert(
  typeof manifest.name === "string" && manifest.name.length > 0 && manifest.name.length <= 45,
  "name deve ter entre 1 e 45 caracteres."
);
assert(
  typeof manifest.description === "string"
    && manifest.description.length > 0
    && manifest.description.length <= 132,
  "description deve ter entre 1 e 132 caracteres."
);
assert(versionPattern.test(manifest.version), "version deve usar o formato numérico x.y.z.");
assert(manifest.version_name === manifest.version, "version_name deve acompanhar version.");
assert(packageJson.version === manifest.version, "package.json e manifest.json estão dessincronizados.");
assert(!Object.hasOwn(manifest, "host_permissions"), "host_permissions obrigatórias não são permitidas.");

assertExactValues(manifest.permissions, expectedPermissions, "permissions");
assertExactValues(
  manifest.optional_host_permissions,
  expectedOptionalHostPermissions,
  "optional_host_permissions"
);

assertLocalFile(manifest.action?.default_popup, "action.default_popup");
assertLocalFile(manifest.background?.service_worker, "background.service_worker");
assert(manifest.background?.type === "module", "background.type deve ser module.");
assertLocalFile(manifest.options_page, "options_page");

expectedIconSizes.forEach((iconSize) => {
  assertLocalFile(manifest.icons?.[iconSize], `icons.${iconSize}`);
  assertLocalFile(manifest.action?.default_icon?.[iconSize], `action.default_icon.${iconSize}`);
});

console.log(`manifest ok (${manifest.version})`);

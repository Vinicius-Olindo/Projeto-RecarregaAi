// RecarregaAi! 2.4.0

import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const siteSource = join(root, "site");
const extensionSource = join(root, "extension");
const output = join(root, "dist", "site");
const extensionAssetsOutput = join(output, "extension-assets");
const publicPages = ["privacy.html", "uninstall.html"];
const publicStyles = [
  "privacy.css",
  "shared-floating-tools.css",
  "shared-footer.css",
  "shared-language-dialog.css",
  "uninstall.css"
];
const publicScripts = ["privacy.js", "uninstall.js"];
const publicModules = [
  "config.js",
  "extended-translations.js",
  "floating-tools.js",
  "language-dialog.js",
  "public-page-security.js",
  "shared.js",
  "theme.js"
];

const copyFile = (source, destination) => {
  mkdirSync(dirname(destination), {
    recursive: true
  });
  cpSync(source, destination);
};

const transformPublicPage = (pageName) => {
  const sourcePath = join(extensionSource, "public", pageName);
  const destinationPath = join(output, pageName);
  const content = readFileSync(sourcePath, "utf8")
    .replaceAll("../assets/", "extension-assets/assets/")
    .replaceAll("../css/", "extension-assets/css/")
    .replaceAll("../js/", "extension-assets/js/");

  writeFileSync(destinationPath, content);
};

rmSync(output, {
  force: true,
  recursive: true
});
mkdirSync(output, {
  recursive: true
});
cpSync(siteSource, output, {
  recursive: true
});

publicPages.forEach(transformPublicPage);
publicStyles.forEach((fileName) => {
  copyFile(
    join(extensionSource, "css", fileName),
    join(extensionAssetsOutput, "css", fileName)
  );
});
publicScripts.forEach((fileName) => {
  copyFile(
    join(extensionSource, "js", fileName),
    join(extensionAssetsOutput, "js", fileName)
  );
});
publicModules.forEach((fileName) => {
  copyFile(
    join(extensionSource, "js", "modules", fileName),
    join(extensionAssetsOutput, "js", "modules", fileName)
  );
});
cpSync(
  join(extensionSource, "assets", "icons"),
  join(extensionAssetsOutput, "assets", "icons"),
  {
    recursive: true
  }
);
writeFileSync(join(output, ".nojekyll"), "");

console.log(`Site criado em ${output}`);

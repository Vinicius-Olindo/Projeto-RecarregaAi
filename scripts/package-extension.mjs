// RecarregaAi! 2.3.9

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";

const root = fileURLToPath(new URL("..", import.meta.url));
const extensionRoot = join(root, "extension");
const distPath = join(root, "dist");
const zipPath = join(distPath, "recarregaai.zip");
const includePaths = [
  "assets",
  "css",
  "js",
  "manifest.json",
  "onboarding.html",
  "options.html",
  "popup.html",
  "translations"
];
const publicOnlyFiles = new Set([
  "css/privacy.css",
  "css/uninstall.css",
  "js/modules/public-page-security.js",
  "js/privacy.js",
  "js/uninstall.js"
]);

const validateFeedbackBackend = () => {
  const configSource = readFileSync(
    join(extensionRoot, "js", "modules", "config.js"),
    "utf8"
  );
  const configuredUrl = configSource.match(
    /feedbackBackendUrl:\s*"([^"]*)"/
  )?.[1];

  if (!configuredUrl) {
    throw new Error(
      "Configure feedbackBackendUrl antes de gerar o pacote de publicacao."
    );
  }

  const backendUrl = new URL(configuredUrl);
  const isValidAppsScriptUrl = backendUrl.protocol === "https:"
    && backendUrl.hostname === "script.google.com"
    && backendUrl.pathname.startsWith("/macros/s/")
    && backendUrl.pathname.endsWith("/exec");

  if (!isValidAppsScriptUrl) {
    throw new Error("feedbackBackendUrl nao e uma URL valida do Apps Script.");
  }
};

const crcTable = Array.from({ length: 256 }, (_, tableIndex) => {
  let value = tableIndex;

  for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

const getCrc32 = (buffer) => {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
};

const getDosDateTime = (date) => {
  const dosTime = (date.getHours() << 11)
    | (date.getMinutes() << 5)
    | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9)
    | ((date.getMonth() + 1) << 5)
    | date.getDate();

  return {
    dosDate,
    dosTime
  };
};

const shouldIgnoreFile = (pathValue) => {
  const normalizedPath = pathValue.replaceAll("\\", "/");

  return normalizedPath.endsWith(".gitkeep")
    || publicOnlyFiles.has(normalizedPath);
};

const collectFiles = (pathValue) => {
  if (shouldIgnoreFile(pathValue)) {
    return [];
  }

  const absolutePath = join(extensionRoot, pathValue);
  const stats = statSync(absolutePath);

  if (stats.isFile()) {
    return [absolutePath];
  }

  return readdirSync(absolutePath)
    .flatMap((item) => collectFiles(join(pathValue, item)));
};

const writeUInt16 = (buffer, value, offset) => {
  buffer.writeUInt16LE(value & 0xffff, offset);
};

const writeUInt32 = (buffer, value, offset) => {
  buffer.writeUInt32LE(value >>> 0, offset);
};

const createLocalHeader = ({
  compressedSize,
  crc,
  dosDate,
  dosTime,
  fileName,
  method,
  uncompressedSize
}) => {
  const fileNameBuffer = Buffer.from(fileName);
  const header = Buffer.alloc(30);

  writeUInt32(header, 0x04034b50, 0);
  writeUInt16(header, 20, 4);
  writeUInt16(header, 0, 6);
  writeUInt16(header, method, 8);
  writeUInt16(header, dosTime, 10);
  writeUInt16(header, dosDate, 12);
  writeUInt32(header, crc, 14);
  writeUInt32(header, compressedSize, 18);
  writeUInt32(header, uncompressedSize, 22);
  writeUInt16(header, fileNameBuffer.length, 26);
  writeUInt16(header, 0, 28);

  return Buffer.concat([header, fileNameBuffer]);
};

const createCentralHeader = ({
  compressedSize,
  crc,
  dosDate,
  dosTime,
  fileName,
  localHeaderOffset,
  method,
  uncompressedSize
}) => {
  const fileNameBuffer = Buffer.from(fileName);
  const header = Buffer.alloc(46);

  writeUInt32(header, 0x02014b50, 0);
  writeUInt16(header, 20, 4);
  writeUInt16(header, 20, 6);
  writeUInt16(header, 0, 8);
  writeUInt16(header, method, 10);
  writeUInt16(header, dosTime, 12);
  writeUInt16(header, dosDate, 14);
  writeUInt32(header, crc, 16);
  writeUInt32(header, compressedSize, 20);
  writeUInt32(header, uncompressedSize, 24);
  writeUInt16(header, fileNameBuffer.length, 28);
  writeUInt16(header, 0, 30);
  writeUInt16(header, 0, 32);
  writeUInt16(header, 0, 34);
  writeUInt16(header, 0, 36);
  writeUInt32(header, 0, 38);
  writeUInt32(header, localHeaderOffset, 42);

  return Buffer.concat([header, fileNameBuffer]);
};

const createEndRecord = ({
  centralDirectoryOffset,
  centralDirectorySize,
  fileCount
}) => {
  const record = Buffer.alloc(22);

  writeUInt32(record, 0x06054b50, 0);
  writeUInt16(record, 0, 4);
  writeUInt16(record, 0, 6);
  writeUInt16(record, fileCount, 8);
  writeUInt16(record, fileCount, 10);
  writeUInt32(record, centralDirectorySize, 12);
  writeUInt32(record, centralDirectoryOffset, 16);
  writeUInt16(record, 0, 20);

  return record;
};

if (existsSync(zipPath)) {
  rmSync(zipPath);
}

validateFeedbackBackend();

const files = includePaths
  .flatMap(collectFiles)
  .sort((firstPath, secondPath) => firstPath.localeCompare(secondPath));

const localParts = [];
const centralParts = [];
let currentOffset = 0;

files.forEach((absolutePath) => {
  const fileBuffer = readFileSync(absolutePath);
  const compressedBuffer = deflateRawSync(fileBuffer);
  const relativePath = relative(extensionRoot, absolutePath).replaceAll("\\", "/");
  const stats = statSync(absolutePath);
  const crc = getCrc32(fileBuffer);
  const method = 8;
  const { dosDate, dosTime } = getDosDateTime(stats.mtime);
  const localHeader = createLocalHeader({
    compressedSize: compressedBuffer.length,
    crc,
    dosDate,
    dosTime,
    fileName: relativePath,
    method,
    uncompressedSize: fileBuffer.length
  });
  const centralHeader = createCentralHeader({
    compressedSize: compressedBuffer.length,
    crc,
    dosDate,
    dosTime,
    fileName: relativePath,
    localHeaderOffset: currentOffset,
    method,
    uncompressedSize: fileBuffer.length
  });

  localParts.push(localHeader, compressedBuffer);
  centralParts.push(centralHeader);
  currentOffset += localHeader.length + compressedBuffer.length;
});

const centralDirectory = Buffer.concat(centralParts);
const endRecord = createEndRecord({
  centralDirectoryOffset: currentOffset,
  centralDirectorySize: centralDirectory.length,
  fileCount: files.length
});

mkdirSync(dirname(zipPath), {
  recursive: true
});

writeFileSync(zipPath, Buffer.concat([
  ...localParts,
  centralDirectory,
  endRecord
]));

console.log(`Pacote criado em ${zipPath}`);

// RecarregaAi! 2.5.0

const browserGlobals = {
  chrome: "readonly",
  clearInterval: "readonly",
  console: "readonly",
  document: "readonly",
  Element: "readonly",
  event: "readonly",
  fetch: "readonly",
  FormData: "readonly",
  HTMLElement: "readonly",
  navigator: "readonly",
  MutationObserver: "readonly",
  performance: "readonly",
  localStorage: "readonly",
  setInterval: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  window: "readonly"
};

const nodeGlobals = {
  Buffer: "readonly",
  process: "readonly"
};

export default [
  {
    ignores: [
      ".codex-preview/**",
      "dist/**",
      "node_modules/**"
    ]
  },
  {
    files: [
      "extension/js/**/*.js",
      "site/js/**/*.js"
    ],
    languageOptions: {
      ecmaVersion: "latest",
      globals: browserGlobals,
      sourceType: "module"
    },
    rules: {
      complexity: ["warn", 18],
      eqeqeq: ["error", "always"],
      "no-dupe-keys": "error",
      "no-redeclare": "error",
      "no-unreachable": "error",
      "no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
      "no-var": "error",
      "prefer-const": "error"
    }
  },
  {
    files: [
      "*.config.mjs",
      "scripts/**/*.mjs",
      "tests/**/*.mjs"
    ],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...browserGlobals,
        ...nodeGlobals
      },
      sourceType: "module"
    },
    rules: {
      complexity: ["warn", 18],
      eqeqeq: ["error", "always"],
      "no-dupe-keys": "error",
      "no-redeclare": "error",
      "no-unreachable": "error",
      "no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
      "no-var": "error",
      "prefer-const": "error"
    }
  }
];

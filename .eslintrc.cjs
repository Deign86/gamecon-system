/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: "detect" } },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
  ],
  rules: {
    // Downgrade to warnings during migration — tighten later
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "react/prop-types": "off",
    "react/no-unescaped-entities": "off",
    "no-console": ["warn", { allow: ["warn", "error", "info"] }],
  },
  ignorePatterns: ["dist/", "android/", "src-tauri/", "functions/", "scripts/"],
  overrides: [
    {
      files: ["src/__tests__/**/*.{js,jsx}"],
      env: { node: true },
      globals: {
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
      rules: {
        "no-console": "off",
      },
    },
  ],
};

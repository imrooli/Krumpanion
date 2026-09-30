import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist", "coverage", "playwright-report", "test-results"] },
  js.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        performance: "readonly",
        structuredClone: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly",
        console: "readonly",
        process: "readonly",
      },
    },
  },
  {
    files: ["tools/**/*.ts", "e2e/**/*.ts", "playwright*.config.ts"],
    languageOptions: {
      parser: tsParser,
      globals: {
        performance: "readonly",
        structuredClone: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly",
        console: "readonly",
        process: "readonly",
        URL: "readonly",
        Buffer: "readonly",
        indexedDB: "readonly",
        requestAnimationFrame: "readonly",
        clearInterval: "readonly",
      },
      parserOptions: {
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      globals: {
        performance: "readonly",
        structuredClone: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly",
        console: "readonly",
        document: "readonly",
        crypto: "readonly",
        process: "readonly",
        window: "readonly",
        navigator: "readonly",
        clearInterval: "readonly",
      },
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
];

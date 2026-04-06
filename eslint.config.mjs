import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const uiDoctrinePlugin = require(path.join(__dirname, "eslint-rules", "index.js"));
const uiDoctrine = { rules: uiDoctrinePlugin.rules };

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Global: ignore unused vars/args that start with _
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          // Intentionally unused catch bindings are common; name with _err if you need the binding.
          caughtErrors: "none",
        },
      ],
    },
  },
  // API route handlers often catch without using the error; avoid noise without renaming every catch.
  {
    files: ["src/app/api/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
    },
  },
  {
    files: ["src/app/dashboard/**/*.tsx", "src/components/**/*.tsx", "src/lib/intelligence/**/*.ts"],
    plugins: { "ui-doctrine": uiDoctrine },
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      // Product UI legitimately uses live feeds, CRM components, etc.; keep lint focused on correctness.
      "ui-doctrine/no-dashboard-patterns": "off",
      "ui-doctrine/no-live-ui": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    ".next-old/**",
    "out/**",
    "build/**",
    ".claude/**",
    "next-env.d.ts",
  ]),
  // Stylistic / React Compiler rules: off so lint reflects fixable correctness issues only.
  {
    files: ["src/**/*.{ts,tsx}", "e2e/**/*.{ts,tsx}"],
    rules: {
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  // Unused imports (auto-fix) + TS unused vars for src/e2e (overrides global block for these paths).
  {
    files: ["src/**/*.{ts,tsx}", "e2e/**/*.{ts,tsx}"],
    plugins: { "unused-imports": unusedImports },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": "off",
    },
  },
]);

export default eslintConfig;

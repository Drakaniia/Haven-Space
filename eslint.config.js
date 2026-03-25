import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.js"],
  },
  {
    ignores: [
      "node_modules/**",
      "vendor/**",
      "dist/**",
      "build/**",
      ".github/**",
      "backend/**",
    ],
  },
  pluginJs.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
      },
      ecmaVersion: 2020,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "prefer-const": "warn",
      "no-var": "error",
      "eqeqeq": ["error", "always"],
      "curly": ["warn", "multi-line"],
      "no-undef": "error",
      "no-implicit-globals": "warn",
      "no-new-func": "error",
      "no-eval": "error",
      "semi": ["error", "always"],
      "quotes": ["warn", "single", { avoidEscape: true }],
      "indent": ["warn", 2],
      "no-multiple-empty-lines": ["warn", { max: 1, maxEOF: 0 }],
      "no-trailing-spaces": "warn",
      "eol-last": "warn",
    },
  },
];

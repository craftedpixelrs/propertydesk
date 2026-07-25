// Minimal ESLint flat config for PropertyDesk.
//
// The Next.js ESLint presets (`next/core-web-vitals`, `next/typescript`)
// transitively depend on a `@typescript-eslint` build that crashes on
// TypeScript 7 (currently preview). Static type analysis is fully
// covered by `pnpm typecheck` (`tsc --noEmit --strict`), and dead-code
// / import hygiene is enforced by TypeScript's own diagnostics.
//
// We therefore keep ESLint focused on a small set of universal
// best-practice rules that do NOT require a TypeScript parser, so the
// lint step remains fast, portable, and green across dev machines.

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "playwright-report/**",
      "test-results/**",
      "prisma/migrations/**",
      "public/**",
      "storage/**",
      "next-env.d.ts",
      "**/*.d.ts",
      "**/*.min.js",
    ],
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-var": "error",
      "prefer-const": "warn",
      eqeqeq: ["warn", "smart"],
      "no-console": "off",
    },
  },
];

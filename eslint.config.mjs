import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    "out/**",
    "build/**",
    "scratch/**",
    "optimize-phase*.js",
    "next-env.d.ts",
    "cloudflare-env.d.ts",
    "cloudflare-worker.js",
  ]),
  {
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
]);

export default eslintConfig;

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".next-booking/**",
    ".next-business-os/**",
    ".next-business-build/**",
    "artifacts/**",
    "next-env.d.ts",
    "test-results/**",
    "playwright-report/**",
  ]),
]);

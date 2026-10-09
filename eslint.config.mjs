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
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // This file builds a manual external store (mutable closure state read
    // via getState/subscribe) and mutates a DOM <input>.files imperatively -
    // both are established patterns the react-compiler "immutability" rule
    // can't distinguish from a real render-purity violation.
    files: ["components/ui/file-upload.tsx"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
  {
    // The preview harness stands in for Next and Clerk: its stubs swallow
    // props they do not use and render plain <img>s on purpose.
    files: ["tests/ui-preview/**"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@next/next/no-img-element": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
]);

export default eslintConfig;

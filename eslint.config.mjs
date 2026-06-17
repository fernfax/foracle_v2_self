import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import prettierConfig from "eslint-config-prettier"
import unusedImports from "eslint-plugin-unused-imports"
import { defineConfig, globalIgnores } from "eslint/config"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  {
    plugins: {
      "unused-imports": unusedImports
    },
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "react/jsx-key": "off",
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error"
    }
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"])
])

export default eslintConfig

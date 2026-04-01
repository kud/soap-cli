import { defineConfig } from "tsup"
import pkg from "./package.json"

export default defineConfig({
  entry: ["index.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  splitting: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
  define: {
    __SOAP_VERSION__: JSON.stringify(pkg.version),
  },
})

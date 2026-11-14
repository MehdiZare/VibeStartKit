import { defineConfig } from "tsdown";
export default defineConfig({
  entry: { index: "packages/cli/src/index.ts" },
  outDir: "packages/cli/dist",
  format: "esm",
  target: "node24",
  platform: "node",
  clean: true,
  dts: false,
  deps: { alwaysBundle: [/^@vibestartkit\//] },
});

// Bundle src/index.js + noble deps into a single ESM file Javy can
// compile to WASM. Javy targets QuickJS: no Node built-ins, no dynamic
// import, no top-level await.
import { build } from "esbuild";
import { mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["src/index.js"],
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  minify: false,
  outfile: "dist/bundle.js",
  legalComments: "none",
  // Javy has no Node built-ins; fail loudly if we accidentally import one.
  external: [],
});

console.log("wrote dist/bundle.js");

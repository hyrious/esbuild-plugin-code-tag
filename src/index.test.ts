import { build } from "esbuild";
import { codeTag } from "./index";

const r = await build({
  entryPoints: ["./test/entry.ts"],
  bundle: true,
  format: "esm",
  plugins: [
    codeTag({
      dedent: ["html"],
    }),
  ],
  write: false,
  outdir: "./test",
}).catch(() => process.exit(1));

console.log(r.outputFiles[0].text);

import { build } from "vite";
import { gzipSync } from "node:zlib";
import { writeFile } from "node:fs/promises";

// Compare the same source/data with static versus deferred Database navigation.
// Neither comparison writes build output or changes application source.
async function analyze(staticDatabase: boolean) {
  const chunks: Array<{ file: string; entry: boolean; bytes: number; gzipBytes: number; modules: Array<{ path: string; renderedBytes: number }> }> = [];
  await build({ build: { write: false }, plugins: [{
    name: "phase3-bundle-audit", enforce: "pre",
    transform(code, id) {
      if (!staticDatabase || !id.replaceAll("\\", "/").endsWith("/src/app/navigationRegistry.tsx")) return;
      return code.replace('const DatabaseTab = lazy(() => import("../features/database/DatabaseTab").then(module => ({ default: module.DatabaseTab })));', 'import { DatabaseTab } from "../features/database/DatabaseTab";');
    },
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) if (item.type === "chunk") chunks.push({ file: item.fileName, entry: item.isEntry, bytes: Buffer.byteLength(item.code), gzipBytes: gzipSync(item.code).length, modules: Object.entries(item.modules).map(([path, module]) => ({ path: path.replaceAll("\\", "/").replace(`${process.cwd().replaceAll("\\", "/")}/`, ""), renderedBytes: module.renderedLength })).sort((a, b) => b.renderedBytes - a.renderedBytes) });
    },
  }] });
  return chunks;
}
const report = { note: "Same repaired canonical data in both builds. Module rendered bytes precede chunk minification; chunk/gzip bytes are emitted JS. Workers are emitted separately by Vite.", before: await analyze(true), after: await analyze(false) };
await writeFile("codex/reports/phase3_bundle_analysis.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ before: report.before.map(chunk => ({ file: chunk.file, entry: chunk.entry, bytes: chunk.bytes, gzipBytes: chunk.gzipBytes })), after: report.after.map(chunk => ({ file: chunk.file, entry: chunk.entry, bytes: chunk.bytes, gzipBytes: chunk.gzipBytes })) }, null, 2));

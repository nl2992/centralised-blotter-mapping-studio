#!/usr/bin/env node
/*
 * Build the shippable single-file deliverable.
 *
 * Reads the maintained source (centralised_blotter_mapping_studio.html, which
 * links the 3 libraries from CDN for fast local iteration) and produces
 * dist/centralised_blotter_mapping_studio.html with those libraries INLINED,
 * so the deliverable is a genuinely self-contained single HTML file that needs
 * no internet for xlsx / highcharts / papaparse. Firm endpoints remain optional
 * (local fallback), exactly as in the source.
 *
 * Rebuild after any change to the source HTML:  node tools/build_standalone.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "centralised_blotter_mapping_studio.html");
const OUT_DIR = join(ROOT, "dist");
const OUT = join(OUT_DIR, "centralised_blotter_mapping_studio.html");

// Each CDN <script src> tag -> the local vendored file that replaces it.
const REPLACEMENTS = [
  { tag: '<script src="https://unpkg.com/xlsx@latest/dist/xlsx.full.min.js"></script>', file: "vendor/xlsx.full.min.js", label: "xlsx (SheetJS) 0.18.5" },
  { tag: '<script src="https://unpkg.com/highcharts@latest/highcharts.js"></script>', file: "vendor/highcharts.js", label: "highcharts 11.4.8" },
  { tag: '<script src="https://cdn.jsdelivr.net/npm/papaparse@latest/papaparse.min.js"></script>', file: "vendor/papaparse.min.js", label: "papaparse 5.4.1" },
];

let html = readFileSync(SRC, "utf8");

for (const { tag, file, label } of REPLACEMENTS) {
  if (!html.includes(tag)) {
    console.error(`ERROR: expected CDN tag not found in source (has it changed?):\n  ${tag}`);
    process.exit(1);
  }
  let lib = readFileSync(join(ROOT, "tools", file), "utf8");
  // Safety: a library must never contain a literal </script> that would end the block early.
  if (/<\/script/i.test(lib)) lib = lib.replace(/<\/script/gi, "<\\/script");
  const inlined = `<script>/* inlined: ${label} */\n${lib}\n</script>`;
  // split/join, NOT String.replace: the minified libs contain `$` sequences that
  // String.replace would interpret as special replacement patterns and corrupt the output.
  html = html.split(tag).join(inlined);
}

// Sanity: no CDN library <script src> should remain.
const leftover = html.match(/<script src="https?:\/\/[^"]+"><\/script>/g);
if (leftover) {
  console.error("ERROR: un-inlined CDN scripts remain:\n" + leftover.join("\n"));
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, html, "utf8");
const mb = (Buffer.byteLength(html) / 1048576).toFixed(2);
console.log(`Built ${OUT}`);
console.log(`Self-contained single file: ${mb} MB (3 libraries inlined; firm endpoints remain optional).`);

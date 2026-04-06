/**
 * One-shot: prefix @typescript-eslint/no-unused-vars identifiers with _ using ESLint JSON positions.
 * Run: node scripts/prefix-unused-from-eslint.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const json = JSON.parse(
  execSync("npx eslint src e2e -f json --max-warnings 9999", {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 100,
  }),
);

const edits = [];
for (const f of json) {
  for (const m of f.messages ?? []) {
    if (m.ruleId !== "@typescript-eslint/no-unused-vars" || m.severity !== 1) continue;
    const match = /^'([^']+)'/.exec(m.message ?? "");
    if (!match) continue;
    const name = match[1];
    if (name.startsWith("_")) continue;
    if (typeof m.line !== "number" || typeof m.column !== "number" || typeof m.endColumn !== "number") continue;
    edits.push({
      path: f.filePath,
      line: m.line,
      column: m.column,
      endColumn: m.endColumn,
      name,
    });
  }
}

const byPath = new Map();
for (const e of edits) {
  if (!byPath.has(e.path)) byPath.set(e.path, []);
  byPath.get(e.path).push(e);
}

let patched = 0;
for (const [filePath, list] of byPath) {
  list.sort((a, b) => b.line - a.line || b.column - a.column);
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  for (const e of list) {
    const i = e.line - 1;
    const line = lines[i];
    if (line == null) continue;
    const start = e.column - 1;
    const end = e.endColumn - 1;
    const slice = line.slice(start, end);
    if (slice !== e.name) {
      console.warn("skip mismatch", filePath, e.line, JSON.stringify(slice), JSON.stringify(e.name));
      continue;
    }
    lines[i] = line.slice(0, start) + "_" + e.name + line.slice(end);
    patched++;
  }
  fs.writeFileSync(filePath, lines.join("\n"));
}

console.log("Prefixed", patched, "of", edits.length, "unused bindings");

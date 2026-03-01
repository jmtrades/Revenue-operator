#!/usr/bin/env npx tsx
/**
 * Safe pruning: list (dry-run) or remove unreachable src files.
 * Default: dry-run only. Never deletes migrations or key docs.
 * After apply: run npm test, npm run prebuild, npm run build to verify.
 */

import { readdirSync, readFileSync, existsSync, unlinkSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PROTECTED_PATTERNS = [
  "supabase/migrations/",
  "docs/SYSTEM_SPEC.md",
  "docs/FINAL_LOCK_CHECKLIST.md",
  "docs/LAUNCH_QUALITY_REPORT.md",
  "WHAT_CHANGED.md",
];

function isProtected(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  return PROTECTED_PATTERNS.some((p) => normalized.startsWith(p) || normalized === p);
}

function collectFiles(dir: string, ext: string[], base = ""): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      out.push(...collectFiles(path.join(dir, e.name), ext, rel));
    } else if (ext.some((x) => e.name.endsWith(x))) {
      out.push(rel);
    }
  }
  return out;
}

function extractImports(content: string, fileDir: string): string[] {
  const refs: string[] = [];
  const fromAlias = /from\s+["']@\/([^"']+)["']/g;
  let m;
  while ((m = fromAlias.exec(content)) !== null) {
    const sub = m[1].replace(/\.(tsx?|jsx?)$/, "");
    refs.push(`src/${sub}.ts`);
    refs.push(`src/${sub}.tsx`);
  }
  const fromRel = /from\s+["'](\.\.?\/[^"']+)["']/g;
  while ((m = fromRel.exec(content)) !== null) {
    const resolved = path.normalize(path.join(fileDir, m[1]));
    const rel = path.relative(ROOT, resolved).replace(/\\/g, "/");
    refs.push(rel.replace(/\.(tsx?|jsx?)$/, ".ts"));
    refs.push(rel.replace(/\.(tsx?|jsx?)$/, ".tsx"));
  }
  return refs;
}

function main(): void {
  const apply = process.argv.includes("--apply");
  const dryRun = !apply;

  const srcDir = path.join(ROOT, "src");
  const allSrc = collectFiles(srcDir, [".ts", ".tsx"])
    .map((r) => `src/${r}`)
    .filter((r) => r.endsWith(".ts") || r.endsWith(".tsx"));

  const entries: string[] = [];
  const appDir = path.join(ROOT, "src", "app");
  if (existsSync(appDir)) {
    const walk = (d: string, base: string): void => {
      const list = readdirSync(d, { withFileTypes: true });
      for (const e of list) {
        const rel = base ? `${base}/${e.name}` : e.name;
        if (e.isDirectory()) {
          walk(path.join(d, e.name), rel);
        } else if (e.name === "page.tsx" || e.name === "route.ts" || e.name === "layout.tsx" || e.name === "loading.tsx" || e.name === "error.tsx" || e.name === "not-found.tsx") {
          entries.push(`src/app/${rel}`);
        }
      }
    };
    walk(appDir, "");
  }
  if (existsSync(path.join(ROOT, "src", "proxy.ts"))) entries.push("src/proxy.ts");
  if (existsSync(path.join(ROOT, "src", "instrumentation.ts"))) entries.push("src/instrumentation.ts");
  const testsDir = path.join(ROOT, "__tests__");
  if (existsSync(testsDir)) {
    const testFiles = collectFiles(testsDir, [".ts", ".tsx"]).map((r) => path.join("__tests__", r).replace(/\\/g, "/"));
    entries.push(...testFiles);
  }

  const reachable = new Set<string>();
  function resolveFile(file: string): string | null {
    let full = path.join(ROOT, file);
    if (existsSync(full)) return file;
    const alt = file.endsWith(".ts") ? file.replace(/\.ts$/, ".tsx") : file.replace(/\.tsx$/, ".ts");
    if (existsSync(path.join(ROOT, alt))) return alt;
    const dir = path.dirname(file);
    const base = path.basename(file, path.extname(file));
    const indexInDir = path.join(dir, base, "index.ts");
    if (existsSync(path.join(ROOT, indexInDir))) return indexInDir;
    const indexInDirTsx = path.join(dir, base, "index.tsx");
    if (existsSync(path.join(ROOT, indexInDirTsx))) return indexInDirTsx;
    return null;
  }
  function addReachable(file: string): void {
    const resolved = resolveFile(file);
    if (!resolved) return;
    file = resolved;
    const full = path.join(ROOT, file);
    if (reachable.has(file)) return;
    reachable.add(file);
    const content = readFileSync(full, "utf-8");
    const fileDir = path.dirname(full);
    const refs = extractImports(content, fileDir);
    for (const ref of refs) {
      const cand = ref.startsWith("src/") ? ref : path.join(path.dirname(file), ref).replace(/\\/g, "/");
      let norm = path.normalize(cand).replace(/\\/g, "/");
      if (!norm.startsWith("src/")) norm = "src/" + norm;
      if (norm.endsWith(".ts") || norm.endsWith(".tsx")) {
        addReachable(norm);
      }
    }
  }
  for (const e of entries) {
    addReachable(e);
  }

  const candidates = allSrc.filter((f) => !reachable.has(f));
  const allowed = candidates.filter((c) => !isProtected(c));

  if (dryRun) {
    console.log("Dry-run: candidates for removal (not deleted). Use --apply to delete.");
    console.log("After apply run: npm test, npm run prebuild, npm run build");
    for (const c of allowed) console.log(c);
    if (allowed.length === 0) console.log("(none)");
    return;
  }

  for (const c of allowed) {
    const full = path.join(ROOT, c);
    if (existsSync(full)) {
      unlinkSync(full);
      console.log("Removed:", c);
    }
  }
  console.log("After apply run: npm test, npm run prebuild, npm run build");
}

main();

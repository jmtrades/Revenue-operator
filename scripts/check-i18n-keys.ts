#!/usr/bin/env npx tsx
/**
 * CI check: scan all TSX/TS files for useTranslations() calls and verify
 * that every referenced key exists in en.json. Run before deploy to catch
 * broken localization keys like "goalStep.heading" showing raw in the UI.
 *
 * Usage: npx tsx scripts/check-i18n-keys.ts
 * Exit code 0 = all keys found, 1 = missing keys detected
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = join(__dirname, "..");
const EN_PATH = join(ROOT, "src/i18n/messages/en.json");

// Load English translations as the canonical source
const en = JSON.parse(readFileSync(EN_PATH, "utf8"));

function resolve(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function walkDir(dir: string, ext: string[]): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkDir(full, ext));
    } else if (ext.some((e) => full.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

// Find all useTranslations calls and their key references
const files = walkDir(join(ROOT, "src"), [".tsx", ".ts"]);
const nsRegex = /useTranslations\(["']([^"']+)["']\)/g;
const keyRegex = /\bt\(["']([^"']+)["']/g;

let missing = 0;
const issues: string[] = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const namespaces: string[] = [];

  // Extract all namespace declarations
  let m: RegExpExecArray | null;
  const nsCopy = new RegExp(nsRegex.source, nsRegex.flags);
  while ((m = nsCopy.exec(content)) !== null) {
    namespaces.push(m[1]);
  }

  if (namespaces.length === 0) continue;

  // For each namespace, find t("key") calls
  // This is approximate — we check if namespace + key resolves in en.json
  const keyCopy = new RegExp(keyRegex.source, keyRegex.flags);
  while ((m = keyCopy.exec(content)) !== null) {
    const key = m[1];
    // Skip keys that contain variables/expressions
    if (key.includes("{") || key.includes("$")) continue;

    // Try resolving with each namespace
    let found = false;
    for (const ns of namespaces) {
      const fullPath = `${ns}.${key}`;
      const val = resolve(en, fullPath);
      if (val !== undefined) {
        found = true;
        break;
      }
    }

    // Also check if key has a defaultValue (which means it won't show raw)
    const lineStart = content.lastIndexOf("\n", m.index) + 1;
    const lineEnd = content.indexOf("\n", m.index);
    const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    const hasDefault = line.includes("defaultValue");

    if (!found && !hasDefault) {
      const rel = relative(ROOT, file);
      issues.push(`  ${rel}: key "${key}" with namespace(s) [${namespaces.join(", ")}] — no match in en.json and no defaultValue`);
      missing++;
    }
  }
}

if (missing > 0) {
  console.error(`\n❌ Found ${missing} potentially missing i18n key(s):\n`);
  issues.forEach((i) => console.error(i));
  console.error(`\nFix: add missing keys to src/i18n/messages/en.json or add defaultValue fallbacks.\n`);
  process.exit(1);
} else {
  console.log(`✅ All i18n keys verified — no unresolved keys found in ${files.length} files.`);
  process.exit(0);
}

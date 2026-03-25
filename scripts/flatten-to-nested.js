// Convert flat dot-notation i18n message keys to nested objects for all locales.
// Usage: node scripts/flatten-to-nested.js
/* eslint-disable @typescript-eslint/no-require-imports -- Node script uses require for fs/path */
const fs = require("fs");
const path = require("path");

const locales = ["en", "es", "fr", "de", "pt", "ja"];
const messagesDir = path.join(__dirname, "..", "src", "i18n", "messages");

for (const locale of locales) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const flat = JSON.parse(raw);
  const nested = {};

  for (const [key, value] of Object.entries(flat)) {
    // Preserve already-nested objects (e.g. "hero", "accessibility", "contacts")
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      if (nested[key] && typeof nested[key] === "object") {
        nested[key] = { ...nested[key], ...value };
      } else {
        nested[key] = value;
      }
      continue;
    }

    const parts = key.split(".");
    let current = nested;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  }

  fs.writeFileSync(filePath, `${JSON.stringify(nested, null, 2)}\n`, "utf-8");
  console.log(`Converted ${locale}.json: ${Object.keys(flat).length} keys`);
}


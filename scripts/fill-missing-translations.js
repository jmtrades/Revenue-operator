#!/usr/bin/env node

const fs = require(&apos;fs&apos;);
const path = require(&apos;path&apos;);

const messagesDir = path.join(__dirname, &apos;../src/i18n/messages&apos;);
const locales = [&apos;de&apos;, &apos;es&apos;, &apos;fr&apos;, &apos;ja&apos;, &apos;pt&apos;];

function getKeys(obj, prefix = &apos;&apos;) {
  const keys = new Set();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.add(fullKey);

    if (value !== null && typeof value === &apos;object&apos; && !Array.isArray(value)) {
      const nestedKeys = getKeys(value, fullKey);
      nestedKeys.forEach(k => keys.add(k));
    }
  }

  return keys;
}

function getValueByPath(obj, path) {
  const parts = path.split(&apos;.&apos;);
  let current = obj;

  for (const part of parts) {
    if (current === null || typeof current !== &apos;object&apos;) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

function setValueByPath(obj, path, value) {
  const parts = path.split(&apos;.&apos;);
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== &apos;object&apos; || current[part] === null) {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

console.log(&apos;Loading reference English translations...\n&apos;);

const enPath = path.join(messagesDir, &apos;en.json&apos;);
const enContent = fs.readFileSync(enPath, &apos;utf-8&apos;);
const enData = JSON.parse(enContent);
const enKeys = getKeys(enData);

console.log(`Found ${enKeys.size} keys in en.json\n`);

const results = {};

for (const locale of locales) {
  const localePath = path.join(messagesDir, `${locale}.json`);
  const localeContent = fs.readFileSync(localePath, &apos;utf-8&apos;);
  const localeData = JSON.parse(localeContent);
  const localeKeys = getKeys(localeData);

  const missingKeys = [...enKeys].filter(key => !localeKeys.has(key));

  console.log(`${locale.toUpperCase()}: Found ${missingKeys.length} missing keys`);

  let addedCount = 0;

  for (const key of missingKeys) {
    const enValue = getValueByPath(enData, key);
    if (enValue !== undefined) {
      setValueByPath(localeData, key, enValue);
      addedCount++;
    }
  }

  fs.writeFileSync(localePath, JSON.stringify(localeData, null, 2) + &apos;\n&apos;, &apos;utf-8&apos;);

  console.log(`  └─ Added ${addedCount} missing keys using English fallbacks\n`);

  results[locale] = {
    missing: missingKeys.length,
    added: addedCount
  };
}

console.log(&apos;\n=== SUMMARY ===\n&apos;);

for (const locale of locales) {
  const { missing, added } = results[locale];
  console.log(`${locale.toUpperCase()}: ${added}/${missing} keys filled`);
}

console.log(&apos;\nAll locale files have been updated with English fallbacks.&apos;);

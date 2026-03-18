#!/usr/bin/env node
/**
 * Workaround for Vercel + Next.js 16 Turbopack middleware.js.nft.json missing file.
 * Vercel's packaging step expects this file but Turbopack may not generate it.
 * This script runs after `next build` and creates a minimal NFT file if missing.
 *
 * CRITICAL: NFT files use paths RELATIVE to the .nft.json file's own directory.
 * The file lives at .next/server/middleware.js.nft.json so all paths must be
 * relative to .next/server/
 */
import { existsSync, writeFileSync } from "fs";
import { join } from "path";

const nftPath = join(process.cwd(), ".next", "server", "middleware.js.nft.json");

if (!existsSync(nftPath)) {
  console.log("⚠ middleware.js.nft.json missing — creating minimal trace file");

  // Paths must be RELATIVE to the directory containing the .nft.json file
  // which is .next/server/. So "middleware.js" means .next/server/middleware.js
  // and "../../middleware.ts" means <project root>/middleware.ts
  const files = ["middleware.js"];

  // Include source middleware if it exists (relative from .next/server/)
  const srcMiddleware = join(process.cwd(), "middleware.ts");
  if (existsSync(srcMiddleware)) {
    files.push("../../middleware.ts");
  }

  writeFileSync(nftPath, JSON.stringify({ version: 1, files }));
  console.log("✓ Created middleware.js.nft.json with relative paths:", files);
} else {
  console.log("✓ middleware.js.nft.json already exists");
}

#!/usr/bin/env node
/**
 * Workaround for Vercel + Next.js 16 Turbopack middleware.js.nft.json missing file.
 * Vercel's packaging step expects this file but Turbopack may not generate it.
 * This script runs after `next build` and creates a minimal NFT file if missing.
 */
import { existsSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

const nftPath = join(process.cwd(), ".next", "server", "middleware.js.nft.json");

if (!existsSync(nftPath)) {
  console.log("⚠ middleware.js.nft.json missing — creating minimal trace file");
  const middlewarePath = join(process.cwd(), ".next", "server", "middleware.js");
  const files = [middlewarePath];
  // Include the source middleware file if it exists
  const srcMiddleware = join(process.cwd(), "middleware.ts");
  if (existsSync(srcMiddleware)) files.push(srcMiddleware);
  writeFileSync(nftPath, JSON.stringify({ version: 1, files }));
  console.log("✓ Created middleware.js.nft.json");
} else {
  console.log("✓ middleware.js.nft.json exists");
}

#!/usr/bin/env node
/**
 * POST Worker /api/refresh (RSS ingest into D1).
 *
 * Usage:
 *   npm run refresh:local          → http://127.0.0.1:8788 (wrangler dev)
 *   npm run refresh:prod           → production workers.dev URL
 *   REFRESH_URL=https://…/api/refresh npm run refresh:local   → staging / 自訂
 *
 * Optional: REFRESH_SECRET (or worker/.dev.vars) — must match Worker 上嘅 secret；未設則唔帶 Authorization。
 */
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const devVarsPath = join(root, "worker", ".dev.vars");

function parseDevVars(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

let secret = process.env.REFRESH_SECRET;
if (!secret && fs.existsSync(devVarsPath)) {
  try {
    const vars = parseDevVars(fs.readFileSync(devVarsPath, "utf8"));
    if (vars.REFRESH_SECRET) secret = vars.REFRESH_SECRET;
  } catch {
    /* ignore */
  }
}

const PROD_REFRESH =
  "https://kong-news-kong-mud-worker.cloudflare-underfeed523.workers.dev/api/refresh";

const url = (() => {
  if (process.env.REFRESH_URL) return process.env.REFRESH_URL;
  if (process.argv.includes("--prod")) return PROD_REFRESH;
  return "http://127.0.0.1:8788/api/refresh";
})();
const headers = { Accept: "application/json" };
if (secret) headers.Authorization = `Bearer ${secret}`;

console.log(`→ POST ${url}`);

const res = await fetch(url, { method: "POST", headers });
const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = text;
}
console.log(typeof body === "string" ? body : JSON.stringify(body, null, 2));
if (!res.ok) process.exit(1);

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const env = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).replace(/^\uFEFF/, "");
    const value = line.slice(index + 1).replace(/^"|"$/g, "");
    env[key] = value;
  }
  return env;
}

const env = {
  ...readEnvFile(path.join(process.cwd(), ".env.local")),
  ...process.env,
};

const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const missing = required.filter((key) => !env[key]);

if (missing.length > 0) {
  console.error(`Missing env: ${missing.join(", ")}`);
  process.exit(1);
}

if (!env.NEXT_PUBLIC_SUPABASE_URL.startsWith("https://")) {
  console.error("NEXT_PUBLIC_SUPABASE_URL must start with https://");
  process.exit(1);
}

if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length < 100) {
  console.error(
    `NEXT_PUBLIC_SUPABASE_ANON_KEY looks too short (${env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length} chars). ` +
      "Copy the anon public key again from Supabase Project Settings > API.",
  );
  process.exit(1);
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const checks = [
  "products",
  "product_variants",
  "product_images",
  "store_settings",
  "orders",
  "order_items",
];

let failed = false;

for (const table of checks) {
  const { error } = await supabase.from(table).select("*", { count: "exact", head: true });

  if (error) {
    failed = true;
    console.error(`FAIL ${table}: ${error.code || "unknown"} - ${error.message}`);
  } else {
    console.log(`OK   ${table}`);
  }
}

if (failed) {
  console.error("Supabase health check failed. Check env keys, RLS policies, and migrations.");
  process.exit(1);
}

console.log("Supabase health check passed.");

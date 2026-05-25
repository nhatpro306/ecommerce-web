"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

const CLIENT_OPTIONS = {
  realtime: {
    params: { eventsPerSecond: 10 },
    heartbeatIntervalMs: 30000,
    reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 10000),
  },
  db: { schema: "public" },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
} as const;

// Lazy singleton — only resolved at runtime in the browser, not at module eval.
let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;
let _staleCookiesCleared = false;

function getProjectRefFromUrl(url: string): string | null {
  const match = url.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return match ? match[1] : null;
}

/**
 * Remove `sb-<ref>-auth-token` cookies that belong to a *different* Supabase
 * project than the one this build targets. A leftover cookie from a previous
 * project ref can cause `auth.getSession()` to hang indefinitely, which then
 * prevents any PostgREST request from leaving the browser.
 */
function clearStaleSupabaseCookies(currentRef: string) {
  if (typeof document === "undefined" || _staleCookiesCleared) return;
  _staleCookiesCleared = true;

  const cookieNames = document.cookie
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter((name) => /^sb-[a-z0-9-]+-auth-token(\.\d+)?$/i.test(name));

  for (const name of cookieNames) {
    const match = name.match(/^sb-([a-z0-9-]+)-auth-token/i);
    if (!match) continue;
    if (match[1] === currentRef) continue;

    // Expire on every plausible path/domain combination.
    const past = "Thu, 01 Jan 1970 00:00:00 GMT";
    const host = window.location.hostname;
    const apex = host.split(".").slice(-2).join(".");
    document.cookie = `${name}=; expires=${past}; path=/`;
    document.cookie = `${name}=; expires=${past}; path=/; domain=${host}`;
    document.cookie = `${name}=; expires=${past}; path=/; domain=.${host}`;
    if (apex && apex !== host) {
      document.cookie = `${name}=; expires=${past}; path=/; domain=.${apex}`;
    }
  }
}

export function getSupabaseClient() {
  if (!_client) {
    const { url, key } = getSupabasePublicEnv();
    const ref = getProjectRefFromUrl(url);
    if (ref) clearStaleSupabaseCookies(ref);
    _client = createBrowserClient<Database>(url, key, CLIENT_OPTIONS);
  }
  return _client;
}

// Proxy object: accessing any property triggers lazy init.
// This preserves `import { supabase } from "..."` call-sites unchanged.
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient<Database>>, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = client[prop as keyof ReturnType<typeof createBrowserClient<Database>>];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export const supabaseAuth = new Proxy({} as ReturnType<typeof createBrowserClient<Database>>["auth"], {
  get(_target, prop) {
    const auth = getSupabaseClient().auth;
    const value = auth[prop as keyof ReturnType<typeof createBrowserClient<Database>>["auth"]];
    return typeof value === "function" ? value.bind(auth) : value;
  },
});

export function createClientSupabase() {
  return getSupabaseClient();
}

/**
 * Helper function to get the authenticated user from client-side
 */
export async function getAuthenticatedUser() {
  const supabase = createClientSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Helper function to get user profile data from client-side
 */
export async function getUserProfile(userId: string) {
  const supabase = createClientSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return data;
}

/**
 * Helper function to get products from client-side
 */
export async function getProducts() {
  const supabase = createClientSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

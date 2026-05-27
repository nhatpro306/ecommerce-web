"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * In-memory mutex per lock name.
 *
 * Replaces `navigatorLock` (the @supabase/auth-js default in browsers). The
 * navigator.locks API is shared by every script in the tab, and if any caller
 * grabs `lock:sb-<ref>-auth-token` and never releases — observed in
 * production: dashboard mount + concurrent cart hydration left an orphan
 * holder — every subsequent `auth.getSession()` / `from(...)` blocks forever.
 *
 * A process-local FIFO queue keeps the gotrue serialization guarantees
 * (refresh + cookie writes never run in parallel) without the cross-context
 * deadlock surface.
 */
const _lockQueues = new Map<string, Promise<unknown>>();
async function processLock<R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  const prev = _lockQueues.get(name) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  _lockQueues.set(name, prev.then(() => next));
  try {
    await prev;
    return await fn();
  } finally {
    release();
    if (_lockQueues.get(name) === next) {
      _lockQueues.delete(name);
    }
  }
}

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
    lock: processLock,
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

/**
 * Always returns the same singleton browser client.
 *
 * Older call sites use this name expecting a new instance. Creating multiple
 * @supabase/ssr browser clients in one tab causes them to deadlock on the
 * shared `lock:sb-<ref>-auth-token` (navigator.locks) — once any client is
 * inside its lock callback, every other client's `auth.getSession()` /
 * `from(...)` request blocks forever. We saw this on production: the admin
 * dashboard's parallel fetches and the cart's `getClientUser()` calls each
 * constructed their own client and the queries never resolved.
 *
 * Returning the cached singleton is safe — auth state, cookies, and realtime
 * subscriptions are intentionally shared across the tab.
 */
export function createClientSupabase() {
  return getSupabaseClient();
}

/**
 * Helper function to get the authenticated user from client-side
 */
export async function getAuthenticatedUser() {
  const {
    data: { user },
  } = await getSupabaseClient().auth.getUser();
  return user;
}

/**
 * Helper function to get user profile data from client-side
 */
export async function getUserProfile(userId: string) {
  const { data } = await getSupabaseClient()
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
  const { data, error } = await getSupabaseClient()
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

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

export function getSupabaseClient() {
  if (!_client) {
    const { url, key } = getSupabasePublicEnv();
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
    .eq("profile_id", userId)
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

export function getSupabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    // Server-side fallbacks (available in Vercel build environment)
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY
  );
}

export function getSupabasePublicEnv() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    // Server-side fallback for static generation / SSR on Vercel
    process.env.SUPABASE_URL;

  const key = getSupabasePublicKey();

  if (!url || !key) {
    throw new Error("Missing Supabase public environment variables");
  }

  return { url, key };
}

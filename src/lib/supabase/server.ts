import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

/**
 * Creates a Supabase client for server-side usage with proper cookie handling
 */
export const createServerSupabase = async () => {
  const cookieStore = await cookies();
  const { url, key } = getSupabasePublicEnv();

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) => {
          try {
            cookies.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Handle cookie errors
          }
        },
      },
    }
  );
};

/**
 * Helper function to get the authenticated user from server-side
 * get the authenticated user from the server side
 */
export const getAuthenticatedUser = async () => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user;
};

/**
 * Helper function to get user profile data
 */
export const getUserProfile = async () => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('profile_id', user.id)
    .single();

  return profile;
};

/**
 * Helper function to get products from server-side
 */
export const getProducts = async () => {
  const supabase = await createServerSupabase();
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  return products;
};

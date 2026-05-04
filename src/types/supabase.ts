/**
 * TypeScript definitions for Supabase database schema.
 * Regenerate with: npx supabase gen types typescript --project-id <ref>
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Permissive until generated `Database` types are committed. */
export type Database = any

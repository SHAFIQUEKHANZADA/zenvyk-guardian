/**
 * Centralised Supabase env access.
 *
 * The frontend is designed to *boot* even when Supabase is not yet
 * configured (e.g. a fresh clone before keys are added). Auth simply
 * becomes a no-op in that case, and `isSupabaseConfigured` lets the UI
 * and middleware degrade gracefully instead of crashing.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

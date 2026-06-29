"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * Browser-side Supabase client (singleton).
 *
 * If env vars are missing we still construct a client against harmless
 * placeholder values so imports don't throw — calls will fail at request
 * time, and the UI guards on `isSupabaseConfigured` before making them.
 */
export function createClient() {
  return createBrowserClient(
    SUPABASE_URL || "https://placeholder.supabase.co",
    SUPABASE_ANON_KEY || "placeholder-anon-key",
  );
}

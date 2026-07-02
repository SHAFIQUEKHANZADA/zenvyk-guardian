"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * The backend now requires a Guardian API key on /v1/verify, /v1/extract, etc.
 * Fetch the signed-in user's most recent active key so the client can send it
 * as `Authorization: Bearer <key>`. Returns null if none exists.
 */
export async function fetchActiveApiKey(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("key")
    .eq("revoked", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data?.key ?? null;
}

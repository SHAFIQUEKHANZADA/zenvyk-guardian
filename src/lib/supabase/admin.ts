import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * Service-role Supabase client — bypasses RLS. SERVER-ONLY.
 * Used exclusively by the Stripe webhook to write subscription/plan state.
 * Never import this into a client component.
 */
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isAdminConfigured =
  SUPABASE_URL.length > 0 && SERVICE_ROLE_KEY.length > 0;

export function createAdminClient() {
  if (!isAdminConfigured) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

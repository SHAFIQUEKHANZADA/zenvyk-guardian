import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Idempotently ensure a `profiles` row exists for the current user.
 * Called after login/signup. Safe to call repeatedly (upsert on PK).
 */
export async function ensureProfile(supabase: SupabaseClient): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const meta = user.user_metadata ?? {};
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      first_name: (meta.first_name as string | undefined) ?? null,
      last_name: (meta.last_name as string | undefined) ?? null,
    },
    { onConflict: "id" },
  );
}

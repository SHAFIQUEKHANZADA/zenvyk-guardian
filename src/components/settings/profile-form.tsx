"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, Spinner } from "@/components/ui/feedback";

export function ProfileForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();
      if (data) {
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be signed in.");
      setSaving(false);
      return;
    }
    const first = firstName.trim() || null;
    const last = lastName.trim() || null;
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: first, last_name: last })
      .eq("id", user.id);

    if (error) {
      setError(error.message);
    } else {
      // Mirror into auth metadata so the top bar / greeting update immediately.
      await supabase.auth.updateUser({
        data: {
          first_name: first,
          last_name: last,
          full_name: [first, last].filter(Boolean).join(" ") || null,
        },
      });
      setSaved(true);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted">
        <Spinner /> Loading profile…
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {saved ? <Alert tone="success">Profile updated.</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="first_name">First name</Label>
          <Input
            id="first_name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Jane"
            disabled={!isSupabaseConfigured}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name">Last name</Label>
          <Input
            id="last_name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            disabled={!isSupabaseConfigured}
          />
        </div>
      </div>

      <Button type="submit" disabled={saving || !isSupabaseConfigured}>
        {saving ? <Spinner /> : null}
        Save changes
      </Button>
    </form>
  );
}

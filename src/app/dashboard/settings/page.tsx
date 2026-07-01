import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/feedback";
import { ProfileForm } from "@/components/settings/profile-form";

export const metadata: Metadata = { title: "Settings · Zenvyk Guardian" };

export default async function SettingsPage() {
  let email: string | null = null;
  let createdAt: string | null = null;
  let userId: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
    createdAt = user?.created_at ?? null;
    userId = user?.id ?? null;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted">Manage your profile and account.</p>
      </div>

      {!isSupabaseConfigured ? (
        <Alert tone="info">
          Supabase isn&apos;t configured — profile details are unavailable in
          this preview.
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Your name</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground/90">
              {email ?? "—"}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>User ID</Label>
            <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-muted">
              {userId ?? "—"}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Member since</Label>
            <p className="text-sm text-muted">
              {createdAt
                ? new Date(createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sign out</p>
              <p className="text-xs text-muted">
                End your session on this device.
              </p>
            </div>
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="outline" size="sm">
                Log out
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

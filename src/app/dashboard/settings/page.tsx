import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/settings/profile-form";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { ManageBillingButton } from "@/components/billing/manage-billing-button";
import { planLabel } from "@/lib/plans";

export const metadata: Metadata = { title: "Settings · Zenvyk Guardian" };

export default async function SettingsPage() {
  let email: string | null = null;
  let createdAt: string | null = null;
  let userId: string | null = null;
  let plan = "free";
  let subStatus: string | null = null;
  let periodEnd: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
    createdAt = user?.created_at ?? null;
    userId = user?.id ?? null;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();
      plan = profile?.plan ?? "free";

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", user.id)
        .maybeSingle();
      subStatus = sub?.status ?? null;
      periodEnd = sub?.current_period_end ?? null;
    }
  }

  const isPaid = plan === "pro" || plan === "enterprise";

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
          <CardTitle>Billing &amp; plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Current plan</span>
                <Badge tone={isPaid ? "primary" : "neutral"}>
                  {planLabel(plan)}
                </Badge>
                {subStatus && subStatus !== "active" ? (
                  <Badge tone={subStatus === "trialing" ? "pass" : "flagged"}>
                    {subStatus}
                  </Badge>
                ) : null}
              </div>
              {isPaid && periodEnd ? (
                <p className="mt-1 text-xs text-muted">
                  {subStatus === "canceled"
                    ? "Access ends "
                    : "Renews "}
                  {new Date(periodEnd).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted">
                  1,000 verified requests / month
                </p>
              )}
            </div>

            {plan === "free" ? (
              <CheckoutButton size="sm">Upgrade to Pro</CheckoutButton>
            ) : plan === "pro" ? (
              <ManageBillingButton />
            ) : (
              <Link href="/pricing">
                <Button variant="outline" size="sm">
                  View plans
                </Button>
              </Link>
            )}
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

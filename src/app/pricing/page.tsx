import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { PricingCards } from "@/components/billing/pricing-cards";

export const metadata: Metadata = {
  title: "Pricing · Zenvyk Guardian",
  description:
    "Simple, transparent pricing for multi-model AI verification — Free, Pro, and Enterprise.",
};

export default async function PricingPage() {
  let currentPlan: string | undefined;
  let signedIn = false;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      signedIn = true;
      const { data } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();
      currentPlan = data?.plan ?? "free";
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/dashboard">
              <Button variant="secondary" size="sm">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Pricing that scales with your AI
          </h1>
          <p className="mt-4 text-muted">
            Start free. Upgrade to Pro for the full 5-model ensemble with a
            14-day trial. Enterprise is tailored to you.
          </p>
        </div>

        <PricingCards currentPlan={currentPlan} />

        <p className="mt-10 text-center text-xs text-muted-2">
          Prices in USD. Pro includes a 14-day free trial — cancel anytime from
          the billing portal. Need something custom?{" "}
          <a href="mailto:reid@zenvyk.com" className="text-primary hover:underline">
            Talk to sales
          </a>
          .
        </p>
      </main>
    </div>
  );
}

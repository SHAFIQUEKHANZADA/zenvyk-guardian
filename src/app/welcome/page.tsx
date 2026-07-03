import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Logo } from "@/components/brand";
import { ChoosePlan } from "@/components/onboarding/choose-plan";

export const metadata: Metadata = { title: "Choose your plan · Zenvyk Guardian" };

export default async function WelcomePage() {
  let currentPlan = "free";

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login?redirectedFrom=/welcome");

    const { data } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();
    currentPlan = data?.plan ?? "free";
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
          Skip for now →
        </Link>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
        <ChoosePlan currentPlan={currentPlan} />
      </main>
    </div>
  );
}

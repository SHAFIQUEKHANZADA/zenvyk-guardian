import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, Crosshair, Brain, ShieldCheck, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LogoMark } from "@/components/brand";

export default async function LandingPage() {
  // Logged-in users skip the marketing page.
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      {/* Nav */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-[0.12em] text-slate-900">
              ZENVYK
            </span>
            <span className="text-[10px] font-semibold tracking-[0.34em] text-emerald-600">
              GUARDIAN
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <Link href="/login" className="hover:text-slate-900">Why Guardian</Link>
          <Link href="/login" className="hover:text-slate-900">How It Works</Link>
          <Link href="/login" className="hover:text-slate-900">Pricing</Link>
          <Link href="/login" className="hover:text-slate-900">Docs</Link>
          <Link href="/login" className="hover:text-slate-900">About</Link>
        </nav>

        <Link
          href="/signup"
          className="rounded-lg border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-50"
        >
          Sign Up
        </Link>
      </header>

      {/* Hero */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 pt-16 text-center sm:pt-24">
        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
          Every AI output,
          <br />
          <span className="text-emerald-500">verified.</span>
        </h1>

        <p className="mt-8 text-xl font-semibold sm:text-2xl">
          <span className="text-emerald-600">Stop drift. Stop hallucinations.</span>{" "}
          <span className="text-slate-900">Build trust in AI.</span>
        </p>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-500">
          Zenvyk Guardian intercepts every response from any LLM and verifies it
          using 3-of-5 model consensus in real-time—so you and your data are
          always protected.
        </p>

        {/* Search-style CTA */}
        <form
          action="/signup"
          className="mt-10 flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 pl-5 shadow-sm"
        >
          <Search className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            name="q"
            placeholder="How can Guardian protect your AI today?"
            className="flex-1 bg-transparent py-2 text-base text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Get Started
          </button>
        </form>

        {/* Feature columns */}
        <div className="mt-16 grid w-full max-w-3xl grid-cols-1 divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Feature
            icon={<Crosshair className="h-6 w-6" />}
            title="Stop Drift"
            body="Detect when models go off track."
          />
          <Feature
            icon={<Brain className="h-6 w-6" />}
            title="Stop Hallucinations"
            body="Block false or unsupported information."
          />
          <Feature
            icon={<ShieldCheck className="h-6 w-6" />}
            title="Build Trust"
            body="Verified answers you can rely on."
          />
        </div>

        {/* Trust row */}
        <p className="mt-16 text-sm font-medium text-slate-500">
          Built for security, compliance, and scale.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-slate-700">
          {[
            "Real-time Verification",
            "3-of-5 Model Consensus",
            "Enterprise Ready",
            "SOC 2 Ready",
          ].map((t) => (
            <span key={t} className="inline-flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              {t}
            </span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6">
          <nav className="flex gap-8 text-sm font-medium text-slate-500">
            <Link href="/login" className="hover:text-slate-900">Privacy</Link>
            <Link href="/login" className="hover:text-slate-900">Terms</Link>
            <Link href="/login" className="hover:text-slate-900">Security</Link>
            <Link href="/login" className="hover:text-slate-900">Contact</Link>
          </nav>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Zenvyk Guardian. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-6 text-center">
      <span className="text-emerald-500">{icon}</span>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500">{body}</p>
    </div>
  );
}

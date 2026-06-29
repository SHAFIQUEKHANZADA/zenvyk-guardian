import Link from "next/link";
import { Logo } from "@/components/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Form column */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="inline-flex w-fit">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm py-12">{children}</div>
        </div>
        <p className="text-xs text-muted-2">
          © {new Date().getFullYear()} Zenvyk Guardian
        </p>
      </div>

      {/* Brand / marketing column */}
      <div className="relative hidden lg:flex flex-col justify-center overflow-hidden border-l border-border bg-surface px-12">
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 70% 30%, rgba(16,185,129,0.20), transparent 60%), radial-gradient(50% 50% at 30% 80%, rgba(45,212,167,0.12), transparent 60%)",
          }}
        />
        <div className="relative max-w-md">
          <h2 className="text-2xl font-semibold tracking-tight">
            Multi-model AI verification you can trust.
          </h2>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            Guardian runs every prompt through a panel of frontier models and
            returns a consensus verdict — PASS, FLAGGED, or BLOCKED — with full
            scoring, so you ship AI features without shipping AI risk.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-foreground/80">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-pass" />
              3-of-5 consensus voting
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-flagged" />
              Live verification dashboard
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Drop-in API with a single key
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

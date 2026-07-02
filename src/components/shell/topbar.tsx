"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Bell } from "lucide-react";
import { Logo } from "@/components/brand";
import { titleForPath } from "./nav";
import { SidebarNav } from "./sidebar";
import { UserMenu } from "./user-menu";

export function Topbar({
  email,
  name,
  plan = "free",
}: {
  email: string | null;
  name: string | null;
  plan?: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = titleForPath(pathname);
  const onOverview = pathname === "/dashboard";
  const isPaid = plan === "pro" || plan === "enterprise";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden rounded-lg p-2 text-muted hover:bg-surface-2"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight leading-tight">
              {title}
            </h1>
            {onOverview ? (
              <p className="text-xs text-muted leading-tight">
                Welcome back{name ? `, ${name}` : ""}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {isPaid ? (
            <span className="hidden rounded-full border border-primary/30 bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary sm:inline">
              {plan === "enterprise" ? "Enterprise" : "Pro"}
            </span>
          ) : (
            <Link
              href="/pricing"
              className="hidden rounded-full border border-border-strong px-2.5 py-1 text-xs font-medium text-foreground/90 hover:border-primary hover:text-primary sm:inline"
            >
              Upgrade to Pro
            </Link>
          )}
          <button
            className="relative rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
          </button>
          <span className="hidden h-6 w-px bg-border sm:block" />
          <UserMenu email={email} name={name} />
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border bg-sidebar">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                <Logo />
              </Link>
              <button
                className="rounded-lg p-2 text-muted hover:bg-surface-2"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}

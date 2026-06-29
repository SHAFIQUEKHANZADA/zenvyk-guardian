"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";

function initialsFrom(name: string | null, email: string | null): string {
  const base = name?.trim() || email?.split("@")[0] || "User";
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase();
}

export function UserMenu({
  email,
  name,
}: {
  email: string | null;
  name?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initials = initialsFrom(name ?? null, email);
  const displayName = name?.trim() || email?.split("@")[0] || "Account";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg p-1 pr-2 text-sm hover:bg-surface-2 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-xs font-bold text-emerald-950">
          {initials}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[140px] truncate text-sm font-medium leading-tight text-foreground/90">
            {displayName}
          </span>
          <span className="block text-[11px] leading-tight text-muted">
            Admin
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-muted-2" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-xl shadow-black/40 z-50"
        >
          <div className="border-b border-border px-3 py-3">
            <p className="text-xs text-muted">Signed in as</p>
            <p className="truncate text-sm font-medium">{email ?? "—"}</p>
          </div>
          <div className="p-1">
            <MenuLink href="/dashboard/settings" icon={<User className="h-4 w-4" />}>
              Profile
            </MenuLink>
            <MenuLink
              href="/dashboard/settings"
              icon={<Settings className="h-4 w-4" />}
            >
              Settings
            </MenuLink>
          </div>
          <div className="border-t border-border p-1">
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-blocked hover:bg-surface-2 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground/90 hover:bg-surface-2 transition-colors",
      )}
    >
      <span className="text-muted-2">{icon}</span>
      {children}
    </Link>
  );
}

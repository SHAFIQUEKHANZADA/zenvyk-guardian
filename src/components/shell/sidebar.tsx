"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  LifeBuoy,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand";
import { navItems } from "./nav";
import { cn } from "@/lib/utils";

function isActive(href: string, pathname: string) {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(href);
}

export function SidebarNav({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  // Only show shipped pages for now; "Coming soon" items stay routable
  // (the pages still exist) but are hidden from the nav.
  const visibleItems = navItems.filter((item) => !item.comingSoon);

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
      {visibleItems.map((item) => {
        const active = isActive(item.href, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              collapsed && "justify-center px-0",
              active
                ? "bg-primary/12 text-foreground"
                : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            {active ? (
              <span className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r bg-primary"
                style={{ width: 3 }} />
            ) : null}
            <Icon
              className={cn(
                "h-[18px] w-[18px] shrink-0",
                active
                  ? "text-primary"
                  : "text-muted-2 group-hover:text-foreground",
              )}
            />
            {!collapsed ? (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                {item.comingSoon ? (
                  <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-muted-2">
                    Soon
                  </span>
                ) : null}
              </>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden lg:flex shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center border-b border-border px-4">
        <Link href="/dashboard" className="flex items-center">
          {collapsed ? <LogoMark /> : <Logo />}
        </Link>
      </div>

      {/* Workspace switcher */}
      <div className="px-3 pt-3">
        <button
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface px-2.5 py-2 text-left transition-colors hover:border-border-strong",
            collapsed && "justify-center px-0",
          )}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-bold text-emerald-950">
            Z
          </span>
          {!collapsed ? (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  My Workspace
                </span>
                <span className="block truncate text-[11px] text-muted">
                  Free plan
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-2" />
            </>
          ) : null}
        </button>
      </div>

      <SidebarNav collapsed={collapsed} />

      {/* Help card */}
      {!collapsed ? (
        <div className="px-3">
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <LifeBuoy className="h-3.5 w-3.5 text-primary" />
              Need help?
            </p>
            <p className="mt-0.5 text-[11px] text-muted">Contact support</p>
            <a
              href="mailto:support@zenvyk.com"
              className="mt-2 block rounded-md border border-border-strong px-3 py-1.5 text-center text-xs font-medium hover:bg-surface-2"
            >
              Get Help
            </a>
          </div>
        </div>
      ) : null}

      {/* Collapse toggle */}
      <div className="border-t border-border p-3">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" />
              Collapse
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

import {
  LayoutDashboard,
  FlaskConical,
  Split,
  Radar,
  BadgeCheck,
  Activity,
  Inbox,
  Boxes,
  Shield,
  Database,
  Server,
  Plug,
  Bell,
  FileBarChart,
  KeyRound,
  Users,
  Settings,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Placeholder = "Coming soon" page, not part of the MVP build. */
  comingSoon?: boolean;
}

/** Flat nav matching Reid's dashboard mockup (order preserved). */
export const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Playground", href: "/dashboard/playground", icon: FlaskConical },
  { label: "Router", href: "/dashboard/router", icon: Split },
  { label: "Resource Intelligence", href: "/dashboard/resource", icon: Radar },
  { label: "Business Verification", href: "/dashboard/verify", icon: BadgeCheck },
  { label: "Activity", href: "/dashboard/activity", icon: Activity, comingSoon: true },
  { label: "Requests", href: "/dashboard/requests", icon: Inbox, comingSoon: true },
  { label: "Models", href: "/dashboard/models", icon: Boxes, comingSoon: true },
  { label: "Policies", href: "/dashboard/policies", icon: Shield, comingSoon: true },
  { label: "Datasets", href: "/dashboard/datasets", icon: Database, comingSoon: true },
  { label: "Endpoints", href: "/dashboard/endpoints", icon: Server, comingSoon: true },
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug, comingSoon: true },
  { label: "Alerts", href: "/dashboard/alerts", icon: Bell, comingSoon: true },
  { label: "Reports", href: "/dashboard/reports", icon: FileBarChart, comingSoon: true },
  { label: "API Keys", href: "/dashboard/api-keys", icon: KeyRound },
  { label: "Team", href: "/dashboard/team", icon: Users, comingSoon: true },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard, comingSoon: true },
];

/** Longest-prefix match for the topbar page title. */
export function titleForPath(pathname: string): string {
  const match = navItems
    .filter((i) =>
      i.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(i.href),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "Dashboard";
}

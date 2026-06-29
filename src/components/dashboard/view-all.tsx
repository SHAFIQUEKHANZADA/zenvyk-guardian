import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small "View all" pill used in dashboard card headers. */
export function ViewAll({
  href,
  label = "View all",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground",
        className,
      )}
    >
      {label}
    </Link>
  );
}

/** Inline "… →" footer link. */
export function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

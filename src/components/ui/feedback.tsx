import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-8 px-4",
        className,
      )}
    >
      {icon ? <div className="mb-2 text-muted-2">{icon}</div> : null}
      <p className="text-sm font-medium text-foreground/80">{title}</p>
      {description ? (
        <p className="mt-1 text-xs text-muted max-w-xs">{description}</p>
      ) : null}
    </div>
  );
}

export function Alert({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "success" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    error: "border-blocked/30 bg-[var(--blocked-soft)] text-blocked",
    success: "border-pass/30 bg-[var(--pass-soft)] text-pass",
    info: "border-primary/30 bg-primary/10 text-foreground/90",
  } as const;
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tones[tone],
        className,
      )}
      role={tone === "error" ? "alert" : undefined}
    >
      {children}
    </div>
  );
}

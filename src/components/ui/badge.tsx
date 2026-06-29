import * as React from "react";
import { cn } from "@/lib/utils";
import type { Verdict } from "@/lib/api";

type Tone = "neutral" | "pass" | "flagged" | "blocked" | "primary";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-3 text-muted border-border",
  pass: "bg-[var(--pass-soft)] text-pass border-pass/30",
  flagged: "bg-[var(--flagged-soft)] text-flagged border-flagged/30",
  blocked: "bg-[var(--blocked-soft)] text-blocked border-blocked/30",
  primary: "bg-primary/15 text-primary border-primary/30",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function verdictTone(verdict: Verdict): Tone {
  return verdict === "PASS" ? "pass" : verdict === "FLAGGED" ? "flagged" : "blocked";
}

/** Small colored badge for a verification verdict. */
export function VerdictBadge({
  verdict,
  className,
}: {
  verdict: Verdict;
  className?: string;
}) {
  return (
    <Badge tone={verdictTone(verdict)} className={cn("uppercase", className)}>
      {verdict}
    </Badge>
  );
}

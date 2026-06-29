import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Tone = "default" | "pass" | "flagged" | "blocked";

export interface StatDelta {
  text: string; // e.g. "18.3% vs last 7 days"
  direction: "up" | "down";
  good: boolean; // whether this direction is positive (green) or not
}

export interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  subTone?: Tone;
  delta?: StatDelta;
  icon: LucideIcon;
  tone?: Tone;
}

const toneTile: Record<Tone, string> = {
  default: "bg-primary/15 text-primary",
  pass: "bg-[var(--pass-soft)] text-pass",
  flagged: "bg-[var(--flagged-soft)] text-flagged",
  blocked: "bg-[var(--blocked-soft)] text-blocked",
};

const toneText: Record<Tone, string> = {
  default: "text-muted",
  pass: "text-pass",
  flagged: "text-flagged",
  blocked: "text-blocked",
};

export function StatCard({
  label,
  value,
  sub,
  subTone = "default",
  delta,
  icon: Icon,
  tone = "default",
}: StatCardProps) {
  const Arrow = delta?.direction === "down" ? ArrowDownRight : ArrowUpRight;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
            toneTile[tone],
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-3 text-[26px] font-semibold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      {delta ? (
        <p
          className={cn(
            "mt-2 flex items-center gap-1 text-xs font-medium",
            delta.good ? "text-pass" : "text-blocked",
          )}
        >
          <Arrow className="h-3.5 w-3.5" />
          {delta.text}
        </p>
      ) : sub ? (
        <p className={cn("mt-2 text-xs font-medium", toneText[subTone])}>
          {sub}
        </p>
      ) : (
        <p className="mt-2 text-xs text-transparent select-none">·</p>
      )}
    </Card>
  );
}

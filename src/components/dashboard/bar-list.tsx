"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { ViewAll, FooterLink } from "./view-all";
import { PALETTE } from "./chart-theme";
import { formatNumber } from "@/lib/utils";
import type { NamedValue } from "@/lib/api";

/**
 * Horizontal proportional bars — used for both "Top Flagged Topics" and
 * "Requests by Model". Bars are sized relative to the largest value; the
 * label on the right shows count and (where available) percentage.
 */
export function BarList({
  title,
  subtitle,
  data,
  emptyTitle,
  emptyIcon,
  showPercentOfTotal = false,
  viewAllHref,
  footerHref,
  footerLabel,
}: {
  title: string;
  subtitle?: string;
  data: NamedValue[];
  emptyTitle: string;
  emptyIcon?: React.ReactNode;
  showPercentOfTotal?: boolean;
  viewAllHref?: string;
  footerHref?: string;
  footerLabel?: string;
}) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...sorted.map((d) => d.value));
  const total = sorted.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
          ) : null}
        </div>
        {viewAllHref ? <ViewAll href={viewAllHref} /> : null}
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <EmptyState icon={emptyIcon} title={emptyTitle} className="py-10" />
        ) : (
          <ul className="space-y-3.5">
            {sorted.map((d, i) => {
              const pct =
                d.percent ??
                (showPercentOfTotal && total > 0
                  ? (d.value / total) * 100
                  : null);
              return (
                <li key={d.name}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="truncate text-foreground/90">{d.name}</span>
                    <span className="ml-3 shrink-0 tabular-nums text-muted">
                      {formatNumber(d.value)}
                      {pct != null ? (
                        <span className="ml-1.5 text-muted-2">
                          {Math.round(pct)}%
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(d.value / max) * 100}%`,
                        background: PALETTE[i % PALETTE.length],
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {footerHref && footerLabel && sorted.length > 0 ? (
          <div className="mt-4 border-t border-border pt-3">
            <FooterLink href={footerHref}>{footerLabel}</FooterLink>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

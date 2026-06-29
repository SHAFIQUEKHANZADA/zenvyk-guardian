"use client";

import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ViewAll } from "./view-all";
import { CHART } from "./chart-theme";
import { formatNumber } from "@/lib/utils";
import type { UsageSummary as UsageSummaryData } from "@/lib/api";

/** Compact number: 100000000 → "100M", 31578013 → "31.6M". */
function compact(n: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function UsageSummary({
  usage,
  viewAllHref,
}: {
  usage: UsageSummaryData;
  viewAllHref?: string;
}) {
  const used = usage.used ?? 0;
  const limit = usage.limit ?? 0;
  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const hasQuota = limit > 0;

  const slices = hasQuota
    ? [
        { name: "Used", value: used, color: CHART.primary },
        { name: "Remaining", value: remaining, color: CHART.border },
      ]
    : [{ name: "n/a", value: 1, color: CHART.border }];

  const resetsOn = usage.resetsOn
    ? (() => {
        const d = new Date(usage.resetsOn);
        return Number.isNaN(d.getTime())
          ? usage.resetsOn
          : d.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
      })()
    : "—";

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Usage Summary</CardTitle>
        {viewAllHref ? <ViewAll href={viewAllHref} /> : null}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-5">
          <div className="relative h-[120px] w-[120px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  innerRadius={42}
                  outerRadius={58}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  {slices.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-semibold tabular-nums">
                {hasQuota ? `${pct}%` : "—"}
              </span>
              <span className="px-2 text-center text-[10px] text-muted">
                {hasQuota ? `of ${compact(limit)} requests` : "of quota"}
              </span>
            </div>
          </div>

          <dl className="flex-1 space-y-2.5 text-sm">
            <Row label="Requests used" value={formatNumber(usage.used)} />
            <Row
              label="Remaining"
              value={hasQuota ? formatNumber(remaining) : "—"}
            />
            <Row label="Resets on" value={resetsOn} />
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

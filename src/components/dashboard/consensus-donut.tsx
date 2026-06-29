"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { CHART, tooltipStyle } from "./chart-theme";
import type { ConsensusBreakdown } from "@/lib/api";
import { PieChart as PieIcon } from "lucide-react";

export function ConsensusDonut({ data }: { data: ConsensusBreakdown | null }) {
  const slices = data
    ? [
        { name: "Pass", legend: "Pass (3-of-5)", value: data.pass, color: CHART.pass },
        { name: "Flagged", legend: "Flagged (2-of-5)", value: data.flagged, color: CHART.flagged },
        { name: "Reject", legend: "Reject (0-1 of 5)", value: data.reject, color: CHART.blocked },
      ].filter((s) => s.value > 0)
    : [];

  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardTitle>Consensus Vote</CardTitle>
          <p className="mt-0.5 text-xs text-muted">3-of-5 model agreement</p>
        </div>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <EmptyState
            icon={<PieIcon className="h-6 w-6" />}
            title="No consensus data"
            className="h-[220px]"
          />
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative h-[180px] w-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {slices.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => `${v}%`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold tabular-nums">
                  {Math.round(slices.find((s) => s.name === "Pass")?.value ?? 0)}%
                </span>
                <span className="text-[11px] font-semibold tracking-wide text-pass">
                  PASS
                </span>
              </div>
            </div>
            <ul className="flex-1 space-y-2">
              {slices.map((s) => (
                <li key={s.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: s.color }}
                    />
                    {s.legend}
                  </span>
                  <span className="font-medium tabular-nums">
                    {total > 0 ? Math.round((s.value / total) * 100) : 0}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

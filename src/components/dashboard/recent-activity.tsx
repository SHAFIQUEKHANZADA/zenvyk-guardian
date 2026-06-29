"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { VerdictBadge } from "@/components/ui/badge";
import { ViewAll } from "./view-all";
import { formatMs } from "@/lib/utils";
import type { ActivityRow } from "@/lib/api";
import { Activity, ChevronRight } from "lucide-react";

function relTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso; // backend may send a label
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecentActivity({
  rows,
  viewAllHref,
}: {
  rows: ActivityRow[];
  viewAllHref?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        {viewAllHref ? <ViewAll href={viewAllHref} /> : null}
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-6 w-6" />}
            title="No recent verifications"
            description="Runs from the Playground and API will show up here."
            className="py-10"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-left text-xs uppercase tracking-wide text-muted-2">
                  <th className="px-5 py-2.5 font-medium">Time</th>
                  <th className="px-5 py-2.5 font-medium">Model</th>
                  <th className="px-5 py-2.5 font-medium">Request</th>
                  <th className="px-5 py-2.5 font-medium">Result</th>
                  <th className="px-5 py-2.5 font-medium">Consensus</th>
                  <th className="px-5 py-2.5 font-medium text-right">Response</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0 hover:bg-surface-2/50"
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-muted">
                      {relTime(r.time)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-foreground/90">
                      {r.model}
                    </td>
                    <td className="max-w-[280px] truncate px-5 py-3 text-muted">
                      {r.request || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <VerdictBadge verdict={r.result} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 tabular-nums text-foreground/90">
                      {r.consensus || "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-muted">
                      {formatMs(r.responseMs)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <ChevronRight className="h-4 w-4 text-muted-2" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

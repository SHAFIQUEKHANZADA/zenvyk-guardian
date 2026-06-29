"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { ViewAll, FooterLink } from "./view-all";
import { formatMs, cn } from "@/lib/utils";
import type { EndpointStatusRow } from "@/lib/api";
import { Server } from "lucide-react";

const dot: Record<EndpointStatusRow["status"], string> = {
  healthy: "bg-pass",
  degraded: "bg-flagged",
  down: "bg-blocked",
};

const label: Record<EndpointStatusRow["status"], string> = {
  healthy: "Operational",
  degraded: "Degraded",
  down: "Down",
};

const statusText: Record<EndpointStatusRow["status"], string> = {
  healthy: "text-pass",
  degraded: "text-flagged",
  down: "text-blocked",
};

export function EndpointStatus({
  rows,
  viewAllHref,
}: {
  rows: EndpointStatusRow[];
  viewAllHref?: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Endpoint Status</CardTitle>
        {viewAllHref ? <ViewAll href={viewAllHref} /> : null}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            icon={<Server className="h-6 w-6" />}
            title="No endpoints reported"
            className="py-8"
          />
        ) : (
          <>
            <ul className="space-y-4">
              {rows.map((e) => (
                <li
                  key={e.name}
                  className="flex items-start justify-between gap-3"
                >
                  <span className="flex min-w-0 items-start gap-2.5">
                    <span className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0">
                      <span
                        className={cn(
                          "absolute inline-flex h-full w-full rounded-full opacity-60",
                          e.status === "healthy" && "animate-ping",
                          dot[e.status],
                        )}
                      />
                      <span
                        className={cn(
                          "relative inline-flex h-2.5 w-2.5 rounded-full",
                          dot[e.status],
                        )}
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground/90">
                        {e.name}
                      </span>
                      {e.url ? (
                        <span className="block truncate text-xs text-muted-2">
                          {e.url}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-xs">
                    {e.latencyMs != null ? (
                      <span className="tabular-nums text-muted-2">
                        {formatMs(e.latencyMs)}
                      </span>
                    ) : null}
                    <span className={cn("font-medium", statusText[e.status])}>
                      {label[e.status]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {viewAllHref ? (
              <div className="mt-4 border-t border-border pt-3">
                <FooterLink href={viewAllHref}>Manage Endpoints</FooterLink>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

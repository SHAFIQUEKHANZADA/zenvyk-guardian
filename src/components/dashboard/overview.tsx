"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Flag,
  Ban,
  Timer,
  RefreshCw,
  PieChart as PieIcon,
  Layers,
  CalendarDays,
} from "lucide-react";
import { fetchStats, type DashboardStats } from "@/lib/api";
import { formatNumber, formatPercent, formatMs } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";
import { StatCard } from "./stat-card";
import { VerificationChart } from "./verification-chart";
import { ConsensusDonut } from "./consensus-donut";
import { BarList } from "./bar-list";
import { RecentActivity } from "./recent-activity";
import { EndpointStatus } from "./endpoint-status";
import { UsageSummary } from "./usage-summary";

function pctOf(part: number | null, total: number | null): string | undefined {
  if (part == null || total == null || total === 0) return undefined;
  return formatPercent((part / total) * 100);
}

export function Overview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await fetchStats());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Intentional fetch-on-mount; load() sets loading/error state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const t = stats?.totals;

  const requestsDelta =
    t?.requestsDeltaPct != null
      ? {
          text: `${formatPercent(Math.abs(t.requestsDeltaPct))} vs last 7 days`,
          direction: (t.requestsDeltaPct >= 0 ? "up" : "down") as "up" | "down",
          good: t.requestsDeltaPct >= 0,
        }
      : undefined;

  const avgDelta =
    t?.avgResponseDeltaMs != null
      ? {
          text: `${formatMs(Math.abs(t.avgResponseDeltaMs))} vs last 7 days`,
          direction: (t.avgResponseDeltaMs <= 0 ? "down" : "up") as "up" | "down",
          good: t.avgResponseDeltaMs <= 0, // faster is better
        }
      : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Verification Overview
          </h2>
          <p className="text-sm text-muted">
            Live metrics from the Guardian engine.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted sm:flex">
            <CalendarDays className="h-4 w-4 text-muted-2" />
            Last 7 days
          </span>
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            {loading ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Alert tone="error">
          {error}{" "}
          <span className="text-muted">
            Check that NEXT_PUBLIC_API_URL points at the Guardian backend and
            that CORS allows this origin.
          </span>
        </Alert>
      ) : null}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Total Requests"
          value={loading && !stats ? "…" : formatNumber(t?.totalRequests)}
          delta={requestsDelta}
          icon={Activity}
        />
        <StatCard
          label="Verified (Pass)"
          value={loading && !stats ? "…" : formatNumber(t?.passed)}
          sub={pctOf(t?.passed ?? null, t?.totalRequests ?? null)}
          subTone="pass"
          icon={CheckCircle2}
          tone="pass"
        />
        <StatCard
          label="Flagged"
          value={loading && !stats ? "…" : formatNumber(t?.flagged)}
          sub={pctOf(t?.flagged ?? null, t?.totalRequests ?? null)}
          subTone="flagged"
          icon={Flag}
          tone="flagged"
        />
        <StatCard
          label="Blocked"
          value={loading && !stats ? "…" : formatNumber(t?.blocked)}
          sub={pctOf(t?.blocked ?? null, t?.totalRequests ?? null)}
          subTone="blocked"
          icon={Ban}
          tone="blocked"
        />
        <StatCard
          label="Avg Response"
          value={loading && !stats ? "…" : formatMs(t?.avgResponseMs)}
          delta={avgDelta}
          icon={Timer}
        />
      </div>

      {/* Chart + consensus */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VerificationChart data={stats?.timeseries ?? []} />
        </div>
        <ConsensusDonut data={stats?.consensus ?? null} />
      </div>

      {/* Topics + models */}
      <div className="grid gap-4 lg:grid-cols-2">
        <BarList
          title="Top Flagged Topics"
          subtitle="Categories most often flagged or blocked"
          data={stats?.topics ?? []}
          emptyTitle="No flagged topics yet"
          emptyIcon={<PieIcon className="h-6 w-6" />}
          showPercentOfTotal
          viewAllHref="/dashboard/requests"
          footerHref="/dashboard/requests"
          footerLabel="View all flagged requests"
        />
        <BarList
          title="Requests by Model"
          subtitle="Verification load per model"
          data={stats?.models ?? []}
          emptyTitle="No model breakdown yet"
          emptyIcon={<Layers className="h-6 w-6" />}
          showPercentOfTotal
          viewAllHref="/dashboard/models"
        />
      </div>

      {/* Recent activity */}
      <RecentActivity rows={stats?.recent ?? []} viewAllHref="/dashboard/activity" />

      {/* Endpoint status + usage */}
      <div className="grid gap-4 lg:grid-cols-2">
        <EndpointStatus
          rows={stats?.endpoints ?? []}
          viewAllHref="/dashboard/endpoints"
        />
        <UsageSummary
          usage={stats?.usage ?? { used: null, limit: null, resetsOn: null }}
          viewAllHref="/dashboard/billing"
        />
      </div>
    </div>
  );
}

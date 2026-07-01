"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  DashboardStats,
  ActivityRow,
  Verdict,
  VerifyResult,
  TimeseriesPoint,
  NamedValue,
} from "@/lib/api";

export interface VerificationRow {
  id: string;
  prompt: string;
  verdict: Verdict;
  consensus_score: number | null;
  agreement_agree: number | null;
  agreement_total: number | null;
  response_ms: number | null;
  model: string | null;
  created_at: string;
}

/** Persist a completed verification run for the current user. Best-effort. */
export async function logVerification(
  result: VerifyResult,
  prompt: string,
  responseMs: number | null,
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("verifications").insert({
    user_id: user.id,
    prompt,
    verdict: result.verdict,
    consensus_score: result.consensusScore,
    agreement_agree: result.agreement?.agree ?? null,
    agreement_total: result.agreement?.total ?? null,
    response_ms: responseMs,
    model: result.models[0]?.name ?? null,
  });
}

/** Most recent verification runs for the current user. */
export async function fetchUserVerifications(
  limit = 100,
): Promise<VerificationRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("verifications")
    .select(
      "id, prompt, verdict, consensus_score, agreement_agree, agreement_total, response_ms, model, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as VerificationRow[]) ?? [];
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Build the dashboard view-model from a user's stored verification history. */
export function computeStatsFromVerifications(
  rows: VerificationRow[],
): DashboardStats {
  const passed = rows.filter((r) => r.verdict === "PASS").length;
  const flagged = rows.filter((r) => r.verdict === "FLAGGED").length;
  const blocked = rows.filter((r) => r.verdict === "BLOCKED").length;
  const total = rows.length;

  const latencies = rows
    .map((r) => r.response_ms)
    .filter((n): n is number => n != null);
  const avgResponseMs = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : null;

  // Timeseries grouped by day (oldest → newest).
  const byDay = new Map<string, TimeseriesPoint>();
  for (const r of [...rows].reverse()) {
    const key = dayLabel(r.created_at);
    const point =
      byDay.get(key) ?? { date: key, pass: 0, flagged: 0, blocked: 0 };
    if (r.verdict === "PASS") point.pass += 1;
    else if (r.verdict === "FLAGGED") point.flagged += 1;
    else point.blocked += 1;
    byDay.set(key, point);
  }

  // Requests by model.
  const modelMap = new Map<string, number>();
  for (const r of rows) {
    const name = r.model ?? "Consensus";
    modelMap.set(name, (modelMap.get(name) ?? 0) + 1);
  }
  const models: NamedValue[] = [...modelMap.entries()].map(([name, value]) => ({
    name,
    value,
  }));

  const recent: ActivityRow[] = rows.slice(0, 8).map((r) => ({
    time: r.created_at,
    model: r.model ?? "Consensus",
    request: r.prompt,
    result: r.verdict,
    consensus:
      r.agreement_agree != null && r.agreement_total != null
        ? `${r.agreement_agree}/${r.agreement_total}`
        : "",
    responseMs: r.response_ms,
  }));

  return {
    totals: {
      totalRequests: total,
      passed,
      flagged,
      blocked,
      avgResponseMs,
      requestsDeltaPct: null,
      avgResponseDeltaMs: null,
    },
    timeseries: [...byDay.values()],
    consensus:
      total > 0
        ? {
            pass: (passed / total) * 100,
            flagged: (flagged / total) * 100,
            reject: (blocked / total) * 100,
          }
        : null,
    topics: [],
    models,
    recent,
    endpoints: [],
    usage: { used: total, limit: null, resetsOn: null },
  };
}

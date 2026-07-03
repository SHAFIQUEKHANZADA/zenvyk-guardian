"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Radar,
  Sparkles,
  Paperclip,
  X,
  Play,
  RotateCcw,
  Check,
  Info,
  Clock,
  Coins,
  Layers,
  Cpu,
  Hash,
  ShieldCheck,
  AlertTriangle,
  Zap,
} from "lucide-react";
import {
  analyzeProject,
  executePhase,
  resumeProject,
  fetchResourceDashboard,
  type GriAnalysis,
  type GriProvider,
  type GriRisk,
  type GriVerdict,
  type GriDashboard,
  type GriExecuteResult,
} from "@/lib/api";
import { extractFileText } from "@/lib/extract-file";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Alert, Spinner } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

const DELIVERABLE_PRESETS = [
  "Slide deck",
  "Business plan",
  "Grant package",
  "Investor workbook",
  "Document",
];

const HONESTY_NOTE =
  "Guardian provider capacity — reflects Guardian's own model-key budgets and live health, NOT your personal ChatGPT/Claude subscription.";

// ── formatting helpers ──────────────────────────────────────────────────
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}
function fmtDuration(sec: number | null): string {
  if (sec == null) return "—";
  if (sec >= 3600) return `${Math.floor(sec / 3600)}h ${Math.round((sec % 3600) / 60)}m`;
  if (sec >= 60) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${sec}s`;
}
function fmtUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}
function pct(n: number): string {
  return `${Math.round(n)}%`;
}

const riskTone: Record<GriRisk, "pass" | "flagged" | "blocked"> = {
  LOW: "pass",
  MEDIUM: "flagged",
  HIGH: "blocked",
};
const toneText = {
  pass: "text-pass",
  flagged: "text-flagged",
  blocked: "text-blocked",
  default: "text-primary",
} as const;
const toneBadge = {
  pass: "border-pass/40 bg-[var(--pass-soft)] text-pass",
  flagged: "border-flagged/40 bg-[var(--flagged-soft)] text-flagged",
  blocked: "border-blocked/40 bg-[var(--blocked-soft)] text-blocked",
  default: "border-primary/40 bg-primary/10 text-primary",
} as const;

const VERDICT_LABEL: Record<GriVerdict, string> = {
  PROCEED: "Proceed",
  PHASE: "Break into phases",
  REDUCE: "Reduce scope",
  QUEUE: "Queue for reset",
  SWITCH_PROVIDER: "Switch provider",
};

// ── semicircular gauge ──────────────────────────────────────────────────
function pt(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = pt(cx, cy, r, a0);
  const [x1, y1] = pt(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

function Gauge({ value, label }: { value: number; label: string }) {
  const f = Math.max(0, Math.min(100, value)) / 100;
  const tone = value < 40 ? "pass" : value < 70 ? "flagged" : "blocked";
  const stroke =
    tone === "pass" ? "var(--pass)" : tone === "flagged" ? "var(--flagged)" : "var(--blocked)";
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 116" className="w-full max-w-[220px]">
        <path
          d={arc(100, 100, 80, 180, 360)}
          fill="none"
          stroke="currentColor"
          className="text-surface-3"
          strokeWidth={14}
          strokeLinecap="round"
        />
        <path
          d={arc(100, 100, 80, 180, 180 + f * 180)}
          fill="none"
          stroke={stroke}
          strokeWidth={14}
          strokeLinecap="round"
          style={{ transition: "all .6s ease" }}
        />
        <text
          x={100}
          y={92}
          textAnchor="middle"
          className="fill-foreground"
          style={{ fontSize: 30, fontWeight: 700 }}
        >
          {Math.round(value)}
        </text>
      </svg>
      <p className="-mt-1 text-xs font-medium text-muted">{label}</p>
    </div>
  );
}

// ── stat tile ───────────────────────────────────────────────────────────
function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
    </Card>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "pass" | "flagged" | "blocked" | "default";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase",
        toneBadge[tone],
      )}
    >
      {children}
    </span>
  );
}

// ── provider card ───────────────────────────────────────────────────────
const healthDot: Record<string, string> = {
  healthy: "bg-pass",
  degraded: "bg-flagged",
  down: "bg-blocked",
  unknown: "bg-muted-2",
};

function ProviderCard({ p, best }: { p: GriProvider; best: boolean }) {
  const tone = riskTone[p.risk];
  return (
    <Card className={cn("p-4", best && "ring-1 ring-primary/50")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", healthDot[p.health] ?? "bg-muted-2")} />
          <span className="text-sm font-semibold">{p.name}</span>
        </div>
        {best ? <Badge tone="default">Best</Badge> : <Badge tone={tone}>{p.risk}</Badge>}
      </div>

      <div className="mt-3 space-y-2">
        <BarRow label="Budget left" value={p.remaining_budget_pct} tone="pass" />
        <BarRow label="Est. needed" value={Math.min(p.est_needed_pct, 100)} tone="flagged" />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted">Completion</span>
        <span className={cn("font-semibold", toneText[tone])}>
          {pct(p.completion_probability * 100)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-2">
        <span>score {p.score.toFixed(0)}</span>
        <span>{p.latency_ms != null ? `${p.latency_ms}ms` : p.health}</span>
      </div>
    </Card>
  );
}

function BarRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "pass" | "flagged" | "blocked";
}) {
  const bar =
    tone === "pass" ? "bg-pass" : tone === "flagged" ? "bg-flagged" : "bg-blocked";
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>{label}</span>
        <span className="tabular-nums">{pct(value)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn("h-full rounded-full", bar)}
          style={{ width: `${Math.max(2, Math.min(100, value))}%`, transition: "width .5s ease" }}
        />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
export function ResourceIntelligence() {
  const searchParams = useSearchParams();
  const demo = searchParams.get("demo") === "1";

  const [prompt, setPrompt] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<{ name: string; tokens: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<GriAnalysis | null>(null);

  const [phaseState, setPhaseState] = useState<
    Record<number, { status: "idle" | "running" | "done" | "error"; result?: GriExecuteResult }>
  >({});
  const [resumeNote, setResumeNote] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<GriDashboard | null>(null);

  const loadDashboard = useCallback(() => {
    fetchResourceDashboard(demo)
      .then(setDashboard)
      .catch(() => setDashboard(null));
  }, [demo]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  function toggleChip(c: string) {
    setChips((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const res = await extractFileText(file);
    if (res.ok) {
      setAttachments((a) => [...a, { name: file.name, tokens: Math.ceil(res.text.length / 4) }]);
    } else {
      setError(res.error || "Could not read that file.");
    }
  }

  const analyze = useCallback(async () => {
    if (!prompt.trim() && !demo) return;
    setLoading(true);
    setError(null);
    setResumeNote(null);
    setPhaseState({});
    try {
      const result = await analyzeProject(
        {
          prompt: prompt.trim() || "Investor pitch deck, business plan, and grant package",
          deliverables: chips.length ? chips : undefined,
          attachments: attachments.length ? attachments : undefined,
        },
        demo,
      );
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }, [prompt, chips, attachments, demo]);

  async function runPhase(index: number) {
    if (!analysis?.project_id) return;
    setPhaseState((s) => ({ ...s, [index]: { status: "running" } }));
    try {
      const res = await executePhase(analysis.project_id, index);
      setPhaseState((s) => ({
        ...s,
        [index]: { status: res.status === "done" ? "done" : "error", result: res },
      }));
      loadDashboard();
    } catch {
      setPhaseState((s) => ({ ...s, [index]: { status: "error" } }));
    }
  }

  async function doResume() {
    if (!analysis?.project_id) return;
    try {
      const r = await resumeProject(analysis.project_id);
      setResumeNote(r.message);
      setPhaseState((s) => {
        const next = { ...s };
        for (let i = 0; i < (r.next_phase_index ?? 0); i++) {
          next[i] = next[i]?.status === "done" ? next[i] : { status: "done" };
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resume.");
    }
  }

  const rec = analysis?.recommendation;
  const phases = rec?.phases ?? null;
  const bestName = rec?.best_provider;

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Radar className="h-5 w-5 text-primary" />
            Guardian Resource Intelligence
          </h2>
          <p className="text-sm text-muted">
            A flight plan before takeoff — predict completion, phase the work, forecast cost,
            route the best model.
          </p>
        </div>
        {(demo || analysis?.presentation) && (
          <Badge tone="flagged">Presentation mode — illustrative</Badge>
        )}
      </div>

      {/* Request box */}
      <Card className="p-5">
        <label className="text-xs font-medium text-muted">Describe your project</label>
        <Textarea
          rows={3}
          placeholder="e.g. Build me an investor pitch deck, a business plan, and a grant package with market research…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="mt-2"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {DELIVERABLE_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => toggleChip(c)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                chips.includes(c)
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border bg-surface-2 text-muted hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
          <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground">
            <Paperclip className="h-3.5 w-3.5" />
            Attach
            <input
              type="file"
              accept=".txt,.md,.csv,.json,.pdf"
              className="hidden"
              onChange={onFile}
            />
          </label>
        </div>

        {attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((a, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs"
              >
                📎 {a.name} · ~{fmtTokens(a.tokens)} tok
                <button
                  onClick={() => setAttachments((x) => x.filter((_, j) => j !== i))}
                  className="text-muted-2 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-[11px] text-muted-2">
            Estimates run against your real Guardian plan quota + Guardian's provider budgets.
          </p>
          <Button onClick={analyze} disabled={loading || (!prompt.trim() && !demo)}>
            {loading ? <Spinner /> : <Sparkles className="h-4 w-4" />}
            Analyze
          </Button>
        </div>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}

      {/* Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Complexity + stat tiles */}
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <Card className="flex flex-col items-center justify-center p-5">
              <Gauge value={analysis.complexity_score} label="Complexity score" />
            </Card>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatTile icon={Hash} label="Est. tokens" value={fmtTokens(analysis.estimated_tokens)} />
              <StatTile icon={Clock} label="Runtime" value={fmtDuration(analysis.estimated_runtime_sec)} />
              <StatTile icon={Cpu} label="AI calls" value={`${analysis.estimated_ai_calls}`} />
              <StatTile icon={Layers} label="Deliverables" value={`${analysis.deliverables.length}`} />
              <StatTile icon={Coins} label="Est. cost" value={fmtUSD(analysis.estimated_cost_usd)} />
            </div>
          </div>

          {/* Recommendation panel */}
          {rec && (
            <Card className="overflow-hidden">
              <div className="border-b border-border bg-surface-2/50 px-5 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                  Guardian Recommendation
                </span>
              </div>
              <div className="grid gap-5 p-5 md:grid-cols-[1fr_240px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="default">{VERDICT_LABEL[rec.verdict]}</Badge>
                    <Badge tone={riskTone[analysis.risk]}>{analysis.risk} risk</Badge>
                    {bestName && (
                      <span className="text-xs text-muted">
                        Recommended engine:{" "}
                        <span className="font-semibold text-foreground">{bestName}</span>
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/90">{rec.message}</p>
                  {rec.alternatives.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {rec.alternatives.map((a) => (
                        <span
                          key={a}
                          className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted"
                        >
                          {VERDICT_LABEL[a as GriVerdict] ?? a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* completion probability dial */}
                <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface-2/40 p-4">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                    Completion probability
                  </span>
                  <span
                    className={cn(
                      "mt-1 text-4xl font-bold tabular-nums",
                      toneText[riskTone[analysis.risk]],
                    )}
                  >
                    {pct(analysis.completion_probability * 100)}
                  </span>
                  <span className="mt-1 text-[11px] text-muted-2">
                    on {analysis.quota.plan} plan
                    {analysis.quota.limit != null
                      ? ` · ${analysis.quota.remaining ?? 0}/${analysis.quota.limit} left`
                      : " · unlimited"}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Provider comparison */}
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <h3 className="text-sm font-semibold">Provider comparison</h3>
              <span title={HONESTY_NOTE} className="cursor-help text-muted-2">
                <Info className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {analysis.providers.map((p) => (
                <ProviderCard key={p.key} p={p} best={p.name === bestName} />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-2">{HONESTY_NOTE}</p>
          </div>

          {/* Project optimizer — phases */}
          {phases && phases.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Project optimizer — phased plan</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-2">Progress protected — never lose work</span>
                  <Button variant="secondary" size="sm" onClick={doResume} disabled={demo || !analysis.project_id}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Resume
                  </Button>
                </div>
              </div>
              {resumeNote && (
                <Alert tone="info" className="mb-3">
                  {resumeNote}
                </Alert>
              )}
              {demo && (
                <Alert tone="info" className="mb-3">
                  Execution is disabled in Presentation mode. Run a real analysis to execute phases.
                </Alert>
              )}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {phases.map((ph, i) => {
                  const st = phaseState[i]?.status ?? "idle";
                  return (
                    <Card key={i} className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{ph.name}</span>
                        {st === "done" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-pass">
                            <Check className="h-3.5 w-3.5" /> Saved
                          </span>
                        ) : st === "running" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted">
                            <Spinner className="h-3.5 w-3.5" /> Running
                          </span>
                        ) : st === "error" ? (
                          <span className="text-xs text-blocked">Failed</span>
                        ) : (
                          <span className="text-[11px] text-muted-2">Pending</span>
                        )}
                      </div>
                      <ul className="mt-2 space-y-0.5">
                        {ph.deliverables.map((d) => (
                          <li key={d} className="truncate text-xs text-foreground/80">
                            • {d}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
                        <span>{fmtDuration(ph.est_runtime_sec)}</span>
                        <span>{fmtTokens(ph.est_tokens)} tok · {ph.est_ai_calls} calls</span>
                      </div>
                      {phaseState[i]?.result?.output?.text && (
                        <p className="mt-2 line-clamp-3 rounded-md bg-surface-2 p-2 text-[11px] text-muted">
                          {phaseState[i]!.result!.output.text}
                        </p>
                      )}
                      <Button
                        size="sm"
                        variant={st === "done" ? "secondary" : "primary"}
                        className="mt-3 w-full"
                        onClick={() => runPhase(i)}
                        disabled={demo || !analysis.project_id || st === "running"}
                      >
                        {st === "running" ? (
                          <Spinner className="h-3.5 w-3.5" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        {st === "done" ? "Re-run phase" : "Run phase"}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom resource strip */}
      {dashboard && <ResourceStrip d={dashboard} />}
    </div>
  );
}

function ResourceStrip({ d }: { d: GriDashboard }) {
  const healthy = d.guardian_status.toLowerCase() === "healthy";
  const items: { label: string; value: string }[] = [
    {
      label: "Today's capacity",
      value:
        d.capacity.limit != null
          ? `${pct(d.capacity.used_pct)} of ${fmtTokens(d.capacity.limit)}`
          : "Unlimited",
    },
    { label: "Est. remaining runtime", value: fmtDuration(d.est_remaining_runtime_sec) },
    { label: "Projects in queue", value: `${d.projects_in_queue}` },
    { label: "Current engine", value: d.current_provider },
    {
      label: "Avg. completion",
      value: d.avg_completion_success != null ? pct(d.avg_completion_success * 100) : "—",
    },
  ];
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-sidebar/95 backdrop-blur lg:pl-64">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-2.5">
        {items.map((it) => (
          <div key={it.label} className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wide text-muted-2">{it.label}</span>
            <span className="text-sm font-semibold tabular-nums">{it.value}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          {healthy ? (
            <ShieldCheck className="h-4 w-4 text-pass" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-flagged" />
          )}
          <span
            className={cn(
              "text-sm font-semibold",
              healthy ? "text-pass" : "text-flagged",
            )}
          >
            {healthy ? "Guardian Healthy" : "Guardian Risk"}
          </span>
          <Zap className="h-3.5 w-3.5 text-muted-2" />
        </div>
      </div>
    </div>
  );
}

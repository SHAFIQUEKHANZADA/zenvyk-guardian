"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Check,
  X as XIcon,
  Info,
} from "lucide-react";
import {
  verifyBusiness,
  fetchKybSources,
  type KybResult,
  type KybSourceResult,
  type KybDecision,
  type BusinessInput,
  type KybSourceStatus,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, Spinner } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

const SCENARIOS = [
  { key: "clean", label: "Clean approve" },
  { key: "short", label: "Consensus short" },
  { key: "watchlist", label: "Watchlist hit" },
];

const DECISION_META: Record<
  KybDecision,
  { label: string; tone: "pass" | "flagged" | "blocked"; icon: typeof ShieldCheck }
> = {
  AUTO_APPROVE: { label: "Auto-approve", tone: "pass", icon: ShieldCheck },
  FLAG: { label: "Flag for human", tone: "flagged", icon: ShieldAlert },
  REJECT: { label: "Reject", tone: "blocked", icon: ShieldX },
};

const toneText = { pass: "text-pass", flagged: "text-flagged", blocked: "text-blocked" } as const;
const toneBadge = {
  pass: "border-pass/40 bg-[var(--pass-soft)] text-pass",
  flagged: "border-flagged/40 bg-[var(--flagged-soft)] text-flagged",
  blocked: "border-blocked/40 bg-[var(--blocked-soft)] text-blocked",
} as const;

const verdictDot: Record<string, string> = {
  AGREES: "bg-pass",
  PARTIAL: "bg-flagged",
  NO_MATCH: "bg-blocked",
  ERROR: "bg-muted-2",
};
const verdictBadge: Record<string, string> = {
  AGREES: "border-pass/40 bg-[var(--pass-soft)] text-pass",
  PARTIAL: "border-flagged/40 bg-[var(--flagged-soft)] text-flagged",
  NO_MATCH: "border-blocked/40 bg-[var(--blocked-soft)] text-blocked",
  ERROR: "border-border bg-surface-2 text-muted",
};

export function BusinessVerification() {
  const demo = useSearchParams().get("demo") === "1";

  const [biz, setBiz] = useState<BusinessInput>({
    name: "Zenvyk LLC",
    address: "123 W Example St",
    city: "Chicago",
    state: "IL",
    zip: "60601",
    ein: "12-3456789",
    website: "https://zenvyk.com",
  });
  const [scenario, setScenario] = useState("clean");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KybResult | null>(null);
  const [sourceStatus, setSourceStatus] = useState<KybSourceStatus[]>([]);

  useEffect(() => {
    fetchKybSources()
      .then(setSourceStatus)
      .catch(() => {});
  }, []);

  const set = (k: keyof BusinessInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setBiz((b) => ({ ...b, [k]: e.target.value }));

  const run = useCallback(async () => {
    if (!biz.name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await verifyBusiness(biz, scenario, demo));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }, [biz, scenario, demo]);

  const liveCount = sourceStatus.filter((s) => s.live).length;
  const allSample = sourceStatus.length > 0 && liveCount === 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          Pre-verification layer
        </p>
        <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-tight">
          <BadgeCheck className="h-5 w-5 text-primary" />
          Verify the business before any profile exists
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Five independent sources are checked in parallel. When 3 of 5 agree, the
          business is cleared for automated listing submission. Anything less routes
          to a human.
        </p>
      </div>

      {allSample && (
        <Alert tone="info">
          <span className="inline-flex items-center gap-1.5">
            <Info className="h-4 w-4" />
            Sample mode — no live KYB API keys are configured yet, so sources return
            illustrative data. Add Middesk / OpenCorporates keys to go live.
          </span>
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* Business record form */}
        <Card className="p-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Business record
          </p>
          <div className="space-y-3">
            <Field label="Legal name">
              <Input value={biz.name} onChange={set("name")} />
            </Field>
            <Field label="Address">
              <Input value={biz.address ?? ""} onChange={set("address")} />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="City">
                <Input value={biz.city ?? ""} onChange={set("city")} />
              </Field>
              <Field label="State">
                <Input value={biz.state ?? ""} onChange={set("state")} />
              </Field>
              <Field label="ZIP">
                <Input value={biz.zip ?? ""} onChange={set("zip")} />
              </Field>
            </div>
            <Field label="EIN / TIN">
              <Input value={biz.ein ?? ""} onChange={set("ein")} />
            </Field>
            <Field label="Website">
              <Input value={biz.website ?? ""} onChange={set("website")} />
            </Field>
          </div>

          {allSample && (
            <div className="mt-4">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                Demo scenario
              </p>
              <div className="flex flex-wrap gap-2">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setScenario(s.key)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      scenario === s.key
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border bg-surface-2 text-muted hover:text-foreground",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            className="mt-5 w-full"
            onClick={run}
            disabled={loading || !biz.name.trim()}
          >
            {loading ? <Spinner /> : <ShieldCheck className="h-4 w-4" />}
            Run verification
          </Button>
          {error && (
            <Alert tone="error" className="mt-3">
              {error}
            </Alert>
          )}
        </Card>

        {/* Source ledger + result */}
        <div className="space-y-4">
          <Card className="p-5">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Source ledger — queried in parallel
            </p>
            {result ? (
              <div className="space-y-2.5">
                {result.sources.map((s) => (
                  <SourceRow key={s.key} s={s} />
                ))}
                <div className="flex items-center gap-4 border-t border-border pt-4">
                  <div>
                    <p className="text-2xl font-bold tabular-nums">
                      {result.consensus.agree} / {result.consensus.total}
                    </p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-2">
                      Sources agree
                    </p>
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${(result.consensus.agree / Math.max(1, result.consensus.total)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <ShieldCheck className="mb-3 h-9 w-9 text-muted-2" />
                <p className="text-sm text-muted">
                  Enter a business and run verification to see the 5-source ledger.
                </p>
              </div>
            )}
          </Card>

          {result && <ResultPanel result={result} />}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-2">
        {label}
      </span>
      {children}
    </label>
  );
}

function fieldChips(fields: Record<string, unknown>): React.ReactNode {
  const out: React.ReactNode[] = [];
  for (const k of ["name", "address", "ein"]) {
    if (typeof fields[k] === "boolean") {
      out.push(
        <span key={k} className="inline-flex items-center gap-0.5 text-muted">
          {fields[k] ? (
            <Check className="h-3 w-3 text-pass" />
          ) : (
            <XIcon className="h-3 w-3 text-blocked" />
          )}
          {k}
        </span>,
      );
    }
  }
  if (fields.status) {
    out.push(
      <span key="status" className="text-muted">
        status={String(fields.status)}
      </span>,
    );
  }
  if (fields.watchlist) {
    const hit = String(fields.watchlist) === "hit";
    out.push(
      <span key="watchlist" className={hit ? "text-blocked" : "text-muted"}>
        watchlist={String(fields.watchlist)}
      </span>,
    );
  }
  return out;
}

function SourceRow({ s }: { s: KybSourceResult }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", verdictDot[s.verdict])} />
          <span className="text-sm font-semibold">{s.name}</span>
          <span className="text-[11px] text-muted-2">w={s.weight}</span>
          {s.mode === "sample" && (
            <span className="rounded bg-surface-3 px-1 text-[10px] text-muted-2">sample</span>
          )}
          {s.mode === "error" && (
            <span className="rounded bg-[var(--blocked-soft)] px-1 text-[10px] text-blocked">
              error
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-4 text-[11px]">
          {fieldChips(s.fields)}
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
          verdictBadge[s.verdict],
        )}
      >
        {s.verdict === "AGREES"
          ? "Agrees"
          : s.verdict === "PARTIAL"
            ? "Partial"
            : s.verdict === "NO_MATCH"
              ? "No match"
              : "Error"}
      </span>
    </div>
  );
}

function ResultPanel({ result }: { result: KybResult }) {
  const meta = DECISION_META[result.decision];
  const Icon = meta.icon;
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-surface-2/50 px-5 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
          Guardian truth layer — decision
        </span>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-[1fr_200px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase",
                toneBadge[meta.tone],
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </span>
            {result.watchlist_hit && (
              <span className="inline-flex items-center rounded-full border border-blocked/40 bg-[var(--blocked-soft)] px-2 py-0.5 text-[11px] font-semibold uppercase text-blocked">
                Watchlist hit
              </span>
            )}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">{result.message}</p>
          <p className="mt-3 text-xs text-muted">
            <span className="font-medium text-foreground/80">Next:</span> {result.next}
          </p>
          <div className="mt-4 flex gap-5">
            <Stat label="Risk score" value={`${result.risk_score}/100`} />
            <Stat label="Confidence" value={`${result.confidence}%`} />
          </div>
        </div>

        {/* Trust score + stamp */}
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface-2/40 p-4">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Trust score
          </span>
          <span className={cn("mt-1 text-4xl font-bold tabular-nums", toneText[meta.tone])}>
            {result.trust_score}
          </span>
          {result.decision === "AUTO_APPROVE" && (
            <span className="mt-3 -rotate-6 rounded-md border-2 border-pass/70 px-3 py-1 text-xs font-bold uppercase tracking-wider text-pass">
              Verified
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-2">{label}</p>
    </div>
  );
}

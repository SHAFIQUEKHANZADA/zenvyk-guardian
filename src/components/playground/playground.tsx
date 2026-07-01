"use client";

import { useEffect, useState } from "react";
import { Sparkles, ShieldCheck, Gauge } from "lucide-react";
import { verifyPrompt, type VerifyResult } from "@/lib/api";
import { logVerification } from "@/lib/verifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge, verdictTone } from "@/components/ui/badge";
import { Alert, Spinner, EmptyState } from "@/components/ui/feedback";
import { cn, formatPercent } from "@/lib/utils";

// Persist the last prompt + result so navigating away and back (or a tab
// switch that remounts the component) doesn't wipe the panel.
const STORAGE_KEY = "gd:playground";

const EXAMPLES = [
  "What is the capital of France?",
  "Write a Python function to reverse a linked list.",
  "Is it safe to mix bleach and ammonia for cleaning?",
];

const verdictRing: Record<string, string> = {
  PASS: "border-pass/40 bg-[var(--pass-soft)]",
  FLAGGED: "border-flagged/40 bg-[var(--flagged-soft)]",
  BLOCKED: "border-blocked/40 bg-[var(--blocked-soft)]",
};

export function Playground() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore persisted prompt + result on mount (sync from sessionStorage).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          prompt?: string;
          result?: VerifyResult | null;
        };
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (saved.prompt) setPrompt(saved.prompt);
        if (saved.result) setResult(saved.result);
      }
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  // Persist prompt + result whenever they change.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ prompt, result }));
    } catch {
      /* storage unavailable (private mode / quota) */
    }
  }, [prompt, result]);

  async function handleVerify() {
    if (!prompt.trim()) return;
    const cleanPrompt = prompt.trim();
    setLoading(true);
    setError(null);
    setResult(null);
    const startedAt = performance.now();
    try {
      const res = await verifyPrompt(cleanPrompt);
      const elapsed = Math.round(performance.now() - startedAt);
      setResult(res);
      // Best-effort: persist the run so it shows on the dashboard and
      // survives logout/login. Never blocks the UI on a DB error.
      logVerification(res, cleanPrompt, elapsed).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Playground</h2>
        <p className="text-sm text-muted">
          Run a prompt through the Guardian consensus engine and inspect the
          live verdict.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle>Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={8}
              placeholder="Type a prompt to verify…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  handleVerify();
                }
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">Try:</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted hover:text-foreground hover:border-border-strong transition-colors"
                >
                  {ex.length > 32 ? ex.slice(0, 32) + "…" : ex}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-2">⌘/Ctrl + Enter</span>
              <Button onClick={handleVerify} disabled={loading || !prompt.trim()}>
                {loading ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                Verify
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result */}
        <Card>
          <CardHeader>
            <CardTitle>Verdict</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? <Alert tone="error">{error}</Alert> : null}

            {!error && !result && !loading ? (
              <EmptyState
                icon={<ShieldCheck className="h-7 w-7" />}
                title="Awaiting a prompt"
                description="Submit a prompt to see the consensus verdict, agreement, and per-model breakdown."
                className="py-12"
              />
            ) : null}

            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted">
                <Spinner className="h-6 w-6" />
                <p className="text-sm">Running multi-model verification…</p>
              </div>
            ) : null}

            {result && !loading ? <VerdictView result={result} /> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VerdictView({ result }: { result: VerifyResult }) {
  return (
    <div className="space-y-5">
      {/* Big verdict banner */}
      <div
        className={cn(
          "flex items-center justify-between rounded-lg border px-4 py-4",
          verdictRing[result.verdict],
        )}
      >
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Verdict</p>
          <p
            className={cn(
              "mt-0.5 text-2xl font-bold uppercase tracking-tight",
              result.verdict === "PASS" && "text-pass",
              result.verdict === "FLAGGED" && "text-flagged",
              result.verdict === "BLOCKED" && "text-blocked",
            )}
          >
            {result.verdict}
          </p>
        </div>
        <ShieldCheck
          className={cn(
            "h-9 w-9",
            result.verdict === "PASS" && "text-pass",
            result.verdict === "FLAGGED" && "text-flagged",
            result.verdict === "BLOCKED" && "text-blocked",
          )}
        />
      </div>

      {/* Score + agreement */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Gauge className="h-3.5 w-3.5" /> Consensus score
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {result.consensusScore != null
              ? formatPercent(result.consensusScore * (result.consensusScore <= 1 ? 100 : 1))
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <p className="text-xs text-muted">Agreement</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {result.agreement
              ? `${result.agreement.agree}/${result.agreement.total}`
              : "—"}
          </p>
        </div>
      </div>

      {/* Verified response */}
      {result.verifiedResponse ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">
            Verified response
          </p>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-surface-2 p-3 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {result.verifiedResponse}
          </div>
        </div>
      ) : null}

      {/* Per-model breakdown */}
      {result.models.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium text-muted">
            Per-model breakdown
          </p>
          <ul className="space-y-2">
            {result.models.map((m, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2"
              >
                <span className="truncate text-sm text-foreground/90">
                  {m.name}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {m.score != null ? (
                    <span className="text-xs tabular-nums text-muted">
                      {formatPercent(m.score <= 1 ? m.score * 100 : m.score)}
                    </span>
                  ) : null}
                  {m.verdict ? (
                    <Badge tone={verdictTone(m.verdict)} className="uppercase">
                      {m.verdict}
                    </Badge>
                  ) : (
                    <Badge>—</Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

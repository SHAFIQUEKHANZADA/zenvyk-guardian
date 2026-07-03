/**
 * Guardian backend (FastAPI on Railway) client.
 *
 * Two endpoints matter for the MVP:
 *   GET  /stats       → powers the dashboard
 *   POST /v1/verify   → powers the playground
 *   GET  /health      → endpoint status
 *
 * The exact `/stats` JSON shape is owned by the backend and still evolving,
 * so everything here is defensive: we read loosely-typed JSON and normalise
 * it into stable view-model types. Missing fields degrade to empty states
 * rather than throwing — the UI never shows hardcoded mockup numbers.
 */

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? ""
).replace(/\/$/, "");

export type Verdict = "PASS" | "FLAGGED" | "BLOCKED";

// ── Normalised view models ──────────────────────────────────────────────

export interface StatTotals {
  totalRequests: number | null;
  passed: number | null;
  flagged: number | null;
  blocked: number | null;
  avgResponseMs: number | null;
  /** Optional period-over-period deltas (only rendered when the backend sends them). */
  requestsDeltaPct: number | null;
  avgResponseDeltaMs: number | null;
}

export interface TimeseriesPoint {
  date: string;
  pass: number;
  flagged: number;
  blocked: number;
}

export interface ConsensusBreakdown {
  pass: number; // percentage 0–100
  flagged: number;
  reject: number;
}

export interface NamedValue {
  name: string;
  value: number;
  percent?: number;
}

export interface ActivityRow {
  time: string;
  model: string;
  request: string;
  result: Verdict;
  consensus: string; // e.g. "5/5"
  responseMs: number | null;
}

export type EndpointHealth = "healthy" | "degraded" | "down";

export interface EndpointStatusRow {
  name: string;
  url?: string | null;
  status: EndpointHealth;
  latencyMs?: number | null;
}

export interface UsageSummary {
  used: number | null;
  limit: number | null;
  resetsOn: string | null;
}

export interface DashboardStats {
  totals: StatTotals;
  timeseries: TimeseriesPoint[];
  consensus: ConsensusBreakdown | null;
  topics: NamedValue[];
  models: NamedValue[];
  recent: ActivityRow[];
  endpoints: EndpointStatusRow[];
  usage: UsageSummary;
}

export interface VerifyModelResult {
  name: string;
  verdict: Verdict | null;
  score: number | null;
  response?: string | null;
}

export interface VerifyResult {
  verdict: Verdict;
  consensusScore: number | null;
  agreement: { agree: number; total: number } | null;
  verifiedResponse: string | null;
  models: VerifyModelResult[];
  raw: unknown;
}

// ── Low-level fetch helper ──────────────────────────────────────────────

class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  if (!API_URL) {
    throw new ApiError("NEXT_PUBLIC_API_URL is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    init?.timeoutMs ?? 20000,
  );

  // Build headers. If the caller didn't pass an explicit API key, fall back to
  // the logged-in user's Supabase access token so the backend can identify them
  // (the backend accepts either a Guardian API key or a Supabase login token).
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (!headers["Authorization"] && !headers["authorization"]) {
    try {
      if (typeof window !== "undefined") {
        const [{ createClient }, { isSupabaseConfigured }] = await Promise.all([
          import("@/lib/supabase/client"),
          import("@/lib/supabase/config"),
        ]);
        if (isSupabaseConfigured) {
          const { data } = await createClient().auth.getSession();
          const token = data.session?.access_token;
          if (token) headers["Authorization"] = `Bearer ${token}`;
        }
      }
    } catch {
      /* not signed in / supabase unavailable — request proceeds unauthenticated */
    }
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers,
    });

    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = await res.json();
        detail = (body?.detail || body?.message || detail) as string;
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(`Backend error (${res.status}): ${detail}`, res.status);
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request to the Guardian backend timed out.");
    }
    throw new ApiError(
      err instanceof Error ? err.message : "Failed to reach the Guardian backend.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

// ── Loose JSON helpers ──────────────────────────────────────────────────

type Loose = Record<string, unknown>;

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
}

/** Read the first present key from a loose object. */
function pick(obj: Loose | undefined, ...keys: string[]): unknown {
  if (!obj) return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function asArray(v: unknown): Loose[] {
  return Array.isArray(v) ? (v as Loose[]) : [];
}

function normalizeVerdict(v: unknown): Verdict {
  const s = String(v ?? "").toUpperCase();
  if (s.includes("BLOCK") || s.includes("REJECT")) return "BLOCKED";
  if (s.includes("FLAG") || s.includes("WARN") || s.includes("REVIEW"))
    return "FLAGGED";
  return "PASS";
}

// ── /stats normaliser ───────────────────────────────────────────────────

export function normalizeStats(raw: unknown): DashboardStats {
  const root = (raw ?? {}) as Loose;
  const totalsSrc = (pick(root, "totals", "summary") ?? root) as Loose;

  const passed = num(pick(totalsSrc, "passed", "pass", "verified", "verified_pass"));
  const flagged = num(pick(totalsSrc, "flagged"));
  const blocked = num(pick(totalsSrc, "blocked", "rejected"));
  const totalRequests =
    num(pick(totalsSrc, "total_requests", "totalRequests", "total", "requests")) ??
    ([passed, flagged, blocked].some((x) => x != null)
      ? (passed ?? 0) + (flagged ?? 0) + (blocked ?? 0)
      : null);

  const totals: StatTotals = {
    totalRequests,
    passed,
    flagged,
    blocked,
    avgResponseMs: num(
      pick(
        totalsSrc,
        "avg_response_ms",
        "avgResponseMs",
        "avg_response_time",
        "avg_latency_ms",
        "average_response_ms",
      ),
    ),
    requestsDeltaPct: num(
      pick(
        totalsSrc,
        "requests_delta_pct",
        "total_requests_delta_pct",
        "requests_change_pct",
        "requests_delta",
      ),
    ),
    avgResponseDeltaMs: num(
      pick(
        totalsSrc,
        "avg_response_delta_ms",
        "avg_latency_delta_ms",
        "response_time_delta_ms",
      ),
    ),
  };

  // Timeseries (Verification Overview)
  const timeseries: TimeseriesPoint[] = asArray(
    pick(root, "timeseries", "time_series", "overview", "verification_overview"),
  ).map((p, i) => ({
    date: String(
      pick(p, "date", "day", "label", "timestamp") ?? `Day ${i + 1}`,
    ),
    pass: num(pick(p, "pass", "passed", "verified")) ?? 0,
    flagged: num(pick(p, "flagged")) ?? 0,
    blocked: num(pick(p, "blocked", "rejected")) ?? 0,
  }));

  // Consensus donut (3-of-5)
  const consensusSrc = pick(root, "consensus", "consensus_vote") as Loose | undefined;
  let consensus: ConsensusBreakdown | null = null;
  if (consensusSrc) {
    consensus = {
      pass: num(pick(consensusSrc, "pass", "passed")) ?? 0,
      flagged: num(pick(consensusSrc, "flagged")) ?? 0,
      reject: num(pick(consensusSrc, "reject", "rejected", "blocked")) ?? 0,
    };
  }

  const topics: NamedValue[] = asArray(
    pick(root, "top_flagged_topics", "topics", "flagged_topics"),
  ).map((t) => ({
    name: String(pick(t, "name", "topic", "label") ?? "Other"),
    value: num(pick(t, "value", "count", "total")) ?? 0,
  }));

  const models: NamedValue[] = asArray(
    pick(root, "requests_by_model", "models", "by_model"),
  ).map((m) => ({
    name: String(pick(m, "name", "model", "label") ?? "Other"),
    value: num(pick(m, "value", "count", "requests", "total")) ?? 0,
    percent: num(pick(m, "percent", "percentage", "pct")) ?? undefined,
  }));

  const recent: ActivityRow[] = asArray(
    pick(root, "recent_activity", "recent", "activity"),
  ).map((r) => ({
    time: String(pick(r, "time", "timestamp", "created_at") ?? ""),
    model: String(pick(r, "model") ?? "—"),
    request: String(pick(r, "request", "prompt", "text") ?? ""),
    result: normalizeVerdict(pick(r, "result", "verdict", "status")),
    consensus: String(pick(r, "consensus", "agreement") ?? ""),
    responseMs: num(pick(r, "response_ms", "responseMs", "latency_ms")),
  }));

  const endpoints: EndpointStatusRow[] = asArray(
    pick(root, "endpoints", "endpoint_status", "services"),
  ).map((e) => {
    const statusRaw = String(pick(e, "status", "health") ?? "healthy").toLowerCase();
    const status: EndpointHealth = statusRaw.includes("down")
      ? "down"
      : statusRaw.includes("degrad") || statusRaw.includes("slow")
        ? "degraded"
        : "healthy";
    return {
      name: String(pick(e, "name", "service", "label") ?? "Endpoint"),
      url:
        (pick(e, "url", "endpoint", "host") as string | undefined) ?? null,
      status,
      latencyMs: num(pick(e, "latency_ms", "latencyMs", "response_ms")),
    };
  });

  const usageSrc = pick(root, "usage", "usage_summary", "quota") as Loose | undefined;
  const usage: UsageSummary = {
    used: num(pick(usageSrc, "used", "requests_used", "current")),
    limit: num(pick(usageSrc, "limit", "quota", "total", "max")),
    resetsOn:
      (pick(usageSrc, "resets_on", "resetsOn", "reset_at", "renews_on") as
        | string
        | undefined) ?? null,
  };

  return {
    totals,
    timeseries,
    consensus,
    topics,
    models,
    recent,
    endpoints,
    usage,
  };
}

// ── Public API ──────────────────────────────────────────────────────────

export async function fetchStats(): Promise<DashboardStats> {
  const raw = await apiFetch<unknown>("/stats", { timeoutMs: 15000 });
  return normalizeStats(raw);
}

export async function verifyPrompt(prompt: string): Promise<VerifyResult> {
  const raw = await apiFetch<Loose>("/v1/verify", {
    method: "POST",
    body: JSON.stringify({ prompt }),
    timeoutMs: 60000,
  });

  const modelsSrc = asArray(
    pick(raw, "models", "model_results", "votes", "breakdown"),
  );
  const models: VerifyModelResult[] = modelsSrc.map((m) => ({
    name: String(pick(m, "name", "model") ?? "model"),
    verdict: pick(m, "verdict", "vote", "result")
      ? normalizeVerdict(pick(m, "verdict", "vote", "result"))
      : null,
    score: num(pick(m, "score", "confidence")),
    response: (pick(m, "response", "output", "text") as string) ?? null,
  }));

  const agreeRaw = pick(raw, "agreement", "agree");
  let agreement: VerifyResult["agreement"] = null;
  if (typeof agreeRaw === "string" && agreeRaw.includes("/")) {
    const [a, t] = agreeRaw.split("/").map((s) => Number(s.trim()));
    if (!Number.isNaN(a) && !Number.isNaN(t)) agreement = { agree: a, total: t };
  } else {
    const agree = num(pick(raw, "agree", "agree_count", "votes_for"));
    const total =
      num(pick(raw, "total", "total_models", "vote_count")) ||
      (models.length || null);
    if (agree != null && total != null) agreement = { agree, total };
  }

  return {
    verdict: normalizeVerdict(pick(raw, "verdict", "result", "status")),
    consensusScore: num(
      pick(raw, "consensus_score", "consensusScore", "score", "confidence"),
    ),
    agreement,
    verifiedResponse:
      (pick(raw, "verified_response", "verifiedResponse", "response", "output") as
        | string
        | null) ?? null,
    models,
    raw,
  };
}

// ── Chat / grounded verification (Feature Prompts contract) ─────────────

export type ChatStatus = Verdict | "NEEDS_CLARIFICATION";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface Clarification {
  question: string;
  options: string[];
}

export interface SourceUsed {
  type: "url" | "document";
  ref: string;
}

export interface ChatVerifyResult {
  status: ChatStatus;
  verifiedResponse: string | null;
  consensusScore: number | null;
  agreement: { agree: number; total: number } | null;
  models: VerifyModelResult[];
  clarification: Clarification | null;
  sourceUsed: SourceUsed | null;
  raw: unknown;
}

export interface VerifyChatParams {
  prompt: string;
  messages?: ChatTurn[];
  url?: string;
  documentText?: string;
}

/** Bearer-auth header for the Guardian API key (backend requires it). */
function authHeaders(apiKey?: string | null): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

function normalizeChatStatus(v: unknown): ChatStatus {
  const s = String(v ?? "").toUpperCase();
  if (s.includes("CLARIF") || s.includes("NEEDS")) return "NEEDS_CLARIFICATION";
  return normalizeVerdict(v);
}

function parseAgreement(
  raw: Loose,
  modelCount: number,
): { agree: number; total: number } | null {
  const agreeRaw = pick(raw, "agreement", "agree");
  if (typeof agreeRaw === "string" && agreeRaw.includes("/")) {
    const [a, t] = agreeRaw.split("/").map((s) => Number(s.trim()));
    if (!Number.isNaN(a) && !Number.isNaN(t)) return { agree: a, total: t };
  }
  const agree = num(pick(raw, "agree", "agree_count", "votes_for"));
  const total =
    num(pick(raw, "total", "total_models", "vote_count")) ||
    (modelCount || null);
  return agree != null && total != null ? { agree, total } : null;
}

/** Multi-turn, optionally source-grounded verification. */
export async function verifyChat(
  params: VerifyChatParams,
  apiKey?: string | null,
): Promise<ChatVerifyResult> {
  const body: Loose = { prompt: params.prompt };
  if (params.messages?.length) body.messages = params.messages;
  if (params.url) body.url = params.url;
  if (params.documentText) body.document_text = params.documentText;

  const raw = await apiFetch<Loose>("/v1/verify", {
    method: "POST",
    body: JSON.stringify(body),
    headers: authHeaders(apiKey),
    timeoutMs: 90000,
  });

  const modelsSrc = asArray(
    pick(raw, "per_model", "models", "model_results", "votes", "breakdown"),
  );
  const models: VerifyModelResult[] = modelsSrc.map((m) => ({
    name: String(pick(m, "model", "name") ?? "model"),
    verdict:
      pick(m, "ok") !== undefined
        ? pick(m, "ok")
          ? "PASS"
          : "FLAGGED"
        : pick(m, "verdict", "vote", "result")
          ? normalizeVerdict(pick(m, "verdict", "vote", "result"))
          : null,
    score: num(pick(m, "score", "confidence")),
    response: (pick(m, "answer", "response", "output", "text") as string) ?? null,
  }));

  const clarRaw = pick(raw, "clarification") as Loose | undefined;
  const clarification: Clarification | null = clarRaw
    ? {
        question: String(pick(clarRaw, "question") ?? "Could you clarify?"),
        options: (Array.isArray(clarRaw.options)
          ? clarRaw.options
          : []) as string[],
      }
    : null;

  const srcRaw = pick(raw, "source_used", "sourceUsed") as Loose | undefined;
  const sourceUsed: SourceUsed | null = srcRaw
    ? {
        type: String(pick(srcRaw, "type") ?? "url") === "document"
          ? "document"
          : "url",
        ref: String(pick(srcRaw, "ref") ?? ""),
      }
    : null;

  return {
    status: normalizeChatStatus(pick(raw, "status", "verdict", "result")),
    verifiedResponse:
      (pick(raw, "verified_response", "verifiedResponse", "response", "output") as
        | string
        | null) ?? null,
    consensusScore: num(
      pick(raw, "consensus_score", "consensusScore", "score", "confidence"),
    ),
    agreement: parseAgreement(raw, models.length),
    models,
    clarification,
    sourceUsed,
    raw,
  };
}

export interface ExtractResult {
  ok: boolean;
  text: string;
  title?: string | null;
  error?: string | null;
}

/** Extract the main readable text from a URL (POST /v1/extract). */
export async function extractUrl(
  url: string,
  apiKey?: string | null,
): Promise<ExtractResult> {
  const raw = await apiFetch<Loose>("/v1/extract", {
    method: "POST",
    body: JSON.stringify({ url }),
    headers: authHeaders(apiKey),
    timeoutMs: 30000,
  });
  return {
    ok: Boolean(pick(raw, "ok") ?? (pick(raw, "text") ? true : false)),
    text: String(pick(raw, "text") ?? ""),
    title: (pick(raw, "title") as string | undefined) ?? null,
    error: (pick(raw, "error") as string | undefined) ?? null,
  };
}

/** List available models for the router dropdown (GET /v1/models). */
export async function fetchModels(apiKey?: string | null): Promise<string[]> {
  const raw = await apiFetch<Loose>("/v1/models", {
    headers: authHeaders(apiKey),
    timeoutMs: 15000,
  });
  const list = pick(raw, "models");
  return Array.isArray(list) ? list.map((m) => String(m)) : [];
}

/** Send content to a single chosen model (POST /v1/route). */
export async function routeContent(
  content: string,
  model: string,
  apiKey?: string | null,
): Promise<{ model: string; answer: string }> {
  const raw = await apiFetch<Loose>("/v1/route", {
    method: "POST",
    body: JSON.stringify({ content, model }),
    headers: authHeaders(apiKey),
    timeoutMs: 90000,
  });
  return {
    model: String(pick(raw, "model") ?? model),
    answer: String(pick(raw, "answer", "response", "output") ?? ""),
  };
}

// ── Guardian Resource Intelligence (GRI) ────────────────────────────────
export type GriRisk = "LOW" | "MEDIUM" | "HIGH";
export type GriVerdict =
  | "PROCEED"
  | "PHASE"
  | "REDUCE"
  | "QUEUE"
  | "SWITCH_PROVIDER";

export interface GriDeliverable {
  name: string;
  type: string;
  est_tokens: number;
  est_runtime_sec: number;
}

export interface GriQuota {
  plan: string;
  limit: number | null;
  used: number;
  remaining: number | null;
}

export interface GriProvider {
  key: string;
  name: string;
  remaining_budget_pct: number;
  est_needed_pct: number;
  completion_probability: number;
  risk: GriRisk;
  score: number;
  health: string;
  latency_ms: number | null;
}

export interface GriPhase {
  name: string;
  deliverables: string[];
  est_tokens: number;
  est_runtime_sec: number;
  est_ai_calls: number;
}

export interface GriRecommendation {
  verdict: GriVerdict;
  phases: GriPhase[] | null;
  best_provider: string;
  message: string;
  alternatives: string[];
}

export interface GriAnalysis {
  complexity_score: number;
  estimated_tokens: number;
  estimated_ai_calls: number;
  estimated_runtime_sec: number;
  estimated_cost_usd: number;
  deliverables: GriDeliverable[];
  quota: GriQuota;
  completion_probability: number;
  risk: GriRisk;
  recommendation: GriRecommendation;
  providers: GriProvider[];
  project_id: string | null;
  presentation: boolean;
}

export interface GriExecuteResult {
  project_id: string;
  phase_index: number;
  status: string;
  provider: string;
  output: { deliverables: string[]; text: string; provider: string; tokens: number };
  tokens: number;
  cost_usd: number;
  saved_at: string;
  next_phase_index: number | null;
  message: string;
}

export interface GriResumeResult {
  project_id: string;
  status: string;
  last_checkpoint: unknown;
  next_phase_index: number | null;
  next_phase: { idx: number; name: string; status: string } | null;
  completed_phases: number;
  total_phases: number;
  message: string;
}

export interface GriProviderStatus {
  providers: {
    key: string;
    name: string;
    health: string;
    latency_ms: number | null;
    remaining_budget_pct: number;
    budget_usd: number;
    spent_usd: number;
  }[];
  presentation: boolean;
}

export interface GriDashboard {
  capacity: { plan: string; used: number; limit: number | null; used_pct: number };
  est_remaining_runtime_sec: number | null;
  projects_in_queue: number;
  current_provider: string;
  avg_completion_success: number | null;
  guardian_status: string;
  risk: string;
  presentation: boolean;
}

export interface AnalyzeParams {
  prompt: string;
  deliverables?: string[];
  attachments?: { name: string; tokens?: number }[];
  history_tokens?: number;
}

const demoSuffix = (demo?: boolean) => (demo ? "?demo=1" : "");

/** Analyze a project BEFORE running it — the "flight plan before takeoff". */
export async function analyzeProject(
  params: AnalyzeParams,
  demo = false,
): Promise<GriAnalysis> {
  return apiFetch<GriAnalysis>(`/v1/resource/analyze${demoSuffix(demo)}`, {
    method: "POST",
    body: JSON.stringify(params),
    timeoutMs: 45000,
  });
}

/** Run one phase (real work) and auto-checkpoint it. */
export async function executePhase(
  projectId: string,
  phaseIndex: number,
): Promise<GriExecuteResult> {
  return apiFetch<GriExecuteResult>("/v1/project/execute", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, phase_index: phaseIndex }),
    timeoutMs: 120000,
  });
}

/** Manually save a checkpoint. */
export async function checkpointPhase(
  projectId: string,
  phaseIndex: number,
  output: unknown,
): Promise<{ saved_at: string; message: string }> {
  return apiFetch("/v1/project/checkpoint", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, phase_index: phaseIndex, output }),
  });
}

/** Resume from the last checkpoint. */
export async function resumeProject(projectId: string): Promise<GriResumeResult> {
  return apiFetch<GriResumeResult>("/v1/project/resume", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId }),
  });
}

/** Live provider health/latency + Guardian's own budget per key. */
export async function fetchProviderStatus(demo = false): Promise<GriProviderStatus> {
  return apiFetch<GriProviderStatus>(`/v1/provider/status${demoSuffix(demo)}`, {
    timeoutMs: 20000,
  });
}

/** Bottom resource strip: capacity, runtime, queue, provider, success, status. */
export async function fetchResourceDashboard(demo = false): Promise<GriDashboard> {
  return apiFetch<GriDashboard>(`/v1/resource/dashboard${demoSuffix(demo)}`, {
    timeoutMs: 15000,
  });
}

export { ApiError };

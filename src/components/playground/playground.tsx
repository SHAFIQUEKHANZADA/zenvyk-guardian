"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  SendHorizonal,
  Plus,
  ShieldCheck,
  ChevronDown,
  Link2,
  Paperclip,
  X,
  KeyRound,
} from "lucide-react";
import {
  verifyChat,
  ApiError,
  type ChatVerifyResult,
  type ChatStatus,
  type ChatTurn,
} from "@/lib/api";
import { fetchActiveApiKey } from "@/lib/api-key";
import { logVerification } from "@/lib/verifications";
import { extractFileText } from "@/lib/extract-file";
import { Button } from "@/components/ui/button";
import { Textarea, Input } from "@/components/ui/input";
import { Alert, Spinner } from "@/components/ui/feedback";
import { cn, formatPercent } from "@/lib/utils";

const STORAGE_KEY = "gd:chat";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sourceLabel?: string;
  result?: ChatVerifyResult;
}

const statusStyles: Record<
  ChatStatus,
  { badge: string; label: string }
> = {
  PASS: { badge: "border-pass/40 bg-[var(--pass-soft)] text-pass", label: "PASS" },
  FLAGGED: {
    badge: "border-flagged/40 bg-[var(--flagged-soft)] text-flagged",
    label: "FLAGGED",
  },
  BLOCKED: {
    badge: "border-blocked/40 bg-[var(--blocked-soft)] text-blocked",
    label: "BLOCKED",
  },
  NEEDS_CLARIFICATION: {
    badge: "border-sky-500/40 bg-sky-500/10 text-sky-400",
    label: "NEEDS CLARIFICATION",
  },
};

let idCounter = 0;
function newId() {
  idCounter += 1;
  return `m${idCounter}-${performance.now().toFixed(0)}`;
}

const EXAMPLES = [
  "What is the capital of France?",
  "Summarize the key risks in this document.",
  "Is it safe to mix bleach and ammonia?",
];

export function Playground() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [url, setUrl] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const [doc, setDoc] = useState<{ name: string; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyLoaded, setKeyLoaded] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch the user's API key (backend requires it) + restore prior chat.
  useEffect(() => {
    fetchActiveApiKey()
      .then((k) => setApiKey(k))
      .finally(() => setKeyLoaded(true));
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { messages?: ChatMessage[] };
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (saved.messages?.length) setMessages(saved.messages);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages }));
    } catch {
      /* ignore */
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  const send = useCallback(
    async (text: string) => {
      const prompt = text.trim();
      if (!prompt || loading) return;

      const sourceLabel = doc
        ? `📎 ${doc.name}`
        : url.trim()
          ? `🔗 ${url.trim()}`
          : undefined;

      // Prior turns become the context history for the backend.
      const history: ChatTurn[] = messages.map((m) => ({
        role: m.role,
        content: m.role === "assistant" ? m.result?.verifiedResponse || m.content : m.content,
      }));

      const userMsg: ChatMessage = {
        id: newId(),
        role: "user",
        content: prompt,
        sourceLabel,
      };
      setMessages((m) => [...m, userMsg]);
      setInput("");
      setLoading(true);
      setError(null);

      const startedAt = performance.now();
      try {
        const result = await verifyChat(
          {
            prompt,
            messages: history,
            url: url.trim() || undefined,
            documentText: doc?.text,
          },
          apiKey,
        );

        const assistant: ChatMessage = {
          id: newId(),
          role: "assistant",
          content:
            result.status === "NEEDS_CLARIFICATION"
              ? result.clarification?.question || "Could you clarify?"
              : result.verifiedResponse || "(no response)",
          result,
        };
        setMessages((m) => [...m, assistant]);

        // Persist real verdicts (not clarification prompts) to history.
        if (result.status !== "NEEDS_CLARIFICATION") {
          logVerification(
            {
              verdict:
                result.status === "PASS"
                  ? "PASS"
                  : result.status === "FLAGGED"
                    ? "FLAGGED"
                    : "BLOCKED",
              consensusScore: result.consensusScore,
              agreement: result.agreement,
              verifiedResponse: result.verifiedResponse,
              models: result.models,
              raw: result.raw,
            },
            prompt,
            Math.round(performance.now() - startedAt),
          ).catch(() => {});
        }
      } catch (err) {
        // 402 = monthly free quota used up -> show the upgrade prompt, not a raw error.
        if (err instanceof ApiError && err.status === 402) {
          setLimitReached(true);
        } else {
          setError(err instanceof Error ? err.message : "Verification failed.");
        }
      } finally {
        setLoading(false);
      }
    },
    [messages, url, doc, apiKey, loading],
  );

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    const res = await extractFileText(file);
    if (!res.ok) {
      setError(res.error || "Could not read that file.");
      return;
    }
    setDoc({ name: file.name, text: res.text });
  }

  function newChat() {
    setMessages([]);
    setError(null);
    setInput("");
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Playground</h2>
          <p className="text-sm text-muted">
            Chat with the Guardian consensus engine — every reply is verified.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={newChat} disabled={empty}>
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </div>

      {keyLoaded && !apiKey ? (
        <Alert tone="info" className="mb-3">
          <span className="inline-flex items-center gap-1.5">
            <KeyRound className="h-4 w-4" />
            You need an API key to run verifications.{" "}
            <Link
              href="/dashboard/api-keys"
              className="font-medium text-primary hover:underline"
            >
              Create one →
            </Link>
          </span>
        </Alert>
      ) : null}

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-border bg-surface p-4"
      >
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium">Start a verified conversation</p>
            <p className="mt-1 max-w-sm text-xs text-muted">
              Ask anything. Attach a link or document to verify the answer
              against a real source.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) =>
            m.role === "user" ? (
              <UserBubble key={m.id} message={m} />
            ) : (
              <AssistantBubble key={m.id} message={m} onOption={send} />
            ),
          )
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Spinner className="h-4 w-4" />
            Running multi-model verification…
          </div>
        ) : null}
      </div>

      {limitReached ? (
        <div className="mt-3 rounded-xl border border-primary/40 bg-primary/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                You&apos;ve used all 10 free verifications for today.
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Your free quota resets tomorrow — or upgrade to Pro for 100,000
                verifications/month and the full 5-model ensemble.
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex h-8 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90"
            >
              Upgrade to Pro →
            </Link>
          </div>
        </div>
      ) : null}

      {error ? (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      ) : null}

      {/* Source chips */}
      {(doc || url.trim()) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {doc ? (
            <Chip onRemove={() => setDoc(null)}>📎 {doc.name}</Chip>
          ) : null}
          {url.trim() ? (
            <Chip onRemove={() => setUrl("")}>🔗 {url.trim()}</Chip>
          ) : null}
        </div>
      )}

      {/* URL field (toggle) */}
      {showUrl ? (
        <div className="mt-3">
          <Input
            type="url"
            placeholder="Verify against a link — https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
      ) : null}

      {/* Composer */}
      <div className="mt-3 rounded-xl border border-border bg-surface-2 p-2">
        <Textarea
          rows={2}
          placeholder="Message Guardian…  (⌘/Ctrl + Enter to send)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send(input);
          }}
          className="border-0 bg-transparent focus-visible:ring-0"
        />
        <div className="flex items-center justify-between px-1 pt-1">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowUrl((s) => !s)}
              title="Verify against a link"
              className={cn(
                "rounded-lg p-2 text-muted hover:bg-surface-3 hover:text-foreground",
                showUrl && "text-primary",
              )}
            >
              <Link2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              title="Attach a document (.txt, .pdf)"
              className="rounded-lg p-2 text-muted hover:bg-surface-3 hover:text-foreground"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.csv,.json,.pdf,text/plain,application/pdf"
              className="hidden"
              onChange={onFile}
            />
          </div>
          <Button onClick={() => send(input)} disabled={loading || !input.trim()}>
            {loading ? <Spinner /> : <SendHorizonal className="h-4 w-4" />}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function Chip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-foreground/90">
      <span className="max-w-[240px] truncate">{children}</span>
      <button onClick={onRemove} className="text-muted-2 hover:text-foreground">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary/15 px-4 py-2.5 text-sm">
        <p className="whitespace-pre-wrap text-foreground">{message.content}</p>
        {message.sourceLabel ? (
          <p className="mt-1.5 truncate text-[11px] text-muted">
            {message.sourceLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function AssistantBubble({
  message,
  onOption,
}: {
  message: ChatMessage;
  onOption: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const result = message.result;
  const status: ChatStatus = result?.status ?? "PASS";
  const s = statusStyles[status];
  const isClarify = status === "NEEDS_CLARIFICATION";

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase",
              s.badge,
            )}
          >
            {s.label}
          </span>
          {/* No verification runs on a clarifying question — hide consensus/agreement. */}
          {!isClarify && result?.consensusScore != null ? (
            <span className="text-[11px] text-muted">
              consensus{" "}
              {formatPercent(
                result.consensusScore <= 1
                  ? result.consensusScore * 100
                  : result.consensusScore,
              )}
            </span>
          ) : null}
          {!isClarify && result?.agreement ? (
            <span className="text-[11px] text-muted">
              {result.agreement.agree}/{result.agreement.total} agree
            </span>
          ) : null}
        </div>

        <div className="rounded-2xl rounded-bl-sm border border-border bg-surface-2 px-4 py-3 text-sm">
          <p className="whitespace-pre-wrap text-foreground/90">
            {message.content}
          </p>

          {result?.sourceUsed?.ref ? (
            <p className="mt-2 truncate text-[11px] text-muted">
              Verified against {result.sourceUsed.type}: {result.sourceUsed.ref}
            </p>
          ) : null}

          {/* Clarifying options */}
          {isClarify && result?.clarification?.options?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {result.clarification.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => onOption(opt)}
                  className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/20"
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : null}

          {/* Per-model breakdown */}
          {result?.models?.length ? (
            <div className="mt-3 border-t border-border pt-2">
              <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1 text-[11px] font-medium text-muted hover:text-foreground"
              >
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
                />
                Per-model breakdown ({result.models.length})
              </button>
              {open ? (
                <ul className="mt-2 space-y-1.5">
                  {result.models.map((mm, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="truncate text-foreground/80">{mm.name}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                          mm.verdict === "PASS"
                            ? "text-pass"
                            : mm.verdict === "BLOCKED"
                              ? "text-blocked"
                              : "text-flagged",
                        )}
                      >
                        {mm.verdict ?? "—"}
                        {mm.score != null
                          ? ` · ${formatPercent(mm.score <= 1 ? mm.score * 100 : mm.score)}`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

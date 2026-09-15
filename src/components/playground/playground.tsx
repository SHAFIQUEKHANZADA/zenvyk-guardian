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
  MessageSquare,
  Trash2,
  PanelLeft,
} from "lucide-react";
import {
  submitVerifyJob,
  fetchVerifyJob,
  ApiError,
  type ChatVerifyResult,
  type ChatStatus,
  type ChatTurn,
} from "@/lib/api";
import { fetchActiveApiKey } from "@/lib/api-key";
import { logVerification } from "@/lib/verifications";
import { extractFileText } from "@/lib/extract-file";
import {
  listConversations,
  getConversationMessages,
  upsertConversation,
  deleteConversation,
  titleFromMessages,
  type ConversationSummary,
} from "@/lib/conversations";
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
  // Background-job state: an assistant reply still being verified server-side.
  pending?: boolean;
  jobId?: string;
  // Transient bookkeeping so a resolved background job can be logged.
  prompt?: string;
  startedAt?: number;
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

/** The bubble text to show for a finished (or clarifying) verification. */
function contentForResult(result: ChatVerifyResult): string {
  return result.status === "NEEDS_CLARIFICATION"
    ? result.clarification?.question || "Could you clarify?"
    : result.verifiedResponse || "(no response)";
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

  // Chat history (persisted per-user in Supabase).
  const [history, setHistory] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false); // mobile drawer
  const convIdRef = useRef<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Latest API key + messages, readable from long-lived pollers without stale closures.
  const apiKeyRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  // Job ids we're already polling, so we never double-poll the same job.
  const pollersRef = useRef<Set<string>>(new Set());
  // Serialise Supabase writes so a fast job can't create a duplicate row.
  const persistChain = useRef<Promise<unknown>>(Promise.resolve());

  // Keep the value-refs fresh (after each render) for the long-lived pollers.
  useEffect(() => {
    apiKeyRef.current = apiKey;
    messagesRef.current = messages;
  });

  // Auto-grow the composer with its content (up to a max height).
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [input]);

  const refreshHistory = useCallback(() => {
    listConversations()
      .then(setHistory)
      .catch(() => {});
  }, []);

  // Fetch the user's API key + restore the in-tab chat + load history list.
  useEffect(() => {
    fetchActiveApiKey()
      .then((k) => setApiKey(k))
      .finally(() => setKeyLoaded(true));
    refreshHistory();
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { messages?: ChatMessage[]; convId?: string | null };
        if (saved.messages?.length) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setMessages(saved.messages); // a pending reply is resumed by the effect below
        }
        if (saved.convId) {
          convIdRef.current = saved.convId;
          setActiveId(saved.convId);
        }
      }
    } catch {
      /* ignore */
    }
  }, [refreshHistory]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messages, convId: convIdRef.current }),
      );
    } catch {
      /* ignore */
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  // Save/refresh the conversation in Supabase after each exchange.
  const persist = useCallback(
    (msgs: ChatMessage[]) => {
      // Chain writes so a create (id === null) settles before the next update,
      // otherwise a fast background job could insert a second conversation row.
      persistChain.current = persistChain.current
        .then(async () => {
          if (!msgs.length) return;
          // Drop transient bookkeeping; keep pending/jobId so a reload can resume.
          const clean = msgs.map((m) => {
            const copy = { ...m };
            delete copy.prompt;
            delete copy.startedAt;
            return copy;
          });
          const id = await upsertConversation(
            convIdRef.current,
            titleFromMessages(clean),
            clean,
          );
          if (id) {
            if (convIdRef.current !== id) {
              convIdRef.current = id;
              setActiveId(id);
            }
            refreshHistory();
          }
        })
        .catch(() => {});
      return persistChain.current;
    },
    [refreshHistory],
  );

  const openConversation = useCallback(
    async (id: string) => {
      const msgs = await getConversationMessages<ChatMessage>(id);
      if (msgs) {
        setMessages(msgs);
        convIdRef.current = id;
        setActiveId(id);
        setError(null);
        setLimitReached(false);
        setShowHistory(false);
        // A reply may have finished while this chat was closed — the effect that
        // watches `messages` will resume polling any still-pending replies.
      }
    },
    [],
  );

  const removeConversation = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      await deleteConversation(id);
      if (convIdRef.current === id) {
        setMessages([]);
        convIdRef.current = null;
        setActiveId(null);
      }
      refreshHistory();
    },
    [refreshHistory],
  );

  // Apply a finished background result to its placeholder bubble + persist + log.
  const applyResult = useCallback(
    (assistantId: string, result: ChatVerifyResult) => {
      const target = messagesRef.current.find((m) => m.id === assistantId);
      if (!target) return;
      const next = messagesRef.current.map((m) =>
        m.id === assistantId
          ? {
              ...m,
              pending: false,
              jobId: undefined,
              content: contentForResult(result),
              result,
            }
          : m,
      );
      setMessages(next);
      void persist(next);

      // Log real verdicts (not clarifying questions) to the dashboard history.
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
          target.prompt || target.content,
          target.startedAt ? Math.round(performance.now() - target.startedAt) : 0,
        ).catch(() => {});
      }
    },
    [persist],
  );

  // A background job failed / was lost: drop the placeholder, show the error.
  const applyError = useCallback(
    (assistantId: string, message: string) => {
      const next = messagesRef.current.filter((m) => m.id !== assistantId);
      setMessages(next);
      void persist(next);
      setError(message);
    },
    [persist],
  );

  // Poll one background job until it finishes, then update its bubble.
  const pollJob = useCallback(
    (jobId: string, assistantId: string) => {
      if (pollersRef.current.has(jobId)) return; // already polling this job
      pollersRef.current.add(jobId);
      let tries = 0;
      const stop = () => pollersRef.current.delete(jobId);

      const tick = async () => {
        tries += 1;
        // Bubble gone (new chat / deleted / already resolved) → stop quietly.
        const stillPending = messagesRef.current.some(
          (m) => m.id === assistantId && m.pending,
        );
        if (!stillPending) return stop();

        try {
          const job = await fetchVerifyJob(jobId, apiKeyRef.current);
          if (job.status === "done" && job.result) {
            stop();
            return applyResult(assistantId, job.result);
          }
          if (job.status === "error") {
            stop();
            return applyError(
              assistantId,
              job.error || "Verification didn't complete. Please try again.",
            );
          }
        } catch (err) {
          // A 404 after a few tries means the job was lost (e.g. server restart).
          if (err instanceof ApiError && err.status === 404 && tries >= 3) {
            stop();
            return applyError(
              assistantId,
              "That verification didn't finish — please try again.",
            );
          }
          // Otherwise it's transient (network blip / not yet visible) → keep trying.
        }

        if (tries >= 150) {
          // ~5 minutes at 2s — give up gracefully.
          stop();
          return applyError(
            assistantId,
            "This is taking longer than usual — please try again.",
          );
        }
        window.setTimeout(tick, 2000);
      };

      window.setTimeout(tick, 1500);
    },
    [applyResult, applyError],
  );

  // On load / when opening a chat, resume polling any still-pending replies.
  const resumePending = useCallback(
    (msgs: ChatMessage[]) => {
      msgs.forEach((m) => {
        if (m.role === "assistant" && m.pending && m.jobId) {
          pollJob(m.jobId, m.id);
        }
      });
    },
    [pollJob],
  );

  // Whenever messages change (restore, open a chat, new reply), make sure every
  // still-pending reply has a poller. pollJob dedupes, so this is idempotent.
  useEffect(() => {
    resumePending(messages);
  }, [messages, resumePending]);

  // Busy = a submit is in flight, or a background reply is still verifying.
  const busy = loading || messages.some((m) => m.pending);

  const send = useCallback(
    async (text: string) => {
      const prompt = text.trim();
      if (!prompt || busy) return;

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
      const assistantId = newId();
      const pendingMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        pending: true,
        prompt,
        startedAt: performance.now(),
      };
      const optimistic = [...messages, userMsg, pendingMsg];
      setMessages(optimistic);
      setInput("");
      setLoading(true);
      setError(null);

      try {
        const submit = await submitVerifyJob(
          {
            prompt,
            messages: history,
            url: url.trim() || undefined,
            documentText: doc?.text,
          },
          apiKey,
        );

        if (submit.jobId) {
          // Running server-side: attach the job id + save NOW so leaving is safe.
          const withJob = optimistic.map((m) =>
            m.id === assistantId ? { ...m, jobId: submit.jobId! } : m,
          );
          setMessages(withJob);
          void persist(withJob);
          pollJob(submit.jobId, assistantId);
        } else if (submit.result) {
          // Answered inline (a first-turn clarifying question) — no background job.
          const resolved = optimistic.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  pending: false,
                  content: contentForResult(submit.result!),
                  result: submit.result!,
                }
              : m,
          );
          setMessages(resolved);
          void persist(resolved);
        }
      } catch (err) {
        // Drop the placeholder; surface the failure.
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        if (err instanceof ApiError && err.status === 402) {
          // Free daily quota used up → show the upgrade prompt, not a raw error.
          setLimitReached(true);
        } else {
          setError(err instanceof Error ? err.message : "Verification failed.");
        }
      } finally {
        setLoading(false);
      }
    },
    [messages, url, doc, apiKey, busy, persist, pollJob],
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
    setLimitReached(false);
    convIdRef.current = null;
    setActiveId(null);
    setShowHistory(false);
  }

  const empty = messages.length === 0;

  return (
    <div className="relative flex h-[calc(100vh-7rem)] gap-5">
      {/* Chat history — desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col md:flex">
        <ChatHistoryList
          history={history}
          activeId={activeId}
          onNew={newChat}
          onOpen={openConversation}
          onDelete={removeConversation}
        />
      </aside>

      {/* Chat history — mobile drawer */}
      {showHistory ? (
        <div className="absolute inset-0 z-30 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowHistory(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-sidebar p-3 shadow-xl">
            <ChatHistoryList
              history={history}
              activeId={activeId}
              onNew={newChat}
              onOpen={openConversation}
              onDelete={removeConversation}
            />
          </div>
        </div>
      ) : null}

      {/* Chat column */}
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
        {/* Slim top bar (topbar already shows the "Playground" title) */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(true)}
              title="Chat history"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground md:hidden"
            >
              <PanelLeft className="h-[18px] w-[18px]" />
            </button>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Every reply is cross-checked by the consensus engine
            </span>
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

      {/* Messages — open, chat-style column */}
      <div
        ref={listRef}
        className="flex-1 space-y-6 overflow-y-auto scroll-smooth px-1 py-2"
      >
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
              <ShieldCheck className="h-7 w-7" />
            </span>
            <h3 className="text-lg font-semibold tracking-tight">
              Start a verified conversation
            </h3>
            <p className="mt-1.5 max-w-md text-sm text-muted">
              Ask anything — every answer is cross-checked by 5 models. Attach a
              link or document to verify against a real source.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs text-foreground/80 transition-colors hover:border-primary/40 hover:text-foreground"
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

      {/* Composer — large, auto-growing */}
      <div className="mt-3 rounded-2xl border border-border bg-surface-2 p-3 shadow-sm transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
        <Textarea
          ref={taRef}
          rows={1}
          placeholder="Message Guardian…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!busy) send(input);
            }
          }}
          className="max-h-[220px] min-h-[52px] resize-none border-0 bg-transparent px-1.5 text-[15px] leading-relaxed focus-visible:ring-0"
        />
        <div className="flex items-center justify-between px-0.5 pt-1.5">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowUrl((s) => !s)}
              title="Verify against a link"
              className={cn(
                "rounded-lg p-2 text-muted transition-colors hover:bg-surface-3 hover:text-foreground",
                showUrl && "bg-primary/10 text-primary",
              )}
            >
              <Link2 className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              title="Attach a document (.txt, .pdf)"
              className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-3 hover:text-foreground"
            >
              <Paperclip className="h-[18px] w-[18px]" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.csv,.json,.pdf,text/plain,application/pdf"
              className="hidden"
              onChange={onFile}
            />
            <span className="ml-1 hidden text-[11px] text-muted-2 sm:inline">
              Enter to send · Shift+Enter for a new line
            </span>
          </div>
          <Button
            size="md"
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
          >
            {busy ? <Spinner /> : <SendHorizonal className="h-4 w-4" />}
            Send
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}

function ChatHistoryList({
  history,
  activeId,
  onNew,
  onOpen,
  onDelete,
}: {
  history: ConversationSummary[];
  activeId: string | null;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}) {
  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="mb-3 w-full justify-start"
        onClick={onNew}
      >
        <Plus className="h-4 w-4" />
        New chat
      </Button>
      <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-2">
        Recent chats
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {history.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-2">
            No saved chats yet — your conversations will appear here.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {history.map((c) => (
              <li key={c.id}>
                <div
                  className={cn(
                    "group flex items-center gap-1 rounded-lg pr-1 transition-colors",
                    activeId === c.id ? "bg-primary/12" : "hover:bg-surface-2",
                  )}
                >
                  <button
                    onClick={() => onOpen(c.id)}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm",
                      activeId === c.id ? "text-foreground" : "text-muted",
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-2" />
                    <span className="truncate">{c.title}</span>
                  </button>
                  <button
                    onClick={(e) => onDelete(e, c.id)}
                    title="Delete chat"
                    className="hidden shrink-0 rounded p-1.5 text-muted-2 hover:text-blocked group-hover:block"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
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
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary/15 px-4 py-3 text-[15px] leading-relaxed">
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

  // Reply still being verified server-side — safe to leave and come back.
  if (message.pending) {
    return (
      <div className="flex justify-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-primary ring-1 ring-border">
          <ShieldCheck className="h-[18px] w-[18px]" />
        </span>
        <div className="max-w-[85%]">
          <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
            <Spinner className="h-4 w-4" />
            <span className="animate-pulse">
              Verifying in the background — you can leave this page and come back.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-primary ring-1 ring-border">
        <ShieldCheck className="h-[18px] w-[18px]" />
      </span>
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

        <div className="rounded-2xl rounded-bl-md border border-border bg-surface-2 px-4 py-3 text-[15px] leading-relaxed">
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

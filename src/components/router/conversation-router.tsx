"use client";

import { useEffect, useState } from "react";
import { Link2, Sparkles, Download } from "lucide-react";
import { extractUrl, fetchModels, routeContent } from "@/lib/api";
import { fetchActiveApiKey } from "@/lib/api-key";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, Spinner, EmptyState } from "@/components/ui/feedback";

export function ConversationRouter() {
  const [apiKey, setApiKey] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState("");
  const [sending, setSending] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveApiKey().then((k) => {
      setApiKey(k);
      fetchModels(k)
        .then((list) => {
          setModels(list);
          if (list.length) setModel(list[0]);
        })
        .catch(() => setModels([]));
    });
  }, []);

  async function handleExtract() {
    if (!url.trim()) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const res = await extractUrl(url.trim(), apiKey);
      if (res.ok && res.text) {
        setContent(res.text);
      } else {
        setExtractError(
          res.error ||
            "Couldn't read that link (many chat share links block scraping). Paste the raw text below instead.",
        );
      }
    } catch (err) {
      setExtractError(
        (err instanceof Error ? err.message : "Extraction failed.") +
          " — paste the raw text below instead.",
      );
    } finally {
      setExtracting(false);
    }
  }

  async function handleSend() {
    if (!content.trim() || !model) return;
    setSending(true);
    setRouteError(null);
    setAnswer(null);
    try {
      const res = await routeContent(content.trim(), model, apiKey);
      setAnswer(res.answer);
    } catch (err) {
      setRouteError(err instanceof Error ? err.message : "Routing failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Conversation Router
        </h2>
        <p className="text-sm text-muted">
          Pull a conversation from a link (or paste it), then route it to the
          model of your choice.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: extract + content */}
        <Card>
          <CardHeader>
            <CardTitle>1 · Get the conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="Paste a link — https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={handleExtract}
                disabled={extracting || !url.trim()}
              >
                {extracting ? <Spinner /> : <Download className="h-4 w-4" />}
                Extract
              </Button>
            </div>

            {extractError ? <Alert tone="error">{extractError}</Alert> : null}

            <Textarea
              rows={12}
              placeholder="Extracted text appears here — or paste the raw conversation directly."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <p className="text-[11px] text-muted-2">
              Tip: ChatGPT / Grok share links are usually JavaScript-rendered and
              block scraping — if extraction fails, just paste the text.
            </p>
          </CardContent>
        </Card>

        {/* Right: route to a model */}
        <Card>
          <CardHeader>
            <CardTitle>2 · Route to a model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="h-10 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
              >
                {models.length === 0 ? (
                  <option value="">No models available</option>
                ) : (
                  models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))
                )}
              </select>
              <Button
                onClick={handleSend}
                disabled={sending || !content.trim() || !model}
              >
                {sending ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                Send
              </Button>
            </div>

            {routeError ? <Alert tone="error">{routeError}</Alert> : null}

            {answer != null ? (
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="mb-1 text-[11px] font-medium text-muted">
                  {model}
                </p>
                <p className="whitespace-pre-wrap text-sm text-foreground/90">
                  {answer}
                </p>
              </div>
            ) : !sending ? (
              <EmptyState
                icon={<Link2 className="h-6 w-6" />}
                title="No answer yet"
                description="Extract or paste a conversation, pick a model, and hit Send."
                className="py-8"
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

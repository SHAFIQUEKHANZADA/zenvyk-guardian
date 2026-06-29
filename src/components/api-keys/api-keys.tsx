"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  Ban,
  TriangleAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { generateApiKey, maskKey } from "@/lib/keys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, EmptyState, Spinner } from "@/components/ui/feedback";

interface ApiKeyRow {
  id: string;
  name: string | null;
  key: string;
  created_at: string;
  revoked: boolean;
}

export function ApiKeys() {
  const [rows, setRows] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, key, created_at, revoked")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data as ApiKeyRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Intentional fetch-on-mount; load() sets loading/error state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleCreate() {
    setError(null);
    setCreating(true);
    const newKey = generateApiKey();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be signed in to create a key.");
      setCreating(false);
      return;
    }
    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: user.id,
        key: newKey,
        name: name.trim() || "Default key",
      })
      .select("id, name, key, created_at, revoked")
      .single();

    if (error) {
      setError(error.message);
    } else {
      setFreshKey(newKey);
      setRows((r) => [data as ApiKeyRow, ...r]);
      setName("");
    }
    setCreating(false);
  }

  async function handleRevoke(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked: true })
      .eq("id", id);
    if (error) setError(error.message);
    else
      setRows((r) =>
        r.map((row) => (row.id === id ? { ...row, revoked: true } : row)),
      );
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (error) setError(error.message);
    else setRows((r) => r.filter((row) => row.id !== id));
  }

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">API Keys</h2>
        <p className="text-sm text-muted">
          Authenticate requests to the Guardian API. Keep your keys secret.
        </p>
      </div>

      {!isSupabaseConfigured ? (
        <Alert tone="info">
          Supabase isn&apos;t configured, so keys can&apos;t be stored yet. Add
          your Supabase env vars to enable key management.
        </Alert>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}

      {/* Newly created key — shown once */}
      {freshKey ? (
        <Card className="border-primary/40">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <TriangleAlert className="h-4 w-4 text-flagged" />
              Copy your key now — you won&apos;t be able to see it again.
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm">
                {freshKey}
              </code>
              <Button variant="secondary" size="sm" onClick={() => copyKey(freshKey)}>
                {copied ? (
                  <Check className="h-4 w-4 text-pass" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFreshKey(null)}
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Create */}
      <Card>
        <CardHeader>
          <CardTitle>Generate a new key</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Key name (e.g. Production)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isSupabaseConfigured || creating}
            />
            <Button
              onClick={handleCreate}
              disabled={!isSupabaseConfigured || creating}
            >
              {creating ? <Spinner /> : <Plus className="h-4 w-4" />}
              Generate Key
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Your keys</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted">
              <Spinner /> Loading keys…
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<KeyRound className="h-6 w-6" />}
              title="No API keys yet"
              description="Generate your first key to start calling the Guardian API."
              className="py-10"
            />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {row.name || "Untitled key"}
                      </p>
                      {row.revoked ? (
                        <Badge tone="blocked">Revoked</Badge>
                      ) : (
                        <Badge tone="pass">Active</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-muted">
                      {maskKey(row.key)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-2">
                      Created{" "}
                      {new Date(row.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!row.revoked ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(row.id)}
                        title="Revoke key"
                      >
                        <Ban className="h-4 w-4" />
                        Revoke
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(row.id)}
                      title="Delete key"
                      className="text-muted hover:text-blocked"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

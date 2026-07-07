"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Per-user Playground chat history, persisted in Supabase (RLS-scoped to the
 * signed-in user). Every function is best-effort: if Supabase isn't configured
 * or the user isn't signed in, it degrades to a no-op so the Playground still
 * works as a single ephemeral chat.
 */

export interface ConversationSummary {
  id: string;
  title: string;
  updated_at: string;
}

const TITLE_MAX = 60;

export function titleFromMessages(messages: { role: string; content: string }[]): string {
  const firstUser = messages.find((m) => m.role === "user" && m.content?.trim());
  const text = (firstUser?.content ?? "New chat").trim().replace(/\s+/g, " ");
  return text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX)}…` : text;
}

/** Most recent conversations for the current user (for the history list). */
export async function listConversations(limit = 50): Promise<ConversationSummary[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data as ConversationSummary[]) ?? [];
}

/** Load one conversation's messages (returns null if missing/not yours). */
export async function getConversationMessages<T = unknown>(
  id: string,
): Promise<T[] | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("messages")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return (data.messages as T[]) ?? [];
}

/**
 * Create (id === null) or update a conversation. Returns the row id so the
 * caller can keep updating the same conversation as the chat continues.
 */
export async function upsertConversation(
  id: string | null,
  title: string,
  messages: unknown,
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (id) {
    const { error } = await supabase
      .from("conversations")
      .update({ title, messages, updated_at: new Date().toISOString() })
      .eq("id", id);
    return error ? null : id;
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: user.id, title, messages })
    .select("id")
    .single();
  return error ? null : (data?.id ?? null);
}

export async function deleteConversation(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const supabase = createClient();
  await supabase.from("conversations").delete().eq("id", id);
}

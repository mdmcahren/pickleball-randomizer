import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Player, Session, Match } from "./types";

// Lazy singleton — avoids throwing at module evaluation during SSR/build
// when env vars haven't been set yet.
let _client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars. Copy .env.local.example → .env.local and add your project URL + anon key."
    );
  }
  _client = createClient(url, key);
  return _client;
}

// ── Players ───────────────────────────────────────────────────────────────────

export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await db()
    .from("players")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function addPlayer(name: string): Promise<Player> {
  const { data, error } = await db()
    .from("players")
    .insert({ name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlayer(id: string): Promise<void> {
  const { error } = await db().from("players").delete().eq("id", id);
  if (error) throw error;
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function getSessions(): Promise<Session[]> {
  const { data, error } = await db()
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSession(id: string): Promise<Session> {
  const { data, error } = await db()
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createSession(
  session: Omit<Session, "id" | "created_at">
): Promise<Session> {
  const { data, error } = await db()
    .from("sessions")
    .insert(session)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Matches ───────────────────────────────────────────────────────────────────

export async function getMatchesForSession(sessionId: string): Promise<Match[]> {
  const { data, error } = await db()
    .from("matches")
    .select("*")
    .eq("session_id", sessionId)
    .order("game_number")
    .order("court_number");
  if (error) throw error;
  return data ?? [];
}

export async function bulkInsertMatches(
  matches: Omit<Match, "id">[]
): Promise<void> {
  if (matches.length === 0) return;
  const { error } = await db().from("matches").insert(matches);
  if (error) throw error;
}

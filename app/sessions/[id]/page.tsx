"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Coffee,
  ShieldCheck,
  Shuffle,
  Trophy,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { getSession, getMatchesForSession, getPlayers } from "@/lib/supabase";
import { computeStats } from "@/lib/matchmaking";
import type { Session, Match, Player, GameRound, CourtAssignment } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionData {
  session: Session;
  matches: Match[];
  players: Player[];
}

// ── Build GameRound[] from flat matches ───────────────────────────────────────

function buildGameRounds(
  session: Session,
  matches: Match[],
  playerIds: string[]
): GameRound[] {
  const maxGame = Math.max(...matches.map((m) => m.game_number), 0);
  const rounds: GameRound[] = [];

  for (let g = 1; g <= maxGame; g++) {
    const gameMatches = matches.filter((m) => m.game_number === g);
    const playingIds = new Set(
      gameMatches.flatMap((m) => [
        m.team_a_player1,
        m.team_a_player2,
        m.team_b_player1,
        m.team_b_player2,
      ])
    );

    const courts: CourtAssignment[] = gameMatches.map((m) => ({
      courtNumber: m.court_number,
      teamA: [m.team_a_player1, m.team_a_player2],
      teamB: [m.team_b_player1, m.team_b_player2],
    }));

    courts.sort((a, b) => a.courtNumber - b.courtNumber);

    const restingPlayerIds = playerIds.filter((id) => !playingIds.has(id));

    rounds.push({ gameNumber: g, courts, restingPlayerIds });
  }

  return rounds;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const COURT_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-800", header: "bg-blue-100" },
  { bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-800", header: "bg-purple-100" },
  { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-800", header: "bg-amber-100" },
  { bg: "bg-pink-50", border: "border-pink-200", badge: "bg-pink-100 text-pink-800", header: "bg-pink-100" },
];

function CourtCard({
  court,
  getName,
}: {
  court: CourtAssignment;
  getName: (id: string) => string;
}) {
  const c = COURT_COLORS[(court.courtNumber - 1) % COURT_COLORS.length];
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden`}>
      <div className={`${c.header} px-4 py-2 flex items-center justify-between`}>
        <span className="font-bold text-sm">Court {court.courtNumber}</span>
        <span className="text-xs text-muted-foreground">vs</span>
      </div>
      <div className="divide-y divide-dashed divide-border">
        {[
          { label: "Team A", players: court.teamA },
          { label: "Team B", players: court.teamB },
        ].map(({ label, players }) => (
          <div key={label} className="px-4 py-3">
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              {label}
            </div>
            <div className="space-y-1.5">
              {players.map((id) => (
                <div key={id} className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-xs ${c.badge}`}
                  >
                    {getName(id).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{getName(id)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GameCard({
  round,
  getName,
  defaultOpen,
}: {
  round: GameRound;
  getName: (id: string) => string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 text-green-800 font-bold flex items-center justify-center text-sm">
            {round.gameNumber}
          </div>
          <span className="font-semibold">Game {round.gameNumber}</span>
          <Badge variant="secondary" className="text-xs">
            {round.courts.length} court{round.courts.length !== 1 ? "s" : ""}
          </Badge>
          {round.restingPlayerIds.length > 0 && (
            <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
              <Coffee size={10} className="mr-1" />
              {round.restingPlayerIds.length} resting
            </Badge>
          )}
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="px-5 pb-5">
          <Separator className="mb-4" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {round.courts.map((court) => (
              <CourtCard key={court.courtNumber} court={court} getName={getName} />
            ))}
          </div>

          {round.restingPlayerIds.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Coffee size={14} className="text-amber-600" />
              <span className="text-xs font-medium text-muted-foreground">
                Resting:
              </span>
              {round.restingPlayerIds.map((id) => (
                <Badge key={id} variant="outline" className="text-xs">
                  {getName(id)}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [session, matches, players] = await Promise.all([
          getSession(id),
          getMatchesForSession(id),
          getPlayers(),
        ]);
        setData({ session, matches, players });
      } catch (err) {
        toast.error("Failed to load session.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        Loading schedule…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        Session not found.
      </div>
    );
  }

  const { session, matches, players } = data;
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const getName = (id: string) => playerMap.get(id)?.name ?? id.slice(0, 6);

  const sessionPlayerIds = session.player_ids as string[];
  const rounds = buildGameRounds(session, matches, sessionPlayerIds);
  const stats = computeStats(rounds, sessionPlayerIds);

  const sessionDate = new Date(session.created_at).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <Link
            href="/sessions"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 mb-2 text-muted-foreground"
            )}
          >
            <ArrowLeft size={14} className="mr-1" />
            All Sessions
          </Link>
          <h1 className="text-2xl font-bold">{sessionDate}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="secondary">
              {session.total_games} game{session.total_games !== 1 ? "s" : ""}
            </Badge>
            <Badge variant="secondary">
              {session.total_courts} court{session.total_courts !== 1 ? "s" : ""}
            </Badge>
            <Badge variant="secondary">
              {sessionPlayerIds.length} players
            </Badge>
            {session.fixed_partnerships ? (
              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                <ShieldCheck size={11} className="mr-1" />
                Fixed Pairs
              </Badge>
            ) : (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                <Shuffle size={11} className="mr-1" />
                Randomised
              </Badge>
            )}
          </div>
        </div>

        <Link
          href="/sessions/new"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
        >
          New Session
        </Link>
      </div>

      {/* Fixed partnerships pair legend */}
      {session.fixed_partnerships && session.pairs && (
        <div className="mb-6 rounded-xl border bg-purple-50 border-purple-200 p-4">
          <div className="font-semibold text-purple-800 text-sm mb-3 flex items-center gap-1.5">
            <ShieldCheck size={14} />
            Fixed Pairs This Session
          </div>
          <div className="flex flex-wrap gap-2">
            {(session.pairs as [string, string][]).map((pair, i) => (
              <div
                key={i}
                className="bg-white border border-purple-200 rounded-full px-3 py-1 text-xs font-medium text-purple-900 flex items-center gap-1"
              >
                {getName(pair[0])} & {getName(pair[1])}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main tabs */}
      <Tabs defaultValue="schedule">
        <TabsList className="mb-6">
          <TabsTrigger value="schedule" className="gap-1.5">
            <Trophy size={14} />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart2 size={14} />
            Player Stats
          </TabsTrigger>
        </TabsList>

        {/* Schedule tab */}
        <TabsContent value="schedule" className="space-y-3">
          {rounds.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No matches found.
            </div>
          ) : (
            rounds.map((round) => (
              <GameCard
                key={round.gameNumber}
                round={round}
                getName={getName}
                defaultOpen={round.gameNumber <= 3}
              />
            ))
          )}
        </TabsContent>

        {/* Stats tab */}
        <TabsContent value="stats">
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Player</th>
                  <th className="text-center px-4 py-3 font-semibold">Played</th>
                  <th className="text-center px-4 py-3 font-semibold">Rested</th>
                  <th className="text-center px-4 py-3 font-semibold">
                    Unique Partners
                  </th>
                  <th className="text-center px-4 py-3 font-semibold">
                    Unique Opponents
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessionPlayerIds.map((id) => {
                  const s = stats.get(id);
                  if (!s) return null;
                  return (
                    <tr key={id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-green-100 text-green-800 font-bold flex items-center justify-center text-xs">
                            {getName(id).charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{getName(id)}</span>
                        </div>
                      </td>
                      <td className="text-center px-4 py-3 tabular-nums">
                        {s.gamesPlayed}
                      </td>
                      <td className="text-center px-4 py-3 tabular-nums">
                        {s.gamesRested > 0 ? (
                          <span className="text-amber-600">{s.gamesRested}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="text-center px-4 py-3 tabular-nums">
                        <span className="font-medium text-blue-700">
                          {s.uniquePartners.size}
                        </span>
                      </td>
                      <td className="text-center px-4 py-3 tabular-nums">
                        <span className="font-medium text-purple-700">
                          {s.uniqueOpponents.size}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground mt-3 text-center">
            Higher unique partner/opponent counts = more variety in the session.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

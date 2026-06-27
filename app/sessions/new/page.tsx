"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, RefreshCw, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPlayers, createSession, bulkInsertMatches } from "@/lib/supabase";
import { generateSchedule, createBalancedPairs } from "@/lib/matchmaking";
import type { Player } from "@/lib/types";

type Step = "players" | "config" | "pairs";

export default function NewSessionPage() {
  const router = useRouter();

  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [numCourts, setNumCourts] = useState(2);
  const [numGames, setNumGames] = useState(6);
  const [fixedPartnerships, setFixedPartnerships] = useState(false);
  const [pairs, setPairs] = useState<[string, string][]>([]);

  const [step, setStep] = useState<Step>("players");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    getPlayers()
      .then(setAllPlayers)
      .catch(() => toast.error("Failed to load players. Check Supabase env."))
      .finally(() => setLoadingPlayers(false));
  }, []);

  const selectedPlayers = allPlayers.filter((p) => selectedIds.has(p.id));
  const filteredPlayers = allPlayers.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const playersNeeded = numCourts * 4;
  const canPlay = selectedPlayers.length >= 4;

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(allPlayers.map((p) => p.id)));
  }

  function clearAll() {
    setSelectedIds(new Set());
  }

  function goToConfig() {
    if (selectedPlayers.length < 4) {
      toast.error("Select at least 4 players.");
      return;
    }
    setStep("config");
  }

  function goToPairs() {
    setPairs(createBalancedPairs(selectedPlayers.map((p) => p.id)));
    setStep("pairs");
  }

  function reshufflePairs() {
    setPairs(createBalancedPairs(selectedPlayers.map((p) => p.id)));
  }

  function swapPairMember(pairIdx: number, slot: 0 | 1, newPlayerId: string) {
    setPairs((prev) => {
      const next = prev.map((p) => [...p] as [string, string]);
      for (let i = 0; i < next.length; i++) {
        for (let s = 0; s < 2; s++) {
          if (next[i][s] === newPlayerId) {
            const temp = next[pairIdx][slot];
            next[pairIdx][slot] = newPlayerId;
            next[i][s as 0 | 1] = temp;
            return next;
          }
        }
      }
      return next;
    });
  }

  async function handleGenerate() {
    if (!canPlay) return;
    setGenerating(true);
    try {
      const playerIds = selectedPlayers.map((p) => p.id);
      const schedule = generateSchedule(
        playerIds,
        numCourts,
        numGames,
        fixedPartnerships,
        fixedPartnerships ? pairs : undefined
      );

      const session = await createSession({
        total_courts: numCourts,
        total_games: numGames,
        fixed_partnerships: fixedPartnerships,
        player_ids: playerIds,
        pairs: fixedPartnerships ? (schedule.pairs ?? null) : null,
      });

      const matchRows = schedule.games.flatMap((game) =>
        game.courts.map((court) => ({
          session_id: session.id,
          game_number: game.gameNumber,
          court_number: court.courtNumber,
          team_a_player1: court.teamA[0],
          team_a_player2: court.teamA[1],
          team_b_player1: court.teamB[0],
          team_b_player2: court.teamB[1],
        }))
      );
      await bulkInsertMatches(matchRows);

      toast.success("Schedule generated!");
      router.push(`/sessions/${session.id}`);
    } catch (err) {
      toast.error("Failed to generate schedule.");
      console.error(err);
      setGenerating(false);
    }
  }

  function playerName(id: string) {
    return allPlayers.find((p) => p.id === id)?.name ?? id.slice(0, 6);
  }

  const steps: { key: Step; label: string }[] = [
    { key: "players", label: "Players" },
    { key: "config", label: "Configure" },
    ...(fixedPartnerships ? [{ key: "pairs" as Step, label: "Pairs" }] : []),
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">New Session</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Select players, configure courts, and generate your schedule.
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map(({ key, label }, i) => (
          <div key={key} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === key
                  ? "bg-primary text-primary-foreground"
                  : i < stepIndex
                  ? "bg-primary/20 text-primary"
                  : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm font-medium ${
                step === key ? "text-white" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className="w-8 h-px bg-zinc-800 mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Player Selection ─────────────────────────────────────────── */}
      {step === "players" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <Badge variant={canPlay ? "default" : "secondary"}>
              {selectedPlayers.length} selected
            </Badge>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={selectAll}>
                All
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear
              </Button>
            </div>
          </div>

          {/* Search */}
          {!loadingPlayers && allPlayers.length > 0 && (
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                placeholder="Search players…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          {loadingPlayers && (
            <div className="text-center py-12 text-muted-foreground">
              Loading players…
            </div>
          )}

          {!loadingPlayers && allPlayers.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl">
              <p className="text-muted-foreground">No players in roster.</p>
              <Button
                variant="link"
                className="text-primary mt-1"
                onClick={() => router.push("/players")}
              >
                Add players first →
              </Button>
            </div>
          )}

          {!loadingPlayers && allPlayers.length > 0 && filteredPlayers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No players match "{search}"
            </div>
          )}

          {!loadingPlayers && filteredPlayers.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-2">
              {filteredPlayers.map((player) => (
                <label
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedIds.has(player.id)
                      ? "border-primary/50 bg-primary/10 text-white"
                      : "border-zinc-800 bg-card hover:border-zinc-700 hover:bg-zinc-800/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedIds.has(player.id)}
                    onCheckedChange={() => togglePlayer(player.id)}
                  />
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs ${
                        selectedIds.has(player.id)
                          ? "bg-primary/20 text-primary"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-sm">{player.name}</span>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={goToConfig} disabled={!canPlay}>
              Next: Configure
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Configure ──────────────────────────────────────────────────── */}
      {step === "config" && (
        <div className="space-y-6">
          <div className="bg-card border border-zinc-800 rounded-xl p-5 space-y-5">
            {/* Courts */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="font-medium text-white">Courts Available</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Needs {numCourts * 4} players — you have {selectedPlayers.length}
                  {selectedPlayers.length > numCourts * 4 && (
                    <span className="text-amber-400 ml-1">
                      ({selectedPlayers.length - numCourts * 4} resting/game)
                    </span>
                  )}
                </p>
              </div>
              <Input
                type="number"
                min={1}
                value={numCourts}
                onChange={(e) =>
                  setNumCourts(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-20 text-center"
              />
            </div>

            <Separator />

            {/* Games */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="font-medium text-white">Number of Games</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total rounds to schedule
                </p>
              </div>
              <Input
                type="number"
                min={1}
                value={numGames}
                onChange={(e) =>
                  setNumGames(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-20 text-center"
              />
            </div>

            <Separator />

            {/* Fixed partnerships */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="font-medium text-white">Fixed Partnerships</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fixedPartnerships
                    ? "Pairs stay together — only opponents rotate."
                    : "Partners and opponents randomise every game."}
                </p>
              </div>
              <Switch
                checked={fixedPartnerships}
                onCheckedChange={setFixedPartnerships}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 text-sm space-y-1">
            <p className="text-white">
              <span className="font-semibold text-primary">{selectedPlayers.length}</span> players ·{" "}
              <span className="font-semibold text-primary">{numCourts}</span> court{numCourts !== 1 ? "s" : ""} ·{" "}
              <span className="font-semibold text-primary">{numGames}</span> game{numGames !== 1 ? "s" : ""}
            </p>
            <p className="text-muted-foreground">
              {selectedPlayers.length >= playersNeeded ? (
                <>
                  All courts full each game
                  {selectedPlayers.length > playersNeeded && (
                    <span className="text-amber-400 ml-1">
                      · {selectedPlayers.length - playersNeeded} rotating out
                    </span>
                  )}
                </>
              ) : (
                <span className="text-amber-400">
                  Only {Math.floor(selectedPlayers.length / 4)} court
                  {Math.floor(selectedPlayers.length / 4) !== 1 ? "s" : ""} can
                  be filled with {selectedPlayers.length} players.
                </span>
              )}
            </p>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("players")}>
              <ChevronLeft size={16} className="mr-1" />
              Back
            </Button>

            {fixedPartnerships ? (
              <Button onClick={goToPairs}>
                Next: Set Pairs
                <ChevronRight size={16} className="ml-1" />
              </Button>
            ) : (
              <Button onClick={handleGenerate} disabled={generating}>
                <Zap size={16} className="mr-2" />
                {generating ? "Generating…" : "Generate Schedule"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 3: Pair Assignment ───────────────────────────────────────────── */}
      {step === "pairs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Assign Pairs</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Partners stay together the whole session. Swap using the dropdowns.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={reshufflePairs}>
              <RefreshCw size={14} className="mr-1.5" />
              Re-shuffle
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {pairs.map((pair, pi) => (
              <div key={pi} className="border border-zinc-800 rounded-xl p-4 bg-card space-y-2">
                <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
                  Pair {pi + 1}
                </div>
                {pair.map((playerId, slot) => (
                  <div key={slot} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                      {playerName(playerId).charAt(0).toUpperCase()}
                    </div>
                    <select
                      value={playerId}
                      onChange={(e) =>
                        swapPairMember(pi, slot as 0 | 1, e.target.value)
                      }
                      className="flex-1 text-sm border border-zinc-700 rounded-md px-2 py-1.5 bg-zinc-900 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {selectedPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {selectedPlayers.length % 2 !== 0 && (
            <div className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-2">
              Odd number of players ({selectedPlayers.length}) — the last player is excluded from pairing.
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep("config")}>
              <ChevronLeft size={16} className="mr-1" />
              Back
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              <Zap size={16} className="mr-2" />
              {generating ? "Generating…" : "Generate Schedule"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getPlayers, addPlayer, deletePlayer } from "@/lib/supabase";
import type { Player } from "@/lib/types";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    try {
      const data = await getPlayers();
      setPlayers(data);
    } catch (err) {
      toast.error("Failed to load players. Check your Supabase env vars.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      toast.error(`"${name}" is already on the roster.`);
      return;
    }
    setAdding(true);
    try {
      const player = await addPlayer(name);
      setPlayers((prev) =>
        [...prev, player].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewName("");
      setDialogOpen(false);
      toast.success(`${name} added to roster.`);
    } catch (err) {
      toast.error("Failed to add player.");
      console.error(err);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(player: Player) {
    if (!confirm(`Remove ${player.name} from the roster?`)) return;
    setDeletingId(player.id);
    try {
      await deletePlayer(player.id);
      setPlayers((prev) => prev.filter((p) => p.id !== player.id));
      toast.success(`${player.name} removed.`);
    } catch (err) {
      toast.error("Failed to delete player.");
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={22} className="text-primary" />
            Player Roster
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Add and manage players across all sessions.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus size={16} className="mr-2" />
          Add Player
        </Button>
      </div>

      {!loading && (
        <div className="mb-4">
          <Badge variant="secondary">
            {players.length} player{players.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-muted-foreground">
          Loading roster…
        </div>
      )}

      {!loading && players.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-zinc-800 rounded-xl">
          <p className="font-medium text-muted-foreground">No players yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click "Add Player" to build your roster.
          </p>
        </div>
      )}

      {!loading && players.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between bg-card border border-zinc-800 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-sm border border-primary/30">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-white">{player.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={deletingId === player.id}
                onClick={() => handleDelete(player)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Player</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="player-name" className="mb-2 block">
              Name
            </Label>
            <Input
              id="player-name"
              placeholder="e.g. Alice"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={adding || !newName.trim()}>
              {adding ? "Adding…" : "Add Player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

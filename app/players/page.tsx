"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, Trash2, UserPlus, Users, X } from "lucide-react";
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
import { getPlayers, addPlayer, deletePlayer, updatePlayerName, archivePlayer } from "@/lib/supabase";
import type { Player } from "@/lib/types";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  // Rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Archive/delete state
  const [archivingId, setArchivingId] = useState<string | null>(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    try {
      const data = await getPlayers();
      setPlayers(data);
    } catch (err) {
      toast.error("Failed to load players.");
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

  function startEdit(player: Player) {
    setEditingId(player.id);
    setEditingName(player.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  async function handleRename(player: Player) {
    const name = editingName.trim();
    if (!name || name === player.name) { cancelEdit(); return; }
    if (players.some((p) => p.id !== player.id && p.name.toLowerCase() === name.toLowerCase())) {
      toast.error(`"${name}" is already on the roster.`);
      return;
    }
    setSavingId(player.id);
    try {
      await updatePlayerName(player.id, name);
      setPlayers((prev) =>
        prev
          .map((p) => (p.id === player.id ? { ...p, name } : p))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      toast.success(`Renamed to ${name}.`);
      setEditingId(null);
    } catch (err) {
      toast.error("Failed to rename player.");
      console.error(err);
    } finally {
      setSavingId(null);
    }
  }

  async function handleArchive(player: Player) {
    if (!confirm(`Hide "${player.name}" from the roster? Their match history is preserved.`)) return;
    setArchivingId(player.id);
    try {
      await archivePlayer(player.id);
      setPlayers((prev) => prev.filter((p) => p.id !== player.id));
      toast.success(`${player.name} hidden from roster.`);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "23503") {
        toast.error(`${player.name} can't be deleted — they appear in past session records.`);
      } else {
        toast.error("Failed to remove player.");
      }
      console.error(err);
    } finally {
      setArchivingId(null);
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
            Add, rename, or remove players. Hidden players keep their match history.
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
        <div className="text-center py-16 text-muted-foreground">Loading roster…</div>
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
              className="flex items-center justify-between bg-card border border-zinc-800 rounded-lg px-4 py-3 gap-2"
            >
              {editingId === player.id ? (
                /* ── Rename mode ── */
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(player);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button
                    size="icon-sm"
                    disabled={savingId === player.id}
                    onClick={() => handleRename(player)}
                    className="shrink-0"
                  >
                    <Check size={13} />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={cancelEdit}
                    className="shrink-0 text-muted-foreground"
                  >
                    <X size={13} />
                  </Button>
                </div>
              ) : (
                /* ── Display mode ── */
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-sm border border-primary/30 shrink-0">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-white truncate">{player.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => startEdit(player)}
                      className="text-muted-foreground hover:text-white"
                      title="Rename"
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={archivingId === player.id}
                      onClick={() => handleArchive(player)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Hide from roster"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </>
              )}
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
            <Label htmlFor="player-name" className="mb-2 block">Name</Label>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={adding || !newName.trim()}>
              {adding ? "Adding…" : "Add Player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

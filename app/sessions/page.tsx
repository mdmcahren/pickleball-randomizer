"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarDays, ChevronRight, PlusCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getSessions } from "@/lib/supabase";
import type { Session } from "@/lib/types";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch(() => toast.error("Failed to load sessions."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="text-green-700" size={24} />
            Session History
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            All past sessions and their generated schedules.
          </p>
        </div>
        <Link
          href="/sessions/new"
          className={cn(buttonVariants(), "bg-green-700 hover:bg-green-800")}
        >
          <PlusCircle size={16} className="mr-2" />
          New Session
        </Link>
      </div>

      {loading && (
        <div className="text-center py-16 text-muted-foreground">
          Loading sessions…
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed rounded-xl">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-medium text-muted-foreground">No sessions yet.</p>
          <Link
            href="/sessions/new"
            className={cn(buttonVariants({ variant: "link" }), "text-green-700 mt-1")}
          >
            Create your first session →
          </Link>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="flex items-center justify-between bg-card border rounded-xl px-5 py-4 shadow-sm hover:border-green-400 hover:bg-green-50/30 transition-colors group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {new Date(s.created_at).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {s.fixed_partnerships && (
                    <Badge variant="secondary" className="text-xs">
                      Fixed Pairs
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {s.total_games} games · {s.total_courts} court
                  {s.total_courts !== 1 ? "s" : ""} ·{" "}
                  {(s.player_ids as string[]).length} players
                </p>
              </div>
              <ChevronRight
                size={18}
                className="text-muted-foreground group-hover:text-green-700 transition-colors"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

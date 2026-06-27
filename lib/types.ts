export interface Player {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  created_at: string;
  total_courts: number;
  total_games: number;
  fixed_partnerships: boolean;
  player_ids: string[];
  pairs: [string, string][] | null;
}

export interface Match {
  id: string;
  session_id: string;
  game_number: number;
  court_number: number;
  team_a_player1: string;
  team_a_player2: string;
  team_b_player1: string;
  team_b_player2: string;
}

// ── Matchmaking output types ──────────────────────────────────────────────────

export interface CourtAssignment {
  courtNumber: number;
  teamA: string[]; // player IDs
  teamB: string[]; // player IDs
}

export interface GameRound {
  gameNumber: number;
  courts: CourtAssignment[];
  restingPlayerIds: string[];
}

export interface MatchSchedule {
  games: GameRound[];
  pairs?: [string, string][]; // fixed-partnership pairs
}

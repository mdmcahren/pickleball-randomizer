import type { CourtAssignment, GameRound, MatchSchedule } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeMatrix(n: number): number[][] {
  return Array.from({ length: n }, () => new Array(n).fill(0));
}

/**
 * For 4 players [a, b, c, d], try all 3 possible team splits and return
 * the one with the fewest repeated partnerships + opponent meetings.
 * Weights: partner repeat = 10x, opponent repeat = 1x (partners matter more).
 */
function bestTeamSplit(
  group: number[],
  partnerHist: number[][],
  opponentHist: number[][]
): [number[], number[]] {
  const [a, b, c, d] = group;
  const options: [number[], number[]][] = [
    [[a, b], [c, d]],
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ];

  let best = options[0];
  let bestScore = Infinity;

  for (const [tA, tB] of options) {
    const score =
      partnerHist[tA[0]][tA[1]] * 10 +
      partnerHist[tB[0]][tB[1]] * 10 +
      opponentHist[tA[0]][tB[0]] +
      opponentHist[tA[0]][tB[1]] +
      opponentHist[tA[1]][tB[0]] +
      opponentHist[tA[1]][tB[1]];
    if (score < bestScore) {
      bestScore = score;
      best = [tA, tB];
    }
  }
  return best;
}

/**
 * Score a full set of courts for a game round.
 * Lower is better (fewer repeated pairings).
 */
function scoreArrangement(
  groups: number[][], // each group is 4 indices
  partnerHist: number[][],
  opponentHist: number[][]
): number {
  let total = 0;
  for (const group of groups) {
    const [a, b, c, d] = group;
    // Best split score for this court
    const options: [number[], number[]][] = [
      [[a, b], [c, d]],
      [[a, c], [b, d]],
      [[a, d], [b, c]],
    ];
    let courtBest = Infinity;
    for (const [tA, tB] of options) {
      const s =
        partnerHist[tA[0]][tA[1]] * 10 +
        partnerHist[tB[0]][tB[1]] * 10 +
        opponentHist[tA[0]][tB[0]] +
        opponentHist[tA[0]][tB[1]] +
        opponentHist[tA[1]][tB[0]] +
        opponentHist[tA[1]][tB[1]];
      if (s < courtBest) courtBest = s;
    }
    total += courtBest;
  }
  return total;
}

// ── Randomized Schedule (Fixed Partnerships OFF) ──────────────────────────────

/**
 * Generates a schedule where partners and opponents change every round,
 * maximising unique pairings across the whole session.
 */
export function generateRandomizedSchedule(
  playerIds: string[],
  numCourts: number,
  numGames: number
): GameRound[] {
  const n = playerIds.length;
  const playersPerGame = numCourts * 4;

  // Indices into playerIds
  const idxList = playerIds.map((_, i) => i);

  const partnerHist = makeMatrix(n);
  const opponentHist = makeMatrix(n);
  const sitOutCount = new Array(n).fill(0);

  const games: GameRound[] = [];
  // Tuning: try more arrangements for small groups (fast), fewer for large
  const ATTEMPTS = Math.max(200, Math.min(800, Math.floor(5000 / n)));

  for (let g = 0; g < numGames; g++) {
    // ── Select who plays ──────────────────────────────────────────────────────
    let activeSorted: number[];
    let resting: number[];

    if (n <= playersPerGame) {
      activeSorted = [...idxList];
      resting = [];
    } else {
      // Rotate sit-outs: prioritise those who have sat out fewest times.
      // Break ties with random jitter so the same people don't always go first.
      const jitter = idxList.map((i) => ({
        i,
        key: sitOutCount[i] * 1000 + Math.random(),
      }));
      jitter.sort((a, b) => a.key - b.key);
      activeSorted = jitter.slice(0, playersPerGame).map((x) => x.i);
      resting = jitter.slice(playersPerGame).map((x) => x.i);
    }

    // ── Find the best grouping via random sampling ────────────────────────────
    let bestScore = Infinity;
    let bestGroups: number[][] = [];

    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const shuffled = shuffle(activeSorted);
      const groups: number[][] = [];
      for (let c = 0; c < numCourts; c++) {
        groups.push(shuffled.slice(c * 4, c * 4 + 4));
      }
      const score = scoreArrangement(groups, partnerHist, opponentHist);
      if (score < bestScore) {
        bestScore = score;
        bestGroups = groups;
        if (score === 0) break; // perfect — can't improve
      }
    }

    // ── Build court assignments ───────────────────────────────────────────────
    const courts: CourtAssignment[] = bestGroups.map((group, ci) => {
      const [tA, tB] = bestTeamSplit(group, partnerHist, opponentHist);
      return {
        courtNumber: ci + 1,
        teamA: tA.map((i) => playerIds[i]),
        teamB: tB.map((i) => playerIds[i]),
      };
    });

    // ── Update histories ──────────────────────────────────────────────────────
    for (const court of courts) {
      const [a0, a1] = court.teamA.map((id) => playerIds.indexOf(id));
      const [b0, b1] = court.teamB.map((id) => playerIds.indexOf(id));
      partnerHist[a0][a1]++;
      partnerHist[a1][a0]++;
      partnerHist[b0][b1]++;
      partnerHist[b1][b0]++;
      for (const pa of [a0, a1]) {
        for (const pb of [b0, b1]) {
          opponentHist[pa][pb]++;
          opponentHist[pb][pa]++;
        }
      }
    }
    resting.forEach((i) => sitOutCount[i]++);

    games.push({
      gameNumber: g + 1,
      courts,
      restingPlayerIds: resting.map((i) => playerIds[i]),
    });
  }

  return games;
}

// ── Fixed Partnership Schedule (Fixed Partnerships ON) ────────────────────────

/**
 * Auto-creates balanced pairs, then schedules which pairs face each other
 * each round, rotating opponents to maximise variety.
 */
export function generateFixedPartnershipSchedule(
  playerIds: string[],
  numCourts: number,
  numGames: number,
  existingPairs?: [string, string][]
): MatchSchedule {
  // ── Create or use pairs ───────────────────────────────────────────────────
  const pairs: [string, string][] =
    existingPairs ?? createBalancedPairs(playerIds);

  const numPairs = pairs.length;
  const pairsPerGame = numCourts * 2; // 2 pairs per court

  const sitOutCount = new Array(numPairs).fill(0);
  const opponentHist = makeMatrix(numPairs); // between pairs

  const games: GameRound[] = [];
  const ATTEMPTS = Math.max(200, Math.min(800, 2000 / numPairs));

  for (let g = 0; g < numGames; g++) {
    // ── Select which pairs play ───────────────────────────────────────────────
    let activePairIdxs: number[];
    let restingPairIdxs: number[];

    if (numPairs <= pairsPerGame) {
      activePairIdxs = pairs.map((_, i) => i);
      restingPairIdxs = [];
    } else {
      const jitter = pairs.map((_, i) => ({
        i,
        key: sitOutCount[i] * 1000 + Math.random(),
      }));
      jitter.sort((a, b) => a.key - b.key);
      activePairIdxs = jitter.slice(0, pairsPerGame).map((x) => x.i);
      restingPairIdxs = jitter.slice(pairsPerGame).map((x) => x.i);
    }

    // ── Find best matchup arrangement (minimise repeat pair vs pair meetings) ─
    let bestScore = Infinity;
    let bestCourts: CourtAssignment[] = [];

    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const shuffled = shuffle(activePairIdxs);
      let score = 0;
      const courtDraft: CourtAssignment[] = [];

      for (let c = 0; c < numCourts; c++) {
        const pi = shuffled[c * 2];
        const qi = shuffled[c * 2 + 1];
        score += opponentHist[pi][qi];
        courtDraft.push({
          courtNumber: c + 1,
          teamA: [...pairs[pi]],
          teamB: [...pairs[qi]],
        });
      }

      if (score < bestScore) {
        bestScore = score;
        bestCourts = courtDraft;
        if (score === 0) break;
      }
    }

    // ── Update opponent history ───────────────────────────────────────────────
    for (const court of bestCourts) {
      const pi = pairs.findIndex(
        (p) => p[0] === court.teamA[0] && p[1] === court.teamA[1]
      );
      const qi = pairs.findIndex(
        (p) => p[0] === court.teamB[0] && p[1] === court.teamB[1]
      );
      if (pi >= 0 && qi >= 0) {
        opponentHist[pi][qi]++;
        opponentHist[qi][pi]++;
      }
    }
    restingPairIdxs.forEach((i) => sitOutCount[i]++);

    games.push({
      gameNumber: g + 1,
      courts: bestCourts,
      restingPlayerIds: restingPairIdxs.flatMap((i) => pairs[i]),
    });
  }

  return { games, pairs };
}

/**
 * Creates balanced pairs from a list of player IDs.
 * Shuffles first so pairs are random. If the count is odd, the last player
 * is ignored (caller should handle or warn).
 */
export function createBalancedPairs(playerIds: string[]): [string, string][] {
  const shuffled = shuffle(playerIds);
  const pairs: [string, string][] = [];
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }
  return pairs;
}

// ── Top-level dispatcher ──────────────────────────────────────────────────────

export function generateSchedule(
  playerIds: string[],
  numCourts: number,
  numGames: number,
  fixedPartnerships: boolean,
  existingPairs?: [string, string][]
): MatchSchedule {
  if (fixedPartnerships) {
    return generateFixedPartnershipSchedule(
      playerIds,
      numCourts,
      numGames,
      existingPairs
    );
  }
  return {
    games: generateRandomizedSchedule(playerIds, numCourts, numGames),
  };
}

// ── Stats helper (used on schedule view) ─────────────────────────────────────

export interface PlayerStats {
  playerId: string;
  gamesPlayed: number;
  gamesRested: number;
  uniquePartners: Set<string>;
  uniqueOpponents: Set<string>;
}

export function computeStats(
  games: GameRound[],
  playerIds: string[]
): Map<string, PlayerStats> {
  const map = new Map<string, PlayerStats>(
    playerIds.map((id) => [
      id,
      {
        playerId: id,
        gamesPlayed: 0,
        gamesRested: 0,
        uniquePartners: new Set(),
        uniqueOpponents: new Set(),
      },
    ])
  );

  for (const game of games) {
    const restSet = new Set(game.restingPlayerIds);
    for (const id of playerIds) {
      if (restSet.has(id)) map.get(id)!.gamesRested++;
    }
    for (const court of game.courts) {
      const { teamA, teamB } = court;
      for (const p of teamA) {
        const s = map.get(p);
        if (!s) continue;
        s.gamesPlayed++;
        for (const q of teamA) if (q !== p) s.uniquePartners.add(q);
        for (const q of teamB) s.uniqueOpponents.add(q);
      }
      for (const p of teamB) {
        const s = map.get(p);
        if (!s) continue;
        s.gamesPlayed++;
        for (const q of teamB) if (q !== p) s.uniquePartners.add(q);
        for (const q of teamA) s.uniqueOpponents.add(q);
      }
    }
  }
  return map;
}

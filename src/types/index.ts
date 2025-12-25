export type MatchStatus = 'upcoming' | 'live' | 'completed';


export type Team = {
    id: string;
    name: string;
};

export type TeamStats = Team & {
    played: number;
    won: number;
    lost: number;
    tied: number;
    points: number;
    runsScored: number;
    ballsFaced: number;
    runsConceded: number;
    ballsBowled: number;
    nrr: number;
};

// 0-6, W=wicket, WD=wide, NB=no ball, E=extra(generic)
// We allow flexible strings to support manual runs (e.g., '7', 'NB+5', 'WD+4')
export type BallEvent = string;

export interface Innings {
    teamId: string;
    runs: number;
    wickets: number;
    ballsFaced: number; // Total legal balls
    history: BallEvent[]; // For undo/log
}

export interface Match {
    id: string;
    teamAId: string;
    teamBId: string;
    status: MatchStatus;
    totalOvers: number;
    innings: {
        [teamId: string]: Innings;
    };
    winnerId: string | null; // null if draw/tie or not done
    battingTeamId: string | null; // Current batting team
    bowlingTeamId: string | null;
    result?: string;
}

export interface TournamentSettings {
    name: string;
    teamCount: number;
    playersPerTeam: number;
    oversPerMatch: number;
}

export interface TournamentState {
    settings: TournamentSettings | null;
    teams: Team[];
    matches: Match[];
    isInitialized: boolean;
}

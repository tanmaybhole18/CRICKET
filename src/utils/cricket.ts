import { Team, TeamStats, Match, MatchStatus } from '@/types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const formatOvers = (balls: number): string => {
    const overs = Math.floor(balls / 6);
    const remBalls = balls % 6;
    return `${overs}.${remBalls}`;
};

export const ballsToOversDecimal = (balls: number): number => {
    if (balls === 0) return 0;
    return balls / 6;
};

export const calculateNRR = (runs: number, balls: number, runsAgainst: number, ballsBowled: number): number => {
    const oversFaced = ballsToOversDecimal(balls);
    const oversBowled = ballsToOversDecimal(ballsBowled);

    const rateFor = oversFaced === 0 ? 0 : runs / oversFaced;
    const rateAgainst = oversBowled === 0 ? 0 : runsAgainst / oversBowled;

    return rateFor - rateAgainst;
};

export const generateFixtures = (teams: Team[], totalOvers: number): Match[] => {
    const fixtures: Match[] = [];

    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            const matchId = generateId();
            fixtures.push({
                id: matchId,
                teamAId: teams[i].id,
                teamBId: teams[j].id,
                status: 'upcoming',
                totalOvers: totalOvers,
                innings: {
                    [teams[i].id]: { teamId: teams[i].id, runs: 0, wickets: 0, ballsFaced: 0, history: [] },
                    [teams[j].id]: { teamId: teams[j].id, runs: 0, wickets: 0, ballsFaced: 0, history: [] }
                },
                winnerId: null,
                battingTeamId: null,
                bowlingTeamId: null
            });
        }
    }
    return fixtures;
};

export const calculateStandings = (teams: Team[], matches: Match[]): TeamStats[] => {
    const statsMap = new Map<string, TeamStats>();

    // Initialize
    teams.forEach(team => {
        statsMap.set(team.id, {
            ...team,
            played: 0,
            won: 0,
            lost: 0,
            tied: 0,
            points: 0,
            runsScored: 0,
            ballsFaced: 0,
            runsConceded: 0,
            ballsBowled: 0,
            nrr: 0
        });
    });

    matches.forEach(match => {
        if (match.status === 'completed') {
            const teamA = statsMap.get(match.teamAId);
            const teamB = statsMap.get(match.teamBId);
            if (!teamA || !teamB) return;

            teamA.played += 1;
            teamB.played += 1;

            // Points & Result
            if (match.winnerId === teamA.id) {
                teamA.won += 1;
                teamB.lost += 1;
                teamA.points += 2;
            } else if (match.winnerId === teamB.id) {
                teamB.won += 1;
                teamA.lost += 1;
                teamB.points += 2;
            } else {
                // Draw or Tie
                teamA.tied += 1;
                teamB.tied += 1;
                teamA.points += 1;
                teamB.points += 1;
            }

            // NRR Stats
            const innA = match.innings[teamA.id];
            if (innA) {
                teamA.runsScored += innA.runs;
                teamB.runsConceded += innA.runs;

                // If All Out, use full overs for NRR calculation
                const effectiveBalls = innA.wickets >= 10 ? match.totalOvers * 6 : innA.ballsFaced;

                teamA.ballsFaced += effectiveBalls;
                teamB.ballsBowled += effectiveBalls;
            }

            const innB = match.innings[teamB.id];
            if (innB) {
                teamB.runsScored += innB.runs;
                teamA.runsConceded += innB.runs;

                // If All Out, use full overs for NRR calculation
                const effectiveBalls = innB.wickets >= 10 ? match.totalOvers * 6 : innB.ballsFaced;

                teamB.ballsFaced += effectiveBalls;
                teamA.ballsBowled += effectiveBalls;
            }
        }
    });

    const stats = Array.from(statsMap.values()).map(team => {
        team.nrr = calculateNRR(team.runsScored, team.ballsFaced, team.runsConceded, team.ballsBowled);
        return team;
    });

    // Sort: Points DESC, NRR DESC, Wins DESC
    return stats.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.nrr !== a.nrr) return b.nrr - a.nrr;
        return b.won - a.won;
    });
};

export const calculateScoreFromHistory = (history: import('@/types').BallEvent[]) => {
    let runs = 0;
    let wickets = 0;
    let ballsFaced = 0; // Legal balls

    history.forEach(event => {
        // Handle Wicket + runs (e.g., W+1, W+2)
        if (event.startsWith('W+')) {
            const extraRuns = parseInt(event.split('+')[1]);
            wickets += 1;
            runs += extraRuns;
            ballsFaced += 1; // Wicket counts as a legal ball
        }
        // Handle Wide + wicket (WD+W)
        else if (event === 'WD+W') {
            runs += 1; // Wide run
            wickets += 1;
            // No legal ball for wide
        }
        // Handle Wide + runs (e.g., WD+1, WD+2, WD+3)
        else if (event.startsWith('WD+')) {
            const extraRuns = parseInt(event.split('+')[1]);
            runs += 1 + extraRuns; // 1 for wide + extra runs
            // No legal ball for wide
        }
        // Handle No Ball + wicket (NB+W) - counts as legal ball because it's a run out
        else if (event === 'NB+W') {
            runs += 1; // No ball run
            wickets += 1;
            ballsFaced += 1; // Counts as legal ball for run out
        }
        // Handle No Ball + wicket + runs (NB+W+1) - counts as legal ball because it's a run out
        else if (event === 'NB+W+1') {
            runs += 1 + 1; // No ball run + 1 run before run out
            wickets += 1;
            ballsFaced += 1; // Counts as legal ball for run out
        }
        // Handle No Ball + runs (e.g., NB+1, NB+2, NB+3, NB+4, NB+6)
        else if (event.startsWith('NB+')) {
            const extraRuns = parseInt(event.split('+')[1]);
            runs += 1 + extraRuns; // 1 for no ball + extra runs
            // No legal ball for no ball
        }
        // Handle simple Wide or No Ball
        else if (event === 'WD' || event === 'NB') {
            runs += 1;
            // No legal ball for wide/no ball
        }
        // Handle simple Wicket
        else if (event === 'W') {
            wickets += 1;
            ballsFaced += 1;
        }
        // Handle regular runs (0-6)
        else {
            runs += parseInt(event);
            ballsFaced += 1;
        }
    });

    return { runs, wickets, ballsFaced };
};

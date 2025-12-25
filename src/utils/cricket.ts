import { Team, Match, MatchStatus } from '@/types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const formatOvers = (balls: number): string => {
    const overs = Math.floor(balls / 6);
    const remBalls = balls % 6;
    return `${overs}.${remBalls}`;
};

export const ballsToOversDecimal = (balls: number): number => {
    if (balls === 0) return 0;
    // Standard NRR calculation: balls / 6
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

'use client';
import { useTournament } from '@/context/TournamentContext';
import Link from 'next/link';
import { Match } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle, Eye, Calculator } from 'lucide-react';

export default function FixturesList() {
    const { state } = useTournament();
    const { matches, teams } = state;

    const getTeamName = (id: string) => teams.find(t => t.id === id)?.name || 'Unknown';

    const upcoming = matches.filter(m => m.status === 'upcoming');
    const live = matches.filter(m => m.status === 'live');
    const completed = matches.filter(m => m.status === 'completed');

    const MatchCard = ({ m }: { m: Match }) => (
        <Card className="mb-4 group hover:shadow-md transition-all">
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg">{getTeamName(m.teamAId)}</span>
                        <span className="text-muted-foreground text-sm">vs</span>
                        <span className="font-bold text-lg">{getTeamName(m.teamBId)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {m.status === 'completed' ? (
                            <span className="text-green-500 font-medium">
                                {m.winnerId ? `${getTeamName(m.winnerId)} Won` : 'Tie / Draw'}
                            </span>
                        ) : (
                            <span>{m.totalOvers} Overs</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {m.status === 'live' && <Badge variant="destructive" className="animate-pulse">LIVE</Badge>}

                    {m.status === 'upcoming' && (
                        <Link href={`/match/${m.id}`}>
                            <Button size="sm" variant="secondary" className="gap-2">
                                <PlayCircle className="w-4 h-4" /> Start
                            </Button>
                        </Link>
                    )}
                    {m.status === 'live' && (
                        <Link href={`/match/${m.id}`}>
                            <Button size="sm" className="gap-2">
                                <Calculator className="w-4 h-4" /> Scoring
                            </Button>
                        </Link>
                    )}
                    {m.status === 'completed' && (
                        <Link href={`/match/${m.id}`}>
                            <Button size="sm" variant="ghost" className="gap-2">
                                <Eye className="w-4 h-4" /> View
                            </Button>
                        </Link>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-8">
            {live.length > 0 && (
                <div className="relative">
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-transparent rounded-full opacity-50" />
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        Live Matches
                    </h3>
                    {live.map(m => <MatchCard key={m.id} m={m} />)}
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-lg font-semibold text-muted-foreground mb-4 uppercase tracking-wider text-sm">Upcoming</h3>
                    {upcoming.length === 0 ? (
                        <div className="text-center p-8 border rounded-lg border-dashed text-muted-foreground">
                            No upcoming matches
                        </div>
                    ) : upcoming.map(m => <MatchCard key={m.id} m={m} />)}
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-muted-foreground mb-4 uppercase tracking-wider text-sm">Completed</h3>
                    {completed.length === 0 ? (
                        <div className="text-center p-8 border rounded-lg border-dashed text-muted-foreground">
                            No completed matches
                        </div>
                    ) : completed.map(m => <MatchCard key={m.id} m={m} />)}
                </div>
            </div>
        </div>
    );
}

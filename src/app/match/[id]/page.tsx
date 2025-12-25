'use client';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useParams, useRouter } from 'next/navigation';
import { useTournament } from '@/context/TournamentContext';
import { Match, BallEvent, Innings } from '@/types';
import { formatOvers, ballsToOversDecimal } from '@/utils/cricket';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Flag, Trophy, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function MatchPage() {
    const params = useParams();
    const router = useRouter(); // eslint-disable-line @typescript-eslint/no-unused-vars
    const { state, updateMatch } = useTournament();

    // Safety check for hydration/params
    const matchId = Array.isArray(params?.id) ? params.id[0] : params?.id;

    const match = state.matches.find(m => m.id === matchId);
    const teamA = state.teams.find(t => t.id === match?.teamAId);
    const teamB = state.teams.find(t => t.id === match?.teamBId);


    const [target, setTarget] = useState<number | null>(null);


    // Effect to calculate target if 2nd innings
    useEffect(() => {
        if (match && match.status === 'live' && match.bowlingTeamId) {
            const bowlingInnings = match.innings[match.bowlingTeamId];
            if (bowlingInnings.ballsFaced > 0 || bowlingInnings.runs > 0 || bowlingInnings.history.length > 0) {
                setTarget(bowlingInnings.runs + 1);
            }
        }
    }, [match]);


    const startMatch = (battingId: string) => {
        if (!match || !teamA || !teamB) return;
        const bowlingId = battingId === teamA.id ? teamB.id : teamA.id;
        updateMatch({
            ...match,
            status: 'live',
            battingTeamId: battingId,
            bowlingTeamId: bowlingId,
        });
    };

    const switchInnings = () => {
        if (!match || !match.battingTeamId || !match.bowlingTeamId) return;
        // Swap
        const newBatting = match.bowlingTeamId;
        const newBowling = match.battingTeamId;

        updateMatch({
            ...match,
            battingTeamId: newBatting,
            bowlingTeamId: newBowling
        });
    };

    const completeMatch = (winnerId: string | null, resultText: string) => {
        if (!match) return;
        updateMatch({
            ...match,
            status: 'completed',
            winnerId,
            result: resultText,
            battingTeamId: null,
            bowlingTeamId: null
        });
    };


    const calculateScoreFromHistory = (history: BallEvent[]) => {
        let runs = 0;
        let wickets = 0;
        let ballsFaced = 0;

        history.forEach(event => {
            if (['WD', 'NB'].includes(event)) {
                runs += 1;
            } else if (event.startsWith('NB+') || event.startsWith('WD+')) {
                const extraRuns = parseInt(event.split('+')[1]);
                runs += 1 + extraRuns;
                // ballsFaced remains unchanged for no-balls/wides
            } else if (event === 'W') {
                wickets += 1;
                ballsFaced += 1;
            } else {
                runs += parseInt(event);
                ballsFaced += 1;
            }
        });
        return { runs, wickets, ballsFaced };
    };

    // ... (rest of methods)

    const [manualRuns, setManualRuns] = useState('');
    const [manualExtraType, setManualExtraType] = useState('none'); // none, nb, wd
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [isSwitchOpen, setIsSwitchOpen] = useState(false);

    if (!match || !teamA || !teamB) {
        return <div className="container p-8 text-center text-muted-foreground">Match Not Found</div>;
    }

    const handleManualScore = () => {
        if (!match || !teamA || !teamB) return;
        const runs = parseInt(manualRuns);
        if (!isNaN(runs)) {
            let event = `${runs}`;
            if (manualExtraType === 'nb') {
                event = `NB+${runs}`;
            } else if (manualExtraType === 'wd') {
                event = `WD+${runs}`;
            }

            handleScoring(event as BallEvent);
            setManualRuns('');
            setManualExtraType('none');
            setIsManualOpen(false);
        }
    };


    const handleUndo = () => {
        if (!match || !match.battingTeamId) return;
        const battingId = match.battingTeamId;
        const currentInnings = match.innings[battingId];

        if (currentInnings.history.length === 0) return;

        const newHistory = currentInnings.history.slice(0, -1);
        const stats = calculateScoreFromHistory(newHistory);

        const newInnings: Innings = {
            ...currentInnings,
            history: newHistory,
            runs: stats.runs,
            wickets: stats.wickets,
            ballsFaced: stats.ballsFaced
        };

        updateMatch({
            ...match,
            status: 'live', // Ensure status is back to live if it was completed (though this basic logic might need more check if we undo a winning run? For now, simple.)
            winnerId: null, // Reset winner if we are undoing
            result: undefined,
            innings: { ...match.innings, [battingId]: newInnings }
        });
    };

    const handleScoring = (event: BallEvent) => {
        if (!match || !match.battingTeamId) return;
        const battingId = match.battingTeamId;
        const currentInnings = match.innings[battingId];

        const newHistory = [...currentInnings.history, event];
        const stats = calculateScoreFromHistory(newHistory);

        const newInnings: Innings = {
            ...currentInnings,
            history: newHistory,
            runs: stats.runs,
            wickets: stats.wickets,
            ballsFaced: stats.ballsFaced
        };


        const updatedMatch = {
            ...match,
            innings: { ...match.innings, [battingId]: newInnings }
        };

        const isSecondInnings = !!match.bowlingTeamId && (match.bowlingTeamId !== match.teamAId || !!target); // Simple check if target exists or not actually

        // Check for Innings End (10 Wickets OR Overs Completed)
        const isAllOut = newInnings.wickets >= 10;
        const isOversCompleted = newInnings.ballsFaced >= match.totalOvers * 6;

        // Win Logic (2nd Innings)
        if (target) {
            if (newInnings.runs >= target) {
                const battingTeam = battingId === teamA.id ? teamA : teamB;
                updateMatch({
                    ...updatedMatch,
                    status: 'completed',
                    winnerId: battingId,
                    result: `${battingTeam.name} won by ${10 - newInnings.wickets} wickets`
                });
                toast.success(`${battingTeam.name} won the match!`, {
                    description: `Target of ${target} chased down in ${formatOvers(newInnings.ballsFaced)} overs.`,
                    duration: 5000,
                });
                return;
            }
        }

        if (isAllOut || isOversCompleted) {
            if (target) {
                // 2nd Innings Ends -> Defending Team Wins (or Tie)
                const runsScored = newInnings.runs;
                if (runsScored === target - 1) {
                    // Tie
                    updateMatch({
                        ...updatedMatch,
                        status: 'completed',
                        winnerId: null,
                        result: "Match Tied"
                    });
                    toast.info("Match Tied!", { duration: 5000 });
                } else {
                    // Defending Team Wins
                    const bowlingTeamId = match.bowlingTeamId!; // Should be set
                    const bowlingTeam = bowlingTeamId === teamA.id ? teamA : teamB;
                    const margin = target - 1 - runsScored;
                    updateMatch({
                        ...updatedMatch,
                        status: 'completed',
                        winnerId: bowlingTeamId,
                        result: `${bowlingTeam.name} won by ${margin} runs`
                    });
                    toast.success(`${bowlingTeam.name} won the match!`, {
                        description: `Defended ${target} successfully by ${margin} runs.`,
                        duration: 5000,
                    });
                }
                return;
            } else {
                // 1st Innings Completed - Auto Switch
                toast.success("Innings Completed! Switching...", {
                    description: isAllOut ? "All Out!" : "Overs Limit Reached!",
                    duration: 3000,
                });

                // Auto switch after short delay to let user see correct final state?
                // React state updates are batched, but we want to show the final ball.
                // Actually, if I update here, the re-render happens immediately with new innings.
                // Let's do it immediately but maybe the UI handles it.
                // We need to define newBatting/newBowling here.
                const newBatting = match.bowlingTeamId;
                const newBowling = match.battingTeamId;

                updateMatch({
                    ...updatedMatch,
                    battingTeamId: newBatting,
                    bowlingTeamId: newBowling
                });
                return;
            }
        }

        // Over Completed Toast
        if (stats.ballsFaced > 0 && stats.ballsFaced % 6 === 0 && stats.ballsFaced !== currentInnings.ballsFaced) {
            toast.info(`Over ${stats.ballsFaced / 6} Completed`, {
                duration: 2000,
            });
        }

        updateMatch(updatedMatch);
    };

    // Components
    const batInns = match.battingTeamId ? match.innings[match.battingTeamId] : null;
    // const bowlInns = match.bowlingTeamId ? match.innings[match.bowlingTeamId] : null; UNUSED

    // Calculations
    const oversDecimal = batInns ? ballsToOversDecimal(batInns.ballsFaced) : 0; // eslint-disable-line @typescript-eslint/no-unused-vars
    const oversStr = batInns ? formatOvers(batInns.ballsFaced) : '0.0';
    const remainingBalls = match.totalOvers * 6 - (batInns?.ballsFaced || 0);
    const runsNeeded = target ? target - (batInns?.runs || 0) : 0;

    return (
        <div className="container max-w-3xl mx-auto py-8 px-4">
            <div className="mb-6">
                <Link href="/">
                    <Button variant="ghost" className="gap-2 pl-0 hover:pl-2 transition-all">
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </Button>
                </Link>
            </div>

            <Card className="overflow-hidden">
                <div className="bg-muted p-6 flex justify-between items-center border-b">
                    <div className="text-center flex-1">
                        <h2 className={match.battingTeamId === teamA.id ? "text-primary font-bold text-2xl" : "text-foreground font-bold text-xl"}>
                            {teamA.name}
                        </h2>
                        <div className="text-3xl font-mono my-1">
                            {match.innings[teamA.id].runs}/{match.innings[teamA.id].wickets}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {formatOvers(match.innings[teamA.id].ballsFaced)} Overs
                        </div>
                    </div>

                    <div className="mx-4 flex flex-col items-center">
                        <span className="text-muted-foreground font-bold text-lg">VS</span>
                        {match.status === 'live' && <Badge variant="destructive" className="mt-2 animate-pulse">LIVE</Badge>}
                    </div>

                    <div className="text-center flex-1">
                        <h2 className={match.battingTeamId === teamB.id ? "text-primary font-bold text-2xl" : "text-foreground font-bold text-xl"}>
                            {teamB.name}
                        </h2>
                        <div className="text-3xl font-mono my-1">
                            {match.innings[teamB.id].runs}/{match.innings[teamB.id].wickets}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {formatOvers(match.innings[teamB.id].ballsFaced)} Overs
                        </div>
                    </div>
                </div>

                <CardContent className="p-6">
                    {match.status === 'upcoming' && (
                        <div className="text-center py-8">
                            <h3 className="text-2xl font-bold mb-4">Start Match</h3>
                            <p className="text-muted-foreground mb-6">Who is batting first?</p>
                            <div className="flex justify-center gap-4">
                                <Button size="lg" onClick={() => startMatch(teamA.id)} className="min-w-[150px]">{teamA.name}</Button>
                                <Button size="lg" variant="outline" onClick={() => startMatch(teamB.id)} className="min-w-[150px]">{teamB.name}</Button>
                            </div>
                        </div>
                    )}

                    {match.status === 'live' && batInns && (
                        <div className="max-w-md mx-auto">
                            <div className="text-center mb-8 bg-card border rounded-xl p-4 shadow-sm">
                                <div className="text-sm font-medium text-blue-500 mb-2">
                                    {target ? `Target: ${target} (${runsNeeded} needed off ${remainingBalls} balls)` : `1st Innings`}
                                </div>
                                <div className="text-[5rem] font-black leading-none bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                                    {batInns.runs}/{batInns.wickets}
                                </div>
                                <div className="text-xl text-muted-foreground mt-2 font-mono">
                                    Overs: <span className="text-foreground font-bold">{oversStr}</span> / {match.totalOvers}
                                </div>
                            </div>

                            {/* Scoring Area */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {['0', '1', '2', '3', '4', '6'].map(r => (
                                    <Button
                                        key={r}
                                        onClick={() => handleScoring(r as BallEvent)}
                                        variant="outline"
                                        className="h-16 text-2xl font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
                                    >
                                        {r}
                                    </Button>
                                ))}
                                <Button onClick={() => handleScoring('W')} variant="destructive" className="h-16 text-xl font-bold">OUT</Button>
                                <Button onClick={() => handleScoring('WD')} variant="secondary" className="h-16 text-xl font-bold">WD</Button>
                                <Button onClick={() => handleScoring('NB')} variant="secondary" className="h-16 text-xl font-bold">NB</Button>
                            </div>

                            <div className="grid grid-cols-5 gap-2 mb-8">
                                <Button onClick={() => handleScoring('NB+1')} variant="secondary" size="sm" className="text-xs">NB+1</Button>
                                <Button onClick={() => handleScoring('NB+2')} variant="secondary" size="sm" className="text-xs">NB+2</Button>
                                <Button onClick={() => handleScoring('NB+3')} variant="secondary" size="sm" className="text-xs">NB+3</Button>
                                <Button onClick={() => handleScoring('NB+4')} variant="secondary" size="sm" className="text-xs">NB+4</Button>
                                <Button onClick={() => handleScoring('NB+6')} variant="secondary" size="sm" className="text-xs">NB+6</Button>
                            </div>

                            <div className="flex justify-between items-center border-t pt-6 flex-wrap gap-2">
                                <div className="flex gap-2 flex-wrap">
                                    {!target && (
                                        <Dialog open={isSwitchOpen} onOpenChange={setIsSwitchOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="secondary" className="gap-2">
                                                    End Innings / Switch
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>End Innings?</DialogTitle>
                                                    <DialogDescription>
                                                        Are you sure you want to end the innings? This will switch the batting and bowling teams.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button variant="outline">Cancel</Button>
                                                    </DialogClose>
                                                    <Button onClick={() => { switchInnings(); setIsSwitchOpen(false); }}>Confirm Switch</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    )}

                                    <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="gap-2">
                                                + Manual
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Add Manual Runs</DialogTitle>
                                                <DialogDescription>Add runs manually. Select extra type if applicable.</DialogDescription>
                                            </DialogHeader>
                                            <div className="py-4 space-y-4">
                                                <div>
                                                    <Label>Runs (Bat/Overthrows/Extras)</Label>
                                                    <Input
                                                        type="number"
                                                        value={manualRuns}
                                                        onChange={e => setManualRuns(e.target.value)}
                                                        placeholder="e.g. 5"
                                                        className="mt-1"
                                                    />
                                                </div>

                                                <div>
                                                    <Label className="mb-2 block">Extra Type</Label>
                                                    <div className="flex gap-4">
                                                        <Button
                                                            variant={manualExtraType === 'none' ? "default" : "outline"}
                                                            onClick={() => setManualExtraType('none')}
                                                            size="sm"
                                                        >
                                                            None (Legal)
                                                        </Button>
                                                        <Button
                                                            variant={manualExtraType === 'wd' ? "default" : "outline"}
                                                            onClick={() => setManualExtraType('wd')}
                                                            size="sm"
                                                        >
                                                            Wide (WD)
                                                        </Button>
                                                        <Button
                                                            variant={manualExtraType === 'nb' ? "default" : "outline"}
                                                            onClick={() => setManualExtraType('nb')}
                                                            size="sm"
                                                        >
                                                            No Ball (NB)
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button onClick={handleManualScore}>Add Score</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    <Button
                                        onClick={handleUndo}
                                        variant="outline"
                                        className="gap-2"
                                        disabled={batInns.history.length === 0}
                                    >
                                        <RotateCcw className="w-4 h-4" /> Undo
                                    </Button>
                                </div>


                            </div>
                        </div>
                    )}

                    {match.status === 'completed' && (
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center p-4 bg-green-500/10 rounded-full mb-6 text-green-500">
                                <Trophy className="w-12 h-12" />
                            </div>
                            <h3 className="text-2xl font-bold text-green-500 mb-2">Match Completed</h3>
                            <p className="text-4xl font-black mb-8">{match.result}</p>
                            <Link href="/">
                                <Button size="lg" className="px-8">Back to Dashboard</Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

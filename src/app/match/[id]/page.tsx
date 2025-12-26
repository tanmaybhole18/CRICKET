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
import { ArrowLeft, Flag, Trophy, RotateCcw, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

    // Effect to fix invalid completed matches (completed but no play occurred)
    useEffect(() => {
        if (match && match.status === 'completed') {
            const teamAInnings = match.innings[match.teamAId];
            const teamBInnings = match.innings[match.teamBId];
            const hasPlay = (teamAInnings && (teamAInnings.ballsFaced > 0 || teamAInnings.runs > 0 || teamAInnings.wickets > 0)) ||
                           (teamBInnings && (teamBInnings.ballsFaced > 0 || teamBInnings.runs > 0 || teamBInnings.wickets > 0));
            
            // If match is marked completed but has no play, reset it to upcoming
            if (!hasPlay) {
                updateMatch({
                    ...match,
                    status: 'upcoming',
                    winnerId: null,
                    result: undefined,
                    battingTeamId: null,
                    bowlingTeamId: null
                });
            }
        }
    }, [match, updateMatch]);


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
        
        // Validate that the match has actually been played
        const teamAInnings = match.innings[match.teamAId];
        const teamBInnings = match.innings[match.teamBId];
        const hasPlay = (teamAInnings && (teamAInnings.ballsFaced > 0 || teamAInnings.runs > 0 || teamAInnings.wickets > 0)) ||
                       (teamBInnings && (teamBInnings.ballsFaced > 0 || teamBInnings.runs > 0 || teamBInnings.wickets > 0));
        
        if (!hasPlay) {
            toast.error("Cannot complete match: No play has occurred yet");
            return;
        }
        
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

    // ... (rest of methods)

    const [manualRuns, setManualRuns] = useState('');
    const [manualExtraType, setManualExtraType] = useState('none'); // none, nb, wd
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [isSwitchOpen, setIsSwitchOpen] = useState(false);
    const [lastCompletedOver, setLastCompletedOver] = useState<number | null>(null);
    const [wicketPlusOpen, setWicketPlusOpen] = useState(false);
    const [widePlusOpen, setWidePlusOpen] = useState(false);
    const [nbPlusOpen, setNbPlusOpen] = useState(false);

    if (!match || !teamA || !teamB) {
        return <div className="container p-8 text-center text-muted-foreground">Match Not Found</div>;
    }


    const batInns = match.battingTeamId ? match.innings[match.battingTeamId] : null;

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

    const isFirstInningsComplete = batInns && !target && (batInns.wickets >= 10 || batInns.ballsFaced >= match.totalOvers * 6);
    const isMatchConcluded = target && batInns && (batInns.runs >= target || batInns.wickets >= 10 || batInns.ballsFaced >= match.totalOvers * 6);
    
    // Check if match has any play (to prevent completing empty matches)
    const hasAnyPlay = batInns && (batInns.ballsFaced > 0 || batInns.runs > 0 || batInns.wickets > 0);

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

        // If newly complete, just toast/notify but DO NOT change status
        // Check for Innings End (10 Wickets OR Overs Completed)
        const isAllOut = newInnings.wickets >= 10;
        const isOversCompleted = newInnings.ballsFaced >= match.totalOvers * 6;

        if (isAllOut || isOversCompleted) {
            // Just toast
            if (target) {
                if (newInnings.runs >= target) {
                    toast.success("Target Chased! Match Won (Pending Confirmation)");
                } else if (isAllOut || isOversCompleted) {
                    // Check who won
                    if (newInnings.runs === target - 1) toast.info("Match Tied! (Pending Confirmation)");
                    else toast.info("Match Ended! Defending Team Won (Pending Confirmation)");
                }
            } else {
                toast.success("Innings Completed! (Pending Switch)");
            }
        }

        // Simple Over Toast
        if (stats.ballsFaced > 0 && stats.ballsFaced % 6 === 0 && stats.ballsFaced !== currentInnings.ballsFaced) {
            toast.info(`Over ${stats.ballsFaced / 6} Completed`, { duration: 2000 });
            // Mark this over as completed (subtract 1 because we're 0-indexed)
            setLastCompletedOver(stats.ballsFaced / 6 - 1);
        } else if (stats.ballsFaced % 6 !== 0) {
            // If we're in a new over (not exactly divisible by 6), clear the completed over
            setLastCompletedOver(null);
        }

        updateMatch(updatedMatch);
    };


    // Calculations
    const oversDecimal = batInns ? ballsToOversDecimal(batInns.ballsFaced) : 0; // eslint-disable-line @typescript-eslint/no-unused-vars
    const oversStr = batInns ? formatOvers(batInns.ballsFaced) : '0.0';
    const remainingBalls = match.totalOvers * 6 - (batInns?.ballsFaced || 0);
    const runsNeeded = target ? target - (batInns?.runs || 0) : 0;

    // Disable scoring if innings/match is effectively over
    const isScoringDisabled = isFirstInningsComplete || isMatchConcluded;

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
                        {match.status === 'completed' && <Badge variant="default" className="mt-2 bg-green-500">COMPLETED</Badge>}
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

                                {target ? (
                                    runsNeeded > 0 ? (
                                    <div className="text-sm font-medium text-blue-500 mb-2">
                                            Target: {target} ({runsNeeded} needed off {remainingBalls} balls)
                                        </div>
                                    ) : (
                                        <div className="text-sm font-medium text-green-500 mb-2">
                                            Target Reached! (Pending Confirmation)
                                        </div>
                                    )
                                ) : (
                                    <div className="text-sm font-medium text-blue-500 mb-2">
                                        1st Innings
                                    </div>
                                )}
                                <div className="text-[5rem] font-black leading-none bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                                    {batInns.runs}/{batInns.wickets}
                                </div>
                                <div className="text-xl text-muted-foreground mt-2 font-mono">
                                    Overs: <span className="text-foreground font-bold">{oversStr}</span> / {match.totalOvers}
                                </div>

                                {/* Current Over Timeline */}
                                {batInns.history.length > 0 && (() => {
                                    // Calculate which over we're in based on legal balls faced
                                    const currentOver = Math.floor(batInns.ballsFaced / 6);
                                    const legalBallsInCurrentOver = batInns.ballsFaced % 6;
                                    
                                    // Check if there are any events in the current over (including extras)
                                    // Count total events to see if new over has started
                                    let tempLegalBallCount = 0;
                                    let eventsInCurrentOver = 0;
                                    for (let i = 0; i < batInns.history.length; i++) {
                                        const event = batInns.history[i];
                                        const isLegal = !['WD', 'NB'].includes(event) && 
                                                      !event.startsWith('WD+') && 
                                                      !event.startsWith('NB+') &&
                                                      event !== 'NB+W+1';
                                        
                                        if (isLegal || event === 'LB' || event.startsWith('LB+') || event === 'NB+W' || event === 'NB+W+1') {
                                            const eventOver = Math.floor(tempLegalBallCount / 6);
                                            if (eventOver === currentOver) {
                                                eventsInCurrentOver++;
                                            }
                                            tempLegalBallCount++;
                                            if (eventOver > currentOver) break;
                                        } else {
                                            // For extras, check which over they belong to
                                            const eventOver = Math.floor(tempLegalBallCount / 6);
                                            if (eventOver === currentOver) {
                                                eventsInCurrentOver++;
                                            }
                                        }
                                    }
                                    
                                    // Determine which over to display
                                    // If current over has events (even if just extras), show current over
                                    // Otherwise, if we just completed an over, show the completed over
                                    const overToDisplay = (legalBallsInCurrentOver === 0 && eventsInCurrentOver === 0 && lastCompletedOver !== null && lastCompletedOver === currentOver - 1) 
                                        ? lastCompletedOver  // Show the completed over (no events in new over yet)
                                        : currentOver;       // Show current over (has events or legal balls)
                                    
                                    const displayOverNumber = overToDisplay;
                                    const displayLegalBalls = overToDisplay === currentOver ? legalBallsInCurrentOver : 6;
                                    
                                    // Get all events from the start of the over we want to display
                                    // Count legal balls to find where the over starts
                                    let legalBallCount = 0;
                                    let overStartIndex = 0;
                                    let foundOverStart = false;
                                    
                                    for (let i = 0; i < batInns.history.length; i++) {
                                        const event = batInns.history[i];
                                        // Check if this is a legal ball
                                        const isLegal = !['WD', 'NB'].includes(event) && 
                                                      !event.startsWith('WD+') && 
                                                      !event.startsWith('NB+') &&
                                                      event !== 'NB+W+1';
                                        
                                        if (isLegal || event === 'LB' || event.startsWith('LB+') || event === 'NB+W' || event === 'NB+W+1') {
                                            const currentOverForThisBall = Math.floor(legalBallCount / 6);
                                            
                                            // If we're at the start of the over we want to display
                                            if (currentOverForThisBall === displayOverNumber && !foundOverStart) {
                                                overStartIndex = i;
                                                foundOverStart = true;
                                            }
                                            
                                            legalBallCount++;
                                            
                                            // If we've moved to the next over and we found our start, we're done
                                            if (foundOverStart && Math.floor(legalBallCount / 6) > displayOverNumber) {
                                                break;
                                            }
                                        } else {
                                            // For extras, if we haven't found the start yet and we're at the right over
                                            if (!foundOverStart && Math.floor(legalBallCount / 6) === displayOverNumber) {
                                                overStartIndex = i;
                                                foundOverStart = true;
                                            }
                                        }
                                    }
                                    
                                    // Get events from the over we want to display
                                    const currentOverBalls = batInns.history.slice(overStartIndex);
                                    
                                    // If showing a completed over, only show events up to 6 legal deliveries
                                    const isCompletedOver = displayOverNumber < currentOver || (displayOverNumber === currentOver && displayLegalBalls === 6);
                                    
                                    // Format ball event for display (compact)
                                    const formatBallEvent = (event: BallEvent) => {
                                        if (event === 'W') return 'W';
                                        if (event === 'WD') return 'WD';
                                        if (event === 'NB') return 'NB';
                                        if (event === 'LB') return 'LB';
                                        if (event.startsWith('W+')) return `W${event.split('+')[1]}`;
                                        if (event.startsWith('WD+')) {
                                            const val = event.split('+')[1];
                                            return val === 'W' ? 'WDW' : `WD${val}`;
                                        }
                                        if (event === 'NB+W+1') return 'NBW1';
                                        if (event.startsWith('NB+')) {
                                            const val = event.split('+')[1];
                                            return val === 'W' ? 'NBW' : `NB${val}`;
                                        }
                                        if (event.startsWith('LB+')) {
                                            const val = event.split('+')[1];
                                            return val === 'W' ? 'LBW' : `LB${val}`;
                                        }
                                        return event;
                                    };

                                    // Check if event is a legal ball
                                    const isLegalBall = (event: BallEvent) => {
                                        return !['WD', 'NB'].includes(event) && 
                                               !event.startsWith('WD+') && 
                                               !event.startsWith('NB+');
                                    };

                                    // Check if event is an extra (wide or no-ball)
                                    const isExtra = (event: BallEvent) => {
                                        return event === 'WD' || 
                                               event === 'NB' || 
                                               event.startsWith('WD+') || 
                                               (event.startsWith('NB+') && event !== 'NB+W' && event !== 'NB+W+1');
                                    };

                                    // Build over display - show all events in order until 6 legal deliveries
                                    const overDisplay: BallEvent[] = [];
                                    let legalBallsShown = 0;
                                    let extrasCount = 0;
                                    
                                    for (const event of currentOverBalls) {
                                        // Add all events to display in order
                                        overDisplay.push(event);
                                        
                                        // Count extras
                                        if (isExtra(event)) {
                                            extrasCount++;
                                        }
                                        
                                        // Count legal balls
                                        if (isLegalBall(event) || event === 'LB' || event.startsWith('LB+')) {
                                            legalBallsShown++;
                                            // Stop after 6 legal deliveries
                                            if (legalBallsShown >= 6) {
                                                break;
                                            }
                                        }
                                    }

                                    return (
                                        <div className="mt-4 pt-4 border-t">
                                            <div className="text-xs text-muted-foreground mb-2 text-center font-medium">
                                                Over {displayOverNumber + 1} • {displayLegalBalls}/6
                                                {extrasCount > 0 && <span className="text-yellow-500"> +{extrasCount}</span>}
                                                {isCompletedOver && <span className="text-green-500 ml-1">✓</span>}
                                            </div>
                                            <div className="flex justify-center items-center gap-1.5 flex-wrap">
                                                {/* Show all events in order until 6 legal deliveries */}
                                                {overDisplay.map((ballEvent, ballIndex) => {
                                                    const isWicket = ballEvent && (
                                                        ballEvent === 'W' || 
                                                        ballEvent.startsWith('W+') || 
                                                        ballEvent === 'WD+W' || 
                                                        ballEvent === 'NB+W' ||
                                                        ballEvent === 'NB+W+1' ||
                                                        ballEvent === 'LB+W'
                                                    );
                                                    const isExtraBall = ballEvent && (
                                                        ballEvent === 'WD' || 
                                                        ballEvent.startsWith('WD+') || 
                                                        ballEvent === 'NB' || 
                                                        (ballEvent.startsWith('NB+') && ballEvent !== 'NB+W' && ballEvent !== 'NB+W+1')
                                                    );
                                                    
                                                    return (
                                                        <div
                                                            key={ballIndex}
                                                            className={`
                                                                min-w-[36px] h-9 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 px-1
                                                                transition-all
                                                                ${isWicket
                                                                    ? 'bg-red-500 text-white shadow-md' 
                                                                    : isExtraBall
                                                                    ? 'bg-yellow-500 text-black shadow-md'
                                                                    : 'bg-primary text-primary-foreground shadow-md'
                                                                }
                                                            `}
                                                            title={ballEvent}
                                                        >
                                                            {formatBallEvent(ballEvent)}
                                                        </div>
                                                    );
                                                })}
                                                
                                                {/* Show empty slots if we haven't reached 6 legal deliveries yet */}
                                                {legalBallsShown < 6 && Array.from({ length: 6 - legalBallsShown }).map((_, index) => (
                                                    <div
                                                        key={`empty-${index}`}
                                                        className="min-w-[36px] h-9 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 px-1 bg-muted/50 border border-dashed border-muted-foreground/30 text-muted-foreground/50"
                                                    >
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Completed Overs Timeline */}
                                {batInns.history.length > 0 && (() => {
                                    const currentOver = Math.floor(batInns.ballsFaced / 6);
                                    const completedOvers: number[] = [];
                                    
                                    // Collect all completed overs (overs that have 6 legal deliveries)
                                    for (let overNum = 0; overNum < currentOver; overNum++) {
                                        completedOvers.push(overNum);
                                    }
                                    
                                    // Also include current over if it's completed
                                    if (batInns.ballsFaced % 6 === 0 && batInns.ballsFaced > 0) {
                                        completedOvers.push(currentOver);
                                    }
                                    
                                    if (completedOvers.length === 0) return null;
                                    
                                    // Helper function to get events for a specific over
                                    const getOverEvents = (overNumber: number) => {
                                        let legalBallCount = 0;
                                        let overStartIndex = -1;
                                        let foundOverStart = false;
                                        
                                        for (let i = 0; i < batInns.history.length; i++) {
                                            const event = batInns.history[i];
                                            const isLegal = !['WD', 'NB'].includes(event) && 
                                                          !event.startsWith('WD+') && 
                                                          !event.startsWith('NB+');
                                            
                                            if (isLegal || event === 'LB' || event.startsWith('LB+')) {
                                                const currentOverForThisBall = Math.floor(legalBallCount / 6);
                                                
                                                if (currentOverForThisBall === overNumber && !foundOverStart) {
                                                    overStartIndex = i;
                                                    foundOverStart = true;
                                                }
                                                
                                                legalBallCount++;
                                                
                                                if (foundOverStart && Math.floor(legalBallCount / 6) > overNumber) {
                                                    break;
                                                }
                                            } else {
                                                if (!foundOverStart && Math.floor(legalBallCount / 6) === overNumber) {
                                                    overStartIndex = i;
                                                    foundOverStart = true;
                                                }
                                            }
                                        }
                                        
                                        if (overStartIndex === -1) return [];
                                        
                                        const overEvents: BallEvent[] = [];
                                        let legalBallsInOver = 0;
                                        
                                        for (let i = overStartIndex; i < batInns.history.length; i++) {
                                            const event = batInns.history[i];
                                            const isLegal = !['WD', 'NB'].includes(event) && 
                                                          !event.startsWith('WD+') && 
                                                          !event.startsWith('NB+');
                                            
                                            overEvents.push(event);
                                            
                                            if (isLegal || event === 'LB' || event.startsWith('LB+')) {
                                                legalBallsInOver++;
                                                if (legalBallsInOver >= 6) break;
                                            }
                                        }
                                        
                                        return overEvents;
                                    };
                                    
                                    // Format ball event for display
                                    const formatBallEvent = (event: BallEvent) => {
                                        if (event === 'W') return 'W';
                                        if (event === 'WD') return 'WD';
                                        if (event === 'NB') return 'NB';
                                        if (event === 'LB') return 'LB';
                                        if (event.startsWith('W+')) return `W${event.split('+')[1]}`;
                                        if (event.startsWith('WD+')) {
                                            const val = event.split('+')[1];
                                            return val === 'W' ? 'WDW' : `WD${val}`;
                                        }
                                        if (event === 'NB+W+1') return 'NBW1';
                                        if (event.startsWith('NB+')) {
                                            const val = event.split('+')[1];
                                            return val === 'W' ? 'NBW' : `NB${val}`;
                                        }
                                        if (event.startsWith('LB+')) {
                                            const val = event.split('+')[1];
                                            return val === 'W' ? 'LBW' : `LB${val}`;
                                        }
                                        return event;
                                    };
                                    
                                    const isExtra = (event: BallEvent) => {
                                        return event === 'WD' || 
                                               event === 'NB' || 
                                               event.startsWith('WD+') || 
                                               (event.startsWith('NB+') && event !== 'NB+W' && event !== 'NB+W+1');
                                    };
                                    
                                    return null; // Don't render here, will render below scoring buttons
                                })()}

                                <div className="flex justify-center gap-2 h-8 mt-6">
                                    {isFirstInningsComplete && (
                                        <Badge className="bg-black border border-green-500 text-green-500 hover:bg-green-500 hover:text-white">Innings Complete</Badge>
                                    )}
                                    {isFirstInningsComplete && (
                                        <Button
                                            onClick={() => setIsSwitchOpen(true)}
                                            variant="destructive"
                                            className="gap-2 animate-pulse h-8"
                                        >
                                            Start 2nd Innings
                                        </Button>
                                    )}
                                    {isMatchConcluded && hasAnyPlay && (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="default" className="gap-2 mt-2 mb-4 h-8 bg-green-600 hover:bg-green-700 animate-pulse">
                                                    <Trophy className="w-4 h-4" /> End Match & Show Result
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Confirm Match Result</DialogTitle>
                                                    <DialogDescription>
                                                        Are you sure you want to end the match? This will finalize the result.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button variant="outline">Cancel</Button>
                                                    </DialogClose>
                                                    <Button onClick={() => {
                                                        // Calculate Result Logic Here
                                                        if (target && batInns) {
                                                            const battingTeam = match.battingTeamId === teamA.id ? teamA : teamB;
                                                            const bowlingTeam = match.bowlingTeamId === teamA.id ? teamA : teamB;

                                                            if (batInns.runs >= target) {
                                                                completeMatch(match.battingTeamId, `${battingTeam.name} won by ${10 - batInns.wickets} wickets`);
                                                            } else if (batInns.runs === target - 1) {
                                                                completeMatch(null, "Match Tied");
                                                            } else {
                                                                const margin = target - 1 - batInns.runs;
                                                                completeMatch(match.bowlingTeamId, `${bowlingTeam.name} won by ${margin} runs`);
                                                            }
                                                        }
                                                    }}>Confirm End Match</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    )}


                                </div>

                            </div>

                            {/* Scoring Area */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {['0', '1', '2', '3', '4', '6'].map(r => (
                                    <Button
                                        key={r}
                                        onClick={() => handleScoring(r as BallEvent)}
                                        disabled={!!isScoringDisabled}
                                        variant="outline"
                                        className="h-16 text-2xl font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
                                    >
                                        {r}
                                    </Button>
                                ))}
                                <Button onClick={() => handleScoring('W')} disabled={!!isScoringDisabled} variant="destructive" className="h-16 text-xl font-bold">OUT</Button>
                                
                                {/* Wicket + Dropdown */}
                                <Popover open={wicketPlusOpen} onOpenChange={setWicketPlusOpen}>
                                    <PopoverTrigger asChild>
                                        <Button 
                                            disabled={!!isScoringDisabled} 
                                            variant="destructive" 
                                            className="h-16 text-xl font-bold gap-1"
                                        >
                                            W+ <ChevronDown className="w-4 h-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-48 p-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            {[1, 2].map(runs => (
                                                <Button
                                                    key={runs}
                                                    onClick={() => {
                                                        handleScoring(`W+${runs}` as BallEvent);
                                                        setWicketPlusOpen(false);
                                                    }}
                                                    disabled={!!isScoringDisabled}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs"
                                                >
                                                    W+{runs}
                                                </Button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                <Button onClick={() => handleScoring('WD')} disabled={!!isScoringDisabled} variant="secondary" className="h-16 text-xl font-bold">WD</Button>
                                
                                {/* Wide + Dropdown */}
                                <Popover open={widePlusOpen} onOpenChange={setWidePlusOpen}>
                                    <PopoverTrigger asChild>
                                        <Button 
                                            disabled={!!isScoringDisabled} 
                                            variant="secondary" 
                                            className="h-16 text-xl font-bold gap-1"
                                        >
                                            WD+ <ChevronDown className="w-4 h-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-48 p-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                onClick={() => {
                                                    handleScoring('WD+W' as BallEvent);
                                                    setWidePlusOpen(false);
                                                }}
                                                disabled={!!isScoringDisabled}
                                                variant="outline"
                                                size="sm"
                                                className="text-xs"
                                            >
                                                WD+W
                                            </Button>
                                            {[1, 2, 3, 4].map(runs => (
                                                <Button
                                                    key={runs}
                                                    onClick={() => {
                                                        handleScoring(`WD+${runs}` as BallEvent);
                                                        setWidePlusOpen(false);
                                                    }}
                                                    disabled={!!isScoringDisabled}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs"
                                                >
                                                    WD+{runs}
                                                </Button>
                                            ))}
                            </div>
                                    </PopoverContent>
                                </Popover>

                                <Button onClick={() => handleScoring('NB')} disabled={!!isScoringDisabled} variant="secondary" className="h-16 text-xl font-bold">NB</Button>
                                
                                {/* No Ball + Dropdown */}
                                <Popover open={nbPlusOpen} onOpenChange={setNbPlusOpen}>
                                    <PopoverTrigger asChild>
                                        <Button 
                                            disabled={!!isScoringDisabled} 
                                            variant="secondary" 
                                            className="h-16 text-xl font-bold gap-1"
                                        >
                                            NB+ <ChevronDown className="w-4 h-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-48 p-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                onClick={() => {
                                                    handleScoring('NB+W' as BallEvent);
                                                    setNbPlusOpen(false);
                                                }}
                                                disabled={!!isScoringDisabled}
                                                variant="outline"
                                                size="sm"
                                                className="text-xs"
                                            >
                                                NB+W
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    handleScoring('NB+W+1' as BallEvent);
                                                    setNbPlusOpen(false);
                                                }}
                                                disabled={!!isScoringDisabled}
                                                variant="outline"
                                                size="sm"
                                                className="text-xs"
                                            >
                                                NBW+1
                                            </Button>
                                            {[1, 2, 3, 4, 6].map(runs => (
                                                <Button
                                                    key={runs}
                                                    onClick={() => {
                                                        handleScoring(`NB+${runs}` as BallEvent);
                                                        setNbPlusOpen(false);
                                                    }}
                                                    disabled={!!isScoringDisabled}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs"
                                                >
                                                    NB+{runs}
                                                </Button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="flex justify-between items-center border-t pt-6 flex-wrap gap-2">
                                <div className="flex gap-2 flex-wrap">
                                    {/* Action Buttons based on State */}




                                    {!isMatchConcluded && !isFirstInningsComplete && !target && (
                                        <Button variant="secondary" onClick={() => setIsSwitchOpen(true)}>
                                            Switch Innings
                                        </Button>
                                    )}

                                    <Dialog open={isSwitchOpen} onOpenChange={setIsSwitchOpen}>
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


                                    <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="gap-2" disabled={!!isScoringDisabled}>
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

                            {/* Completed Overs Timeline - Below Scoring Buttons */}
                            {batInns.history.length > 0 && (() => {
                                const currentOver = Math.floor(batInns.ballsFaced / 6);
                                const completedOvers: number[] = [];
                                
                                // Collect all completed overs (overs that have 6 legal deliveries)
                                for (let overNum = 0; overNum < currentOver; overNum++) {
                                    completedOvers.push(overNum);
                                }
                                
                                // Also include current over if it's completed
                                if (batInns.ballsFaced % 6 === 0 && batInns.ballsFaced > 0) {
                                    completedOvers.push(currentOver);
                                }
                                
                                if (completedOvers.length === 0) return null;
                                
                                // Helper function to get events for a specific over
                                const getOverEvents = (overNumber: number) => {
                                    let legalBallCount = 0;
                                    let overStartIndex = -1;
                                    let foundOverStart = false;
                                    
                                    for (let i = 0; i < batInns.history.length; i++) {
                                        const event = batInns.history[i];
                                        const isLegal = !['WD', 'NB'].includes(event) && 
                                                      !event.startsWith('WD+') && 
                                                      !event.startsWith('NB+') &&
                                                      event !== 'NB+W+1';
                                        
                                        if (isLegal || event === 'LB' || event.startsWith('LB+') || event === 'NB+W' || event === 'NB+W+1') {
                                            const currentOverForThisBall = Math.floor(legalBallCount / 6);
                                            
                                            if (currentOverForThisBall === overNumber && !foundOverStart) {
                                                overStartIndex = i;
                                                foundOverStart = true;
                                            }
                                            
                                            legalBallCount++;
                                            
                                            if (foundOverStart && Math.floor(legalBallCount / 6) > overNumber) {
                                                break;
                                            }
                                        } else {
                                            if (!foundOverStart && Math.floor(legalBallCount / 6) === overNumber) {
                                                overStartIndex = i;
                                                foundOverStart = true;
                                            }
                                        }
                                    }
                                    
                                    if (overStartIndex === -1) return [];
                                    
                                    const overEvents: BallEvent[] = [];
                                    let legalBallsInOver = 0;
                                    
                                    for (let i = overStartIndex; i < batInns.history.length; i++) {
                                        const event = batInns.history[i];
                                        const isLegal = !['WD', 'NB'].includes(event) && 
                                                      !event.startsWith('WD+') && 
                                                      !event.startsWith('NB+') &&
                                                      event !== 'NB+W+1';
                                        
                                        overEvents.push(event);
                                        
                                        if (isLegal || event === 'LB' || event.startsWith('LB+') || event === 'NB+W' || event === 'NB+W+1') {
                                            legalBallsInOver++;
                                            if (legalBallsInOver >= 6) break;
                                        }
                                    }
                                    
                                    return overEvents;
                                };
                                
                                // Format ball event for display
                                const formatBallEvent = (event: BallEvent) => {
                                    if (event === 'W') return 'W';
                                    if (event === 'WD') return 'WD';
                                    if (event === 'NB') return 'NB';
                                    if (event === 'LB') return 'LB';
                                    if (event.startsWith('W+')) return `W${event.split('+')[1]}`;
                                    if (event.startsWith('WD+')) {
                                        const val = event.split('+')[1];
                                        return val === 'W' ? 'WDW' : `WD${val}`;
                                    }
                                    if (event === 'NB+W+1') return 'NBW1';
                                    if (event.startsWith('NB+')) {
                                        const val = event.split('+')[1];
                                        return val === 'W' ? 'NBW' : `NB${val}`;
                                    }
                                    if (event.startsWith('LB+')) {
                                        const val = event.split('+')[1];
                                        return val === 'W' ? 'LBW' : `LB${val}`;
                                    }
                                    return event;
                                };
                                
                                const isExtra = (event: BallEvent) => {
                                    return event === 'WD' || 
                                           event === 'NB' || 
                                           event.startsWith('WD+') || 
                                           (event.startsWith('NB+') && event !== 'NB+W' && event !== 'NB+W+1');
                                };
                                
                                return (
                                    <div className="mt-6 pt-6 border-t">
                                        {completedOvers.reverse().map((overNum, index) => {
                                            const overEvents = getOverEvents(overNum);
                                            
                                            return (
                                                <div key={overNum}>
                                                    <div className="flex items-center gap-4 py-3 relative">
                                                        <div className="text-sm font-medium text-muted-foreground min-w-[60px] flex-shrink-0">
                                                            Over {overNum + 1}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto pb-1 scrollbar-hide">
                                                            {overEvents.map((ballEvent, ballIndex) => {
                                                                const isWicket = ballEvent && (
                                                                    ballEvent === 'W' || 
                                                                    ballEvent.startsWith('W+') || 
                                                                    ballEvent === 'WD+W' || 
                                                                    ballEvent === 'NB+W' ||
                                                                    ballEvent === 'NB+W+1' ||
                                                                    ballEvent === 'LB+W'
                                                                );
                                                                const isExtraBall = ballEvent && (
                                                                    ballEvent === 'WD' || 
                                                                    ballEvent.startsWith('WD+') || 
                                                                    ballEvent === 'NB' || 
                                                                    (ballEvent.startsWith('NB+') && ballEvent !== 'NB+W' && ballEvent !== 'NB+W+1')
                                                                );
                                                                
                                                                return (
                                                                    <div
                                                                        key={ballIndex}
                                                                        className={`
                                                                            min-w-[36px] h-9 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 px-1
                                                                            transition-all
                                                                            ${isWicket
                                                                                ? 'bg-red-500 text-white shadow-md' 
                                                                                : isExtraBall
                                                                                ? 'bg-yellow-500 text-black shadow-md'
                                                                                : 'bg-primary text-primary-foreground shadow-md'
                                                                            }
                                                                        `}
                                                                        title={ballEvent}
                                                                    >
                                                                        {formatBallEvent(ballEvent)}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {/* Gradient overlay on the right to indicate scrollability */}
                                                        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-card to-transparent pointer-events-none"></div>
                                                    </div>
                                                    {index < completedOvers.length - 1 && (
                                                        <div className="border-b border-muted/30"></div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {match.status === 'completed' && (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center p-4 bg-green-500/10 rounded-full mb-6 text-green-500">
                                <Trophy className="w-12 h-12" />
                            </div>
                            <h3 className="text-2xl font-bold text-green-500 mb-2">Match Completed</h3>
                            {match.result ? (
                            <p className="text-3xl font-black mb-8">{match.result}</p>
                            ) : (
                                <p className="text-xl text-muted-foreground mb-8">Match ended with no result recorded</p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
                                {/* Team A Score */}
                                <div className={`p-6 rounded-xl border ${match.winnerId === teamA.id ? 'bg-green-500/5 border-green-500/20' : 'bg-card'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="font-bold text-xl">{teamA.name}</h4>
                                        {match.winnerId === teamA.id && <Badge className="bg-green-500">Winner</Badge>}
                                    </div>
                                    <div className="text-4xl font-black mb-1">
                                        {match.innings[teamA.id]?.runs || 0}/{match.innings[teamA.id]?.wickets || 0}
                                    </div>
                                    <div className="text-muted-foreground font-mono">
                                        {formatOvers(match.innings[teamA.id]?.ballsFaced || 0)} Overs
                                    </div>
                                </div>

                                {/* Team B Score */}
                                <div className={`p-6 rounded-xl border ${match.winnerId === teamB.id ? 'bg-green-500/5 border-green-500/20' : 'bg-card'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="font-bold text-xl">{teamB.name}</h4>
                                        {match.winnerId === teamB.id && <Badge className="bg-green-500">Winner</Badge>}
                                    </div>
                                    <div className="text-4xl font-black mb-1">
                                        {match.innings[teamB.id]?.runs || 0}/{match.innings[teamB.id]?.wickets || 0}
                                    </div>
                                    <div className="text-muted-foreground font-mono">
                                        {formatOvers(match.innings[teamB.id]?.ballsFaced || 0)} Overs
                                    </div>
                                </div>
                            </div>

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

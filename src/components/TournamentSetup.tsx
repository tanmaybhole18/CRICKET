'use client';
import { useState } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Trophy } from 'lucide-react';

export default function TournamentSetup() {
    const { createTournament } = useTournament();
    const [name, setName] = useState('');
    const [overs, setOvers] = useState(5);
    const [teams, setTeams] = useState<string[]>(['', '']); // Start with 2 empty

    const addTeam = () => setTeams([...teams, '']);
    const updateTeam = (index: number, val: string) => {
        const newTeams = [...teams];
        newTeams[index] = val;
        setTeams(newTeams);
    };
    const removeTeam = (index: number) => {
        if (teams.length > 2) {
            setTeams(teams.filter((_, i) => i !== index));
        }
    };

    const handleCreate = () => {
        const validTeams = teams.filter(t => t.trim() !== '');
        if (!name || validTeams.length < 2) return alert("Please enter valid name and at least 2 teams");

        createTournament({
            name,
            teamCount: validTeams.length,
            playersPerTeam: 11, // default
            oversPerMatch: overs
        }, validTeams);
    };

    return (
        <div className="container max-w-2xl mx-auto py-12">
            <div className="flex justify-center mb-8">
                <Trophy className="w-16 h-16 text-primary animate-bounce" />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl text-center">Create Tournament</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Tournament Name</Label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Corporate Cup 2024"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Overs Per Match: {overs}</Label>
                        <div className="flex gap-2">
                            {[4, 5, 10, 20].map(o => (
                                <Button
                                    key={o}
                                    onClick={() => setOvers(o)}
                                    variant={overs === o ? 'default' : 'outline'}
                                    className="flex-1"
                                >
                                    {o} Overs
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label>Teams ({teams.length})</Label>
                            <Button onClick={addTeam} variant="outline" size="sm" className="gap-2">
                                <Plus className="w-4 h-4" /> Add Team
                            </Button>
                        </div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {teams.map((t, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-muted-foreground w-6 text-right">{i + 1}.</span>
                                    <Input
                                        value={t}
                                        onChange={e => updateTeam(i, e.target.value)}
                                        placeholder={`Team ${i + 1}`}
                                    />
                                    {teams.length > 2 && (
                                        <Button
                                            onClick={() => removeTeam(i)}
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive/80"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleCreate} className="w-full" size="lg">
                        Start Tournament
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

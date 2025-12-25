'use client';
import { useTournament } from '@/context/TournamentContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PointsTable() {
    const { standings } = useTournament();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Points Table</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">Pos</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead>P</TableHead>
                            <TableHead className="text-green-500">W</TableHead>
                            <TableHead className="text-red-500">L</TableHead>
                            <TableHead>T</TableHead>
                            <TableHead>NRR</TableHead>
                            <TableHead className="text-right">Pts</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {standings.map((team, index) => (
                            <TableRow key={team.id}>
                                <TableCell className="font-medium">{index + 1}</TableCell>
                                <TableCell className="font-bold">{team.name}</TableCell>
                                <TableCell>{team.played}</TableCell>
                                <TableCell className="text-green-500 font-bold">{team.won}</TableCell>
                                <TableCell className="text-red-500 font-bold">{team.lost}</TableCell>
                                <TableCell>{team.tied}</TableCell>
                                <TableCell>{team.nrr.toFixed(3)}</TableCell>
                                <TableCell className="text-right text-lg font-bold">{team.points}</TableCell>
                            </TableRow>
                        ))}
                        {standings.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                                    No matches played yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

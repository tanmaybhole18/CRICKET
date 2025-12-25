'use client';
import { useTournament } from '@/context/TournamentContext';
import TournamentSetup from '@/components/TournamentSetup';
import PointsTable from '@/components/PointsTable';
import FixturesList from '@/components/FixturesList';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';

export default function Home() {
  const { state, resetTournament } = useTournament();

  // Prevent flash of unstyled content or hydration mismatch on setup
  if (!state.isInitialized) {
    return <TournamentSetup />;
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            {state.settings?.name}
          </h1>
          <p className="text-muted-foreground mt-1">Tournament Dashboard</p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={resetTournament}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Reset Tournament
        </Button>
      </header>

      <Tabs defaultValue="fixtures" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
          <TabsTrigger value="table">Points Table</TabsTrigger>
        </TabsList>

        <TabsContent value="fixtures" className="mt-6 animate-in fade-in-50 duration-500">
          <FixturesList />
        </TabsContent>

        <TabsContent value="table" className="mt-6 animate-in fade-in-50 duration-500">
          <PointsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

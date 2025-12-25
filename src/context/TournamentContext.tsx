'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { TournamentState, TournamentSettings, Team, Match, TeamStats } from '@/types';
import { generateFixtures, calculateStandings, generateId } from '@/utils/cricket';

interface TournamentContextType {
    state: TournamentState;
    createTournament: (settings: TournamentSettings, teamNames: string[]) => void;
    resetTournament: () => void;
    updateMatch: (updatedMatch: Match) => void;
    standings: TeamStats[];
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const TournamentProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<TournamentState>({
        settings: null,
        teams: [],
        matches: [],
        isInitialized: false,
    });
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from LocalStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('cricket_tournament_data');
            if (saved) {
                try {
                    setState(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to load tournament data", e);
                }
            }
            setIsLoaded(true);
        }
    }, []);

    // Save to LocalStorage
    useEffect(() => {
        if (isLoaded && typeof window !== 'undefined') {
            localStorage.setItem('cricket_tournament_data', JSON.stringify(state));
        }
    }, [state, isLoaded]);

    const createTournament = (settings: TournamentSettings, teamNames: string[]) => {
        const teams: Team[] = teamNames.map(name => ({
            id: generateId(),
            name
        }));

        const fixtures = generateFixtures(teams, settings.oversPerMatch);

        setState({
            settings,
            teams,
            matches: fixtures,
            isInitialized: true
        });
    };

    const resetTournament = () => {
        if (confirm('Are you sure you want to reset the tournament? All data will be lost.')) {
            setState({
                settings: null,
                teams: [],
                matches: [],
                isInitialized: false
            });
            localStorage.removeItem('cricket_tournament_data');
        }
    };

    const updateMatch = (updatedMatch: Match) => {
        setState(prev => ({
            ...prev,
            matches: prev.matches.map(m => m.id === updatedMatch.id ? updatedMatch : m)
        }));
    };

    const standings = calculateStandings(state.teams, state.matches);

    // Avoid hydration mismatch by rendering children only after load (optional, but good for localstorage apps)
    // Actually, we can return null until loaded if we want strict consistency or just render default.

    return (
        <TournamentContext.Provider value={{ state, createTournament, resetTournament, updateMatch, standings }}>
            {children}
        </TournamentContext.Provider>
    );
};

export const useTournament = () => {
    const context = useContext(TournamentContext);
    if (!context) throw new Error("useTournament must be used within TournamentProvider");
    return context;
};

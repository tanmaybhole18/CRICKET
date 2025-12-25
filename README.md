# Cricket Tournament Manager

A Next.js application to manage cricket tournaments, fixtures, scoring, and points tables.

## Features
- **Tournament Setup**: Create custom tournaments with any number of teams and overs.
- **Fixtures**: Automatic round-robin fixture generation.
- **Live Scoring**: Ball-by-ball manual scoring interface.
- **Points Table**: Auto-updating standings with NRR calculation.
- **Persistence**: Data is saved to your browser's LocalStorage.

## Tech Stack
- Next.js (App Router)
- TypeScript
- CSS Modules (Custom Dark Theme)
- React Context

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Scoring Guide
- **Start Match**: Click on an upcoming match, select who bats first.
- **Scoring**: Click buttons (0, 1, 4, 6, W, WD, NB) to record balls.
- **Switch Innings**: When overs are done, click "End Innings / Switch".
- **End Match**: Click "End Match" or it handles auto-win in 2nd innings.

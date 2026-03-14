# GTMv2 - Go-To-Market Intelligence Platform

## Dev Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server on localhost:3000
npm run build      # Production build (also validates compilation)
npm run lint       # Run ESLint on src/
npm run typecheck  # Run TypeScript type checking (no emit)
```

## Architecture

- **Framework**: Next.js 16 + React 19 + TypeScript 5.9
- **Styling**: Tailwind CSS 4 with PostCSS
- **Charts**: Recharts, D3
- **Maps**: Leaflet + react-leaflet, Google Maps (@vis.gl/react-google-maps)
- **Tables**: TanStack React Table

## Project Structure

```
src/
├── app/            # Next.js app router (page.tsx, layout.tsx, globals.css)
├── components/
│   ├── data/       # DataExplorer
│   ├── layout/     # Shell layout
│   ├── map/        # MapPanel, MapInner (Leaflet)
│   ├── panels/     # RankingPanel, DetailPanel, AnomalyTicker
│   └── target/     # TargetView
├── hooks/          # useData, useFilters
├── lib/            # scoring, stateGeo, utils
└── types/          # TypeScript type definitions
public/data/        # Static JSON/GeoJSON data files
```

## Key Patterns

- Three views: Command (default dashboard), Explore (data explorer), Target (targeting config)
- 9 scoring dimensions configured in `src/lib/scoring.ts`
- All data is static JSON in `public/data/` - no API or database
- Dark Palantir-inspired UI theme with cyan accents
- No environment variables required

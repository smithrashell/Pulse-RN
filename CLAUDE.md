# Pulse RN - Project Conventions

## Tech Stack
- React Native 0.81 with Expo SDK 54
- Expo Router (file-based routing)
- React Native Paper (Material Design 3 UI)
- Zustand (state management)
- Drizzle ORM with expo-sqlite
- TypeScript, date-fns

## Project Structure
```
app/                    # Expo Router screens (file-based routing)
  (tabs)/              # Tab navigation screens
  focus-area/          # Focus area screens
  review/              # Review screens (weekly, monthly)
src/
  components/          # React Native components (barrel exports via index.ts)
  db/                  # Database layer
    schema.ts          # Drizzle schema definitions
    queries/           # Query modules (focusAreas.ts, sessions.ts, etc.)
  hooks/               # Custom React hooks (useTimer, useFocusAreas, etc.)
  services/            # Business logic services (singleton objects)
  stores/              # Zustand state stores
  theme/               # Theme configuration
  utils/               # Utility functions (time formatting, etc.)
```

## Naming Conventions
- **Stores**: `use[Name]Store` (e.g., `useTimerStore`, `useTodayStore`)
- **Hooks**: `use[Name]` (e.g., `useTimer`, `useFocusAreas`)
- **Services**: `[name]Service` object with methods (e.g., `engagementService`)
- **Queries**: `[name]Queries` object (e.g., `sessionQueries`, `focusAreaQueries`)
- **Components**: PascalCase, functional components with hooks

## Code Style
- Named exports from index.ts for barrel exports
- TypeScript interfaces defined where used
- Functional React components with hooks
- useCallback/useMemo for performance
- Ionicons from @expo/vector-icons for icons

## Commands
```bash
npm start              # Start Expo dev server
npm run lint           # Run ESLint
npm run lint:fix       # Fix lint issues
npm run format         # Format with Prettier
npm run typecheck      # TypeScript check
```

## Database
- SQLite via expo-sqlite with Drizzle ORM
- Schema in src/db/schema.ts
- Migrations handled by Drizzle

## State Management Pattern
- Zustand stores for global state (timer, today data, notifications)
- Local useState for component-specific state
- useFocusEffect for screen focus data loading

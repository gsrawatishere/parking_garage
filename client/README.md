# Client App

React and TypeScript operator console for the parking garage platform.

## Structure

```text
src/
	app/          Application composition and session/page orchestration
	components/   Shared presentational UI and layout components
	lib/          External boundaries, including the typed backend API client
	pages/        User-facing workflows grouped by product area
	stores/       Zustand global session, workspace, navigation, and refresh state
	styles/       Global CSS and theme tokens
	types/        Shared frontend domain types
	utils/        Pure formatting and display helpers
```

`app/App.tsx` composes the application and reacts to global state from `stores/useAppStore.ts`. Zustand owns session state, garage selection, navigation, errors, and refresh invalidation. Pages own workflow-local state and call the API boundary in `lib/api.ts`. Components are presentational and reusable. Backend business rules remain server-authoritative.

## Run

```bash
npm install
npm run dev
```

The client uses `http://localhost:5000` by default. Set `VITE_API_URL` in `client/.env` to use another backend URL.

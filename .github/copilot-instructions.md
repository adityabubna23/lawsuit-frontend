## Repo guide for AI coding agents

Short, actionable notes to help an AI be productive working in this codebase.

- Project type: React + TypeScript app built with Vite. Entry: `src/main.tsx`.
- Styling: TailwindCSS; config at `tailwind.config.cjs` and `src/index.css`.
- Router & layouts: Routes are defined in `src/routes.tsx`; top-level layouts live in `src/layouts/`.

- Component structure: atomic folders under `src/components/` — `atoms/`, `molecules/`, `organisms/`.
  - Prefer adding small, focused components into the appropriate folder.
  - Example: `src/components/atoms/Button.tsx` exposes `variant: 'primary'|'secondary'|'ghost'` and `size: 'sm'|'md'|'lg'`.

- State management: lightweight global state uses `zustand` in `src/stores/*` (e.g. `authStore.ts`, `lawyerStore.ts`).

- API layer: single axios instance in `src/services/api.ts`. Use exported APIs (e.g. `lawyersApi`, `authApi`). Auth token is injected from `useAuthStore`.

- Mocks and integration: MSW is used in dev. Worker bootstrap in `src/mocks/browser.ts` and `public/mockServiceWorker.js`.
  - `src/main.tsx` starts the mock worker when `import.meta.env.DEV`.
  - Test code may not auto-start MSW; use handlers in `src/mocks/` for unit/integration tests.

- Tests & tooling:
  - Tests run with Jest + ts-jest. Config: `jest.config.json`.
  - Test files pattern: `**/__tests__/**/*.test.(ts|tsx)`.
  - Test setup: `src/setupTests.ts` (e.g. IntersectionObserver mocks).
  - Run tests: `npm test` or `npm run test:watch`.

- Common developer commands:
  - Dev server: `npm run dev` (Vite)
  - Build: `npm run build` (runs `tsc` then `vite build`)
  - Lint: `npm run lint`
  - Format: `npm run format`

- Conventions and patterns to follow (discoverable in code):
  - Use the `@` alias to import internal modules (configured in `vite.config.ts` and `tsconfig.json`). E.g. `import { useAuthStore } from '@/stores/authStore'`.
  - Types live in `src/types/index.ts`. Prefer using typed props for components (FC + interfaces).
  - UI is Tailwind-first; prefer utility classes over custom CSS for new components.
  - MSW handlers use `src/mocks/handlers.ts` and `mockData.ts` to simulate backend responses — mirror those shapes when calling `services/api.ts`.

- Tests specifics:
  - Use `@testing-library/react` and `@testing-library/jest-dom` (already installed).
  - For components that call APIs, either start MSW in the test or mock `services/api.ts` with jest mocks.
  - File asset imports are mocked by `src/__mocks__/fileMock.js` (see `jest.config.json`).

- Adding routes or pages:
  - Add new page components under `src/pages/` and update `src/routes.tsx`.
  - App-level layout is `src/layouts/AppLayout.tsx` and `AdminLayout.tsx` — nest routes inside them.

- Quick examples:
  - Add a new component: place in `src/components/molecules/`, use typed props, and export default the FC.
  - Call API with `await lawyersApi.getAll({ q, page: 1 })` and rely on MSW mocks during dev.

If anything above is unclear or you want more examples (tests, a PR checklist, or patterns for backend integration), tell me which section to expand.

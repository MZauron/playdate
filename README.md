# Kindred

Plan a playdate with families you already know: pick friends, a time and a place; friends answer in the app or from a text link; the organizer confirms.

- What to build: `docs/DESIGN.md` (from the Kindred design doc)
- What to build next: `docs/NEXT.md`
- Open decisions: `docs/QUESTIONS.md`
- How Claude Code works in this repo: `CLAUDE.md`

## Commands
Node 22 (`.nvmrc`), npm.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` / `npm run test:watch` | Vitest |
| `npm run test:smoke` | Playwright smoke tests (run `npx playwright install chromium` once) |

Before every commit: `npm run lint && npm run typecheck && npm test`. Copy `.env.example` to `.env.local` when a task needs variables.

To start building, open a Claude Code session on this repo and send: "Do T01 in docs/NEXT.md."

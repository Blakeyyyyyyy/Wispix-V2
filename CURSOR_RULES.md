# Wispix Project Rules — Localhost Stability

## Boot Discipline
- Always start the stack from repo root with: `npm run dev:full`.
- Do not run the frontend directly via `npx vite`. Use the script so ports & health checks apply.
- If a port is stuck, run: `npm run dev:clean` (kills 3001/3002) then `npm run dev:full`.

## Ports
- Backend must bind `127.0.0.1:3001`.
- MVP frontend must bind `127.0.0.1:3002` with `strictPort: true`.
- Never auto-bump ports. Fail fast if 3002 is taken.

## Node & Env
- Use Node version from `.nvmrc`. Do not change without approval.
- `.env` lives at repo root. Frontend-exposed envs use `VITE_` prefix.
- Frontend reads API base from `import.meta.env.VITE_API_URL` only.

## Health & Readiness
- `/health` endpoint is mandatory and must return `{ ok: true }`.
- Frontend should check `/health` once on boot and render a clear error if API is down.

## Model/Agent Router (behavioral)
- For first 2–3 turns in the builder chat, stick to a single model (Opus 4.1 or Sonnet 3.5) to avoid ping-pong behavior.
- Never dump multi-page "plans". Use event schema (hypothesis/options/question/decision/build_*).
- Ask at most one decisive question; otherwise proceed with assumptions and list them.

## Cursor Etiquette
- When modifying dev scripts, vite config, or ports, update this rules file in the same PR.
- Prefer small, reversible changes. If you change ports, adjust `killport.sh`, `package.json`, and rules in one commit.

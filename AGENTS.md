# AGENTS.md

## Overview

Vanilla JS Pac-Man MVP (HTML/CSS/Canvas). No dependencies, bundler, tests, linter, or formatter — there is no `package.json`.

- Run: open `src/index.html` in a browser, or serve it statically, e.g. `python -m http.server 8000 --directory src`.
- Verify manually in the browser: start, move, eat dots, lose a life, win/lose overlay.

## Spec-driven workflow

- This repo exists to practice spec-driven development, using the `spec` and `spec-impl` skills.
- New features go through the `spec` skill and are stored as `specs/NN-slug.md` (folder does not exist yet; start at `01-`). Implement only specs whose state is "Approved"/"Aprobado"; `spec-impl` creates the `spec-NN-slug` branch.
- `.agents/skills/` is vendored and pinned by `skills-lock.json`; do not edit it by hand.

## Architecture

- Four classic scripts, no ES modules. `src/index.html` load order matters: `maze.js` → `game.js` → `render.js` → `main.js`.
- Everything communicates via `window` globals. `game.js` depends on `MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`; `render.js` depends on `DIRS`.
- `maze.js` holds the pristine 28×31 grid built from `MAZE_STR`; tile codes: `0` empty, `1` wall, `2` dot, `3` ghost-pen door. Never mutate `MAZE` — `createGame()` copies it into `game.grid`, and rendering must use `game.grid` so eaten dots disappear.
- `game.js` has state/rules, `render.js` all canvas drawing, `main.js` the rAF loop, keyboard, and overlays.
- `TILE = 20` in `render.js` produces the fixed 560×620 canvas. Changing it requires updating the canvas attributes in `index.html` and `#game-wrap` in `style.css`.

## Gameplay invariants

- Movement is cell-aligned (`aligned()`, 1e-3 tolerance). `PACMAN_SPEED = 0.125` and `GHOST_SPEED = 0.1` are deliberate: they land exactly on cell centers every 8/10 frames. Arbitrary speeds cause drift and prevent turns.
- Pac-Man is blocked by walls and the pen door (`3`); ghosts are blocked only by walls, so they can cross the door.
- Tunnels work only on `TUNNEL_ROW` (14); `canMove()` and `wrapTunnel()` must stay in sync when editing maze edges.
- Coordinates are `{ x: col, y: row }` with origin at the top-left. The maze must stay 28 chars wide and 31 rows tall.

## Conventions

- Comments, README, and all UI text are in Spanish; match that.
- Keep the existing non-standard style: 2-space indent, single quotes, semicolons, spaces inside parentheses (`fn( args )`). Do not reformat with external tooling.

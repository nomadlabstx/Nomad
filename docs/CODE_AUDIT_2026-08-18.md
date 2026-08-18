# Nomad Code Audit — 18 Aug 2026

**Supersedes:** [FULL_CODE_AUDIT.md](./FULL_CODE_AUDIT.md) (20 Jun 2026). That document described a prototype with data-wiping bugs and no tests. This audit is the current picture after the August device work.

**Repo:** https://github.com/nomadlabstx/Nomad (`main` @ `ff22e89` at time of audit)  
**How to read this:** Start with the verdict, then Remaining work. Old IDs (C-1, H-G3, …) are mapped so nothing from June is silently dropped.

---

## Verdict

Nomad is a **working personal MVP**, not a broken prototype.

The core loop — **plan a place → navigate (auto-record) → save to Travel Log → open it again** — works on a real iPhone. Pathfinder can generate a trip and hand it to GPS. Multi-stop planning no longer uses a separate “Final Destination” field: you add stops; the last one is the end.

The June “fix-only, no features” phase is largely done. What is left is **polish, security hygiene, and a still-large codebase**.

| Area | Now |
|------|-----|
| Plan → Navigate → Record → Review | **Works on device** (titles, Go again, GPS sim to end) |
| Pathfinder | Usable in-tab chat with itinerary chips / Generate / Navigate / Save |
| Multi-stop | Last stop is destination; local address search improved |
| Explorer / Checklist | June wipe + empty index **fixed**; still a heavy secondary tab |
| Tests | 13 `node:test` files (~1.1k lines); **not wired as `npm test`** |
| Docs | Many overlapping era-docs; this file is the audit source of truth |
| Release | Still a personal Expo app, not a store build |

---

## What shipped since June (device-proven)

These were confirmed on a physical iPhone, not only in code.

| Item | Status |
|------|--------|
| Pathfinder itinerary parse, 8-stop cap, Generate / Navigate / Save in chat | Confirmed |
| Travel Log titles (“Trip to X”) + date subtitle | Confirmed |
| Route History folded into Travel Log **Go again** | Confirmed |
| GPS sim to end of route; trip saves | Confirmed |
| Multi-stop: add stops in order; last is the end (“Ends here”) | Confirmed |
| Nested `FlatList` in multi-stop planner (VirtualizedList warning) | Fixed |
| Street search: append current town; rank addresses by distance | Shipped (generic, not one address) |
| Trip save race: `addTrip` mutex in `utils/storage.ts` | In code |
| GPX / KML + `Share.share` on trip detail | **In code, not re-tested this week** |

Skipped on purpose (still skip unless they bite you): unused `routingService` (M7), traffic overlay indexes (M14), 50k-point path vs meters (L2).

---

## June critical bugs — recheck

| Old ID | Issue | Aug 2026 |
|--------|--------|----------|
| C-1 | Explorer wiped storage on every open | **Fixed** |
| C-2 | Empty US city index | **Fixed** (50 JSON states in `data/us-cities-index.ts`) |
| C-3 | `const prompt` reassignment crash | **Fixed** |
| C-4 | Streamed trip plan duplicated | **Fixed** |
| C-5 | Onboarding `recordQuestion` never called | **Fixed** |
| C-6 | Reverse geocode used the wrong Maps env var | **Fixed** (`getGoogleMapsApiKey()`) |
| C-7 | Network check uses `fetch(..., { mode: 'no-cors' })` then always `return true` | **Still present** — `services/network-status.ts` |
| C-8 | Zero unit tests | **Fixed** (13 files; no npm script) |

High items from June: Pathfinder conversation memory, booking from/to, achievement increments, booking `initialize()`, off-route waypoint recalc — **fixed**. Multi-leg navigation is **mostly** fixed (`currentLegIndex` + remaining-leg distance); start voice / progress % still lean on the first leg.

---

## Architecture (current)

```
Plan          Pathfinder chat  OR  GPS search / multi-stop
                │
Navigate      GPS tab (`recorder.tsx`) — recording starts with Start Navigation
                │
Review        Travel Log → trip detail (map, Go again, export, share)
```

| Layer | Role |
|-------|------|
| `app/(tabs)/` | Screens. Tab bar is hidden; drawer is the real nav. |
| `components/` | Maps, Pathfinder, multi-stop, navigation HUD |
| `hooks/` | `use-navigation`, `use-trip-tracking`, `use-gemini`, `use-explorer` |
| `services/` | Directions, Gemini, Explorer, Places, bookings |
| `utils/` | Storage, trip names, Places search, GPX-related helpers |
| `data/` | ~300MB+ geography (JSON index is live; old `us-states/*.ts` is legacy) |

Largest remaining magnets: `settings.tsx`, `explore.tsx`, `bookings.tsx`, `gemini-ai.ts`, `explorer.ts`. GPS tab is navigation-only; there is no standalone Record UI.

---

## Remaining work (do these, in this order)

### P0 — You (not more app features)

1. **Copy `.env` to the laptop** after clone. Keys are not on GitHub.
2. **Rotate Maps keys** that ever lived in git or scripts, then put the new public key in `.env` and `npx expo start -c`.
3. **Clone** https://github.com/nomadlabstx/Nomad on any machine; this cloud chat is at https://cursor.com/agents (same Cursor account).

### P1 — Short, high value

| ID | Item | Why |
|----|------|-----|
| N-1 | Try **Export GPX/KML** and **Share** from a saved trip | Code exists; not confirmed this week |
| N-2 | Fix offline detection (`network-status.ts` C-7) | Airplane mode can still look “online” |
| N-3 | Add `"test": "node --test --experimental-strip-types utils/__tests__/**/*.ts services/__tests__/**/*.ts"` (or `tsx`) | Tests exist but are easy to forget |
| N-4 | Route all Maps calls through `getGoogleMapsApiKey()` | `navigation.ts`, `google-places.ts`, `explorer.ts`, `speed-limit.ts` still read one env var |

### P2 — Debt (when you are bored of shipping)

| ID | Item |
|----|------|
| N-5 | Delete or quarantine unused `services/routing-service.ts` |
| N-6 | Stop tracking `data/archive` (already gitignored) and consider not importing unused `data/us-states/*.ts` |
| N-7 | Trim scripts/ (~150 ETL files; 2 wired in npm) |
| N-8 | First-leg-only leftovers: start announcement + `calculateTotalRouteProgress` |
| N-9 | Docs: mark June audits as historical; keep **this file** + GitHub README as the front door |
| N-10 | Bundle size: lazy-load state JSON so GPS does not pay for 50 states |

### Explicitly not next

Achievements expansion, bookings expansion, CarPlay, weather API, Explorer search polish — still vision backlog.

---

## Security

| Item | Status |
|------|--------|
| `.env` / `.env.local` gitignored | Yes |
| Live `AIza…` keys in tracked source | **None found** |
| `EXPO_PUBLIC_*` in the client bundle | Expected; treat as public, restrict by API/referrer in Google Cloud |
| Key rotation | **Still on you** if an old key was ever committed |

---

## Testing

| Exists | Gap |
|--------|-----|
| 13 unit files (places search, trip names, route matching, GPS sim, …) | No `npm test` |
| `npm run test:smoke` (file-pattern grep) | Not a real regression suite |
| Device checklist (this week) | GPX/share, airplane-mode nav, backgrounding |

---

## How to use this on a new machine

1. Clone the repo, copy `.env`, `npm install`, `npx expo start`.
2. Open this file: `docs/CODE_AUDIT_2026-08-18.md`.
3. Ignore `docs/FULL_CODE_AUDIT.md` except as history.

If you want the old interactive canvas, it lived only on the PC (`.cursor/projects/.../canvases/`). This markdown is what GitHub and this cloud chat can both see.

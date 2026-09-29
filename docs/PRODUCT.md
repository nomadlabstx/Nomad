# Nomad product

Nomad is a driving atlas for extra-milers, highway completionists, sight-seers, and interstate nerds. It is not a general GPS app, not Polarsteps, not Wanderlog, and not an RPG.

## Who it is for

People like the founder: extra-milers, interstate collectors, and anyone who will take the longer road to finish a highway, dip a new county, or hit an exit they have never used.

## Core loop

1. Pick a highway or a stretch of road to complete.
2. Drive it. Nomad shows **where you are** (road, town, county), records the trip, and checks off counties, highways, and exits.
3. Review the atlas and the travel log. Ask Pathfinder where to go next, or for the next unfinished miles.

## Place identity

The driving look is Tesla **place identity**, not Tesla’s 3D world renderer.

While driving — including free-drive with no destination — GPS shows:

- **Road** (large): Loop 340, I-35, US-281
- **Place** (under it): Woodway, TX — the municipality you are in, not the metro
- **County** (quiet third line): McLennan County

If a change is not identity, completion, or Pathfinder, it waits.

## Pathfinder's job

Pathfinder is the planner and copilot. It still does destination plans. Highway control is extra, not a replacement.

- **Where to go:** "What should I do in Austin?" gets a real city itinerary with named food and places. Weekends, day trips, and destination ideas are in-bounds.
- **Route control:** "Stay on I-95" is a hard constraint. Prefer the Google alternative that actually uses that highway instead of a faster shortcut.
- **New miles:** Challenge unfinished highway, exit, and county segments when they ask for that.
- **Along the drive:** Suggest stops on or just off the highway when they are already completing a road.

Navigation still happens in GPS. Pathfinder plans the place and, when asked, shapes which road counts.

## Out of primary scope

- Achievements, RPG overlays, XP, and level-up chrome. Code may remain; it is not on the drive path.
- Bookings and Planned Trips stay in the app but off the home path.
- An in-house / 3D Tesla-style map renderer. Keep Google/Apple tiles for now.
- Competing with Google on turn-by-turn chrome. Turns stay secondary to place identity.

Pathfinder destination planning stays in the primary path.

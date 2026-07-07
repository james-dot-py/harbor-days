# Harbor Days

A cozy little walking game of Chicago's north lakefront — the Belmont Rocks, AIDS
Garden Chicago, Belmont Harbor's finger docks, the dog beach, the Bill Jarvis bird
sanctuary, Sydney R. Marovitz golf course, and the Waveland clock tower. Walk the
Lakefront Trail, launch fireworks over the lake, skip stones, play fetch, fish the
smelt run, chip a golf round, spot birds, ride a Divvy, collect all 12 honorary
street signs, and wave at the Brown Line as it rattles past.

Everything is synthesized — no art or audio assets. The whole game ships as one
self-contained HTML file.

## Run it

```
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/index.html — a single shareable file
```

Desktop: WASD move · SPACE jump · drag to look · SHIFT run · E interact ·
J journal · R bell/radio · 1–4 firework type · F launch. Mobile: left-thumb
joystick, right-side drag, on-screen buttons.

## Project shape

- `GEOGRAPHY.md` — the canonical real-world layout (1:2 scale, Belmont Ave to
  Irving Park Rd — a ~1.2 km walk up the actual lakefront)
- `src/data/chicago.js` — all of Chicago as data (the "city pack")
- `src/framework.js` + `src/packs/` — activities, ambience, and events
- everything else — the engine that renders whatever city data it's given

See `CLAUDE.md` for architecture, constraints, and the roadmap (bigger map,
ridable L, more cities).

# The Last Song

A small cinematic interactive experience — part indie game, part digital art piece.
You drive a stylized character through one night: Katapang → a motorcycle ride →
Summarecon Bandung → a concert → an unexpected ending → and a quiet payoff.

It is played, not watched. The story is told through movement, camera, light and
animation; the words are kept small.

---

## Run it

```bash
npm install
npm run dev
```

Open the printed URL. Click **START EXPERIENCE**.

Production build:

```bash
npm run build
npm start
```

Type-check only: `npm run typecheck`

### Deploy to Vercel

The project is a stock Next.js 14 app — zero config.

1. Push this folder to a Git repo.
2. Import it on [vercel.com/new](https://vercel.com/new).
3. Framework preset: **Next.js** (auto-detected). No environment variables needed.
4. Deploy → share the link.

Locally you can also run `npx vercel` from this directory.

---

## Controls

| | Desktop | Mobile / touch |
|---|---|---|
| Move | `W A S D` or arrow keys (analog blend on the stick) | On-screen joystick, bottom-left (dynamic — it spawns where you press) |
| Interact | `E` (also `Enter` / `Space`) | The **tap** button, bottom-right (only appears when there's something to do) |
| Mute | Speaker icon, top-right | same |
| Reduced motion | `MOTION` toggle, top-right | same |

Movement is fully analog: joystick magnitude drives an idle → walk → run blend,
the body eases into its travel direction, and everything is damped — no snapping.

---

## Debug mode

Append `?debug=true` to the URL. Shows an overlay with FPS, game state, player
position, facing, speed and the live input vector. In debug builds the browser
console also gets `window.__game` (the Zustand store), `window.__three`
(the R3F root) and `window.__input` for poking around.

---

## How it's built

```
src/
  app/                     Next.js entry (layout, page, globals.css)
  components/
    Experience.tsx         mounts the canvas + all DOM UI
    game/
      GameCanvas.tsx       the <Canvas>, camera, systems
      SceneManager.tsx     mounts one scene root per game state
      Player.tsx           analog controller → shared playerState
      Character.tsx        procedural low-poly humanoid + pose state machine
      CameraController.tsx  damped third-person follow + cutscene handoff
      Crowd.tsx            instanced concert crowd
      ConcertStage.tsx     beat-reactive stage (LED shader, moving heads, smoke)
      Friend.tsx           the friend NPC
      zones.tsx            proximity / prompt / gate triggers
      props/               Motorcycle, Ticket, street/env pieces
      scenes/              KatapangScene, JourneyScene, VenueScene, NightWalkScene
  game/
    state/                 gameState (Zustand state machine) + playerState (per-frame)
    input/InputManager     one abstraction; keyboard + joystick feed the same vector
    audio/AudioManager     fully synthesised (Web Audio) — no audio files
    systems/               cameraDirector, beatClock, worldBounds, sequence helpers
  lib/                     math (damp / lerp / angle helpers), canvas text textures
```

**Game state machine** (`src/game/state/gameState.ts`):
`INTRO → JOURNEY → ARRIVAL → EXPLORE_VENUE → CONCERT → INCIDENT → EXIT →
WALK_HOME → TICKET → ENDING → DANCE → FINISHED`

Each state maps to one of four mounted scene roots. Cross-scene transitions are
masked by a short diegetic fade (you ride/walk into it), never a hard cut.

---

## Assets

There are **no external asset files** — every model is procedural geometry, every
sound is synthesised at runtime, and all text-on-surfaces (signs, the ticket) is
drawn to a canvas. Nothing to 404, nothing to license.

### If you want to swap in a real character model later

`src/components/game/Character.tsx` is a self-contained rig with an imperative
handle: `characterRef.current.setInput({ pose, speed01, turnRate, collapse })`.
To use a GLB instead:

1. Drop the file in `public/models/`.
2. Load it with `useGLTF` + `useAnimations` from `@react-three/drei` inside a new
   `CharacterGLB.tsx` that exposes the **same** `CharacterHandle` interface
   (`setInput`, `group`).
3. Map the pose names (`IDLE`, `WALK`, `RUN`, `INTERACT`, `LOOK_AROUND`,
   `SURPRISED`, `HELP`, `DANCE`, `CELEBRATE`) to your clips and crossfade on
   change; drive the walk/run blend from `speed01`.
4. Swap the import in `Player.tsx` and `Friend.tsx`.

Nothing else needs to change — the controller, camera and sequences only talk to
that interface.

### Optional drop-in audio

`AudioManager` is synthesis-only by design. If you later want real music, add a
small `<audio>`/`Howler` layer and call it from the same `setMood` /
`startEngine` / `startCrowd` hooks; keep the synth as the always-available
fallback so the experience never depends on a file.

---

## Known limitations

- **Character is procedural**, not a rigged/mocap model. Animation is expressive
  but stylized-simple. The GLB path above is wired and ready.
- **Audio is synthesised** — atmosphere and cues, not a scored soundtrack.
- **Stage volumetrics / smoke** are faked with additive sprites and cones, not a
  real volumetric pass, to hold frame rate.
- The **incident** is deliberately gentle and non-graphic — a sway and a
  controlled collapse, music ducking, then quiet. No injury is shown.
- Next.js is pinned to `14.2.x`; npm may warn about a newer security patch —
  bump to the latest `14.2` (or `15.x`) at your leisure, the app doesn't rely on
  anything version-specific.
- Best on a landscape screen. Portrait mobile shows a non-blocking "rotate" hint.
```

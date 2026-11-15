# Enter the OASIS — unofficial fan-inspired 3D browser game

A playable 3D browser game inspired by the 2018 film *Ready Player One*: boot into a neon virtual universe, forge an avatar, explore worlds, find secrets and take on challenges.

> **Unofficial, non-commercial fan project.** It isn't affiliated with or endorsed by the rights holders. All models are built procedurally from primitives, all textures are generated at runtime, and all music and sound effects are synthesised live with the Web Audio API. The project contains no film footage, ripped assets, soundtrack recordings or actor likenesses. Characters, presets and puzzles are original.

## Part 1 — what's playable

- **Opening sequence:** a short, skippable digital boot, then a cinematic title flight over a neon grid city that ends in a warp into the OASIS.
- **Avatar Forge:** a rotating 3D preview with five original presets. You can change body build and height, skin tone, head shape, face and eye glow, hair style and colour, clothing, armour, head and back accessories, and three colour channels. You can also pick custom colours and type a name. The avatar is saved locally and appears in the world, on the HUD badge, in menus and on a statue in the hub. Two items are cosmetic unlocks bought with coins at the Prize Zone.
- **World A: OASIS Prime (hub).** A circular plaza with a central spire, an instanced city skyline, flying traffic, floating islands and a gas giant. It has:
  - a portal to the Arcade District (walk through it or press E)
  - the **Founder's Gate** (the Halliday-style challenge access): three locks and a riddle; the Copper Key opens the first lock
  - the **Velocity Circuit** (racing challenge access): an on-foot time trial through 8 checkpoint rings, with countdown, timer and best time
  - the **Identity Nexus** (player profile and avatar statue) and the **Avatar Forge** booth
  - the **Hall of Records**: a 3D plaque wall that lights up as you unlock achievements
  - the **Atlas Observatory**: the world map with fast travel
  - the **Inventory Locker** and the **Welcome Beacon**
  - floating stepping stones up to a hidden platform
- **World B: Arcade District.** A rainy neon street with the Pixel Palace arcade hall. It has:
  - two playable cabinet games: **Neon Serpent** and **Star Lancer**
  - the Pixel Oracle (hints), a jukebox that switches the music, and a high-score board
  - the Prize Zone counter (trade coins for gear)
  - an out-of-order cabinet that hides a secret room
  - a poster-and-light-pad puzzle
  - crates you can climb to a rooftop ledge
- **Progression:** 24 coins, 4 secrets, 8 items, 13 achievements and an objective tracker. Everything is saved to `localStorage`.

## Part 2 — the challenges

- **Velocity City Grand Prix** (portal south of the hub spawn). This is the first major challenge and a real physics race.
  - **Handling:** the car uses Rapier's raycast vehicle controller, with suspension, engine force, braking, speed-sensitive steering and per-wheel grip. The handbrake drops the rear wheels' side grip so the car drifts, and drifting charges the boost meter. Boost and downforce are included too.
  - **Track:** an original course of roughly 850 m. The highway has dynamic traffic and sliding barriers, and debris falls onto it. At the junction it forks into a skyway, where a tower collapses across the road, or a narrow tunnel with timed crushers. After that come a ramp jump over a pit, swinging wrecking balls, and a rotating arm guarding the finish. A hidden undercity route starts behind the starting grid.
  - **Race structure:** checkpoints with respawn (R, or automatic when the car is flipped or falls), a countdown, a timer, a best time and a results screen with retry.
  - **Vehicles:** three original cars with different handling. Volt Runner is the starter, Brick Mk II unlocks when you finish once, and Wisp GT can be bought in the garage for 20 coins.
- **Arcade District cabinets** (all playable on keyboard and touch):
  - **Star Lancer:** a top-down space battle. You fly freely, fire automatically and face grunts, divers, turrets and a boss every fifth wave. It has spread, rapid, shield and repair power-ups, a health bar and rising difficulty.
  - **Glitch Hop:** a pixel platformer with variable-height jumps, moving platforms, bits to collect, spikes, bugs you can stomp, checkpoint flags, lives and a core to reach at the end.
  - **Grid Gladiator:** arena survival with three enemy types (a chaser, a ranged shooter and a charger that winds up before dashing). You get a melee strike, a dash with brief invulnerability, health, healing drops and five waves.
  - **Neon Serpent:** from Part 1, still playable.
  - **Prizes:** each cabinet hands out a one-time prize (gear plus coins) for beating its target.
- **The Founder's Hunt** (the Easter-egg hunt):
  - **Marks:** six hidden marks spread across the hub, the Arcade District, Glitch Hop, Velocity City and Trial I. Each mark you find gives the clue to the next one.
  - **Journal:** the Hunter's Journal (J) records the marks, clues, memories and trial progress.
  - **Ending:** once you have all six, entering them in order at the cipher lock behind the Founder's Gate opens the Founder's Vault. A light beam carries you up to it, and the Founder's Egg is inside.
- **The three trials**, entered through portals behind the Founder's Gate. Each opens with its lock, and the first also requires a Grand Prix finish.
  - **I · The Past (memory archive):**
    - **The task:** find four memory objects in the Founder's 1989 basement. Their texts tell the story of the Founder and their friend Rook. Carry the objects to the projector and place them in the order the events were lived.
    - **Failure:** a wrong order costs integrity, and the memory resets at zero.
    - **The final step:** act on what the memory reveals by returning Rook's controller to Rook's empty chair.
  - **II · The Present (Consortium Tower):**
    - **Stealth:** get past drones and a camera whose vision cones are blocked by cover. Being spotted sends you back to the zone checkpoint.
    - **The vault door:** it needs a passphrase the Consortium stole from an Arcade District poster, so it rewards knowing the OASIS.
    - **The decision:** an executive hologram offers 1,000 coins if you hand over the Founder's keys. Signing fails the trial. Broadcasting their plan instead starts a timed escape through blinking laser gates.
  - **III · The Future (the Blueprint):**
    - **The board:** route a light beam into three receivers with four mirrors and a splitter on a 9×7 grid. A solver found 21 valid solutions.
    - **Testing and failure:** you fire the emitter to test your design. Leaving the beam on a corruption node for 4 seconds overloads the board and resets it.
    - **The monument:** then design a voxel monument, which is built in OASIS Prime.
- **Progression:**
  - **What's tracked:** XP and levels (each level-up pays coins), coins, items, achievements (25 in total), race results, arcade high scores, marks, trials, vehicles and your monument.
  - **Rewards that change the game:** new outfits (Archivist Coat, Pixel Suit), armour (Gladiator Rig, Vanguard), head gear (Racer Helmet, Architect's Crown), back gear (Orbital Drones), vehicles, trial portals, the vault area and the monument.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move | WASD (or ↑ ↓) | Left virtual stick |
| Look | Mouse (click to capture) | Drag on the right side |
| Turn camera without a mouse | ← → or Q / R, PageUp / PageDown | — |
| Jump | Space | JUMP |
| Sprint | Shift (uses energy) | » toggle |
| Interact | E (or Enter) | E button or tap the prompt |
| Inventory / map / journal | I / M / J | HUD buttons |
| Pause | Esc (or P) | ❚❚ |

**Driving (Velocity City):**
- W/↑ accelerate, S/↓ brake and reverse, A/D or ←/→ steer.
- Space handbrake (drift), Shift boost.
- C cycles camera views, V looks back, the mouse orbits the camera, R respawns at the last checkpoint and G opens the garage.
- On touch: the stick drives, and the buttons are DRIFT and BOOST.

**Assist camera mode** (Pause → Settings) never captures the pointer. You turn the camera by dragging or with the arrow keys, and it follows you as you move. The Settings panel also has look sensitivity, invert Y, touch-control override, graphics quality, reduced motion and volume.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run preview
```

## Tech stack

React 19 · TypeScript · Vite · Three.js · React Three Fiber · Drei · Rapier (`@react-three/rapier`) · Zustand · Tailwind CSS 4 · Framer Motion · `@react-three/postprocessing` (bloom).

## Architecture

```
src/
  data/            avatar options & presets, game content (achievements, items, secrets, prizes)
  store/           Zustand stores: game state + persisted save (useGame), creator draft (useCreator)
  game/
    GameCanvas.tsx single persistent <Canvas>; swaps title / creator / world scenes; post-processing
    systems/       input, interaction registry, shared player state, procedural audio
    player/        third-person character controller (Rapier capsule, ray-cast grounding, camera collision)
    avatar/        procedural AvatarModel (built from config, animated)
    scenes/        TitleScene (cinematic), CreatorScene (preview pedestal)
    world/
      registry.ts  world definitions: layout + visuals + lazily imported component
      WorldRoot    loads exactly one world inside its own physics world, spawns the player
      common/      reusable building blocks: Portal, Kiosk, Coins, ItemPickup, Block, GridFloor,
                   SkyDome, Skyline (instanced), SkyTraffic (instanced), Particles (GPU), NeonText
      hub/         OASIS Prime: layout data + world + stations (gate, trial portals, vault, circuit, records…)
      arcade/      Arcade District: layout data + world + props (cabinets, rain, signs)
      race/        Velocity City: track builder, Rapier vehicle, hazards, autopilot (tests)
      trials/      past/ present/ future/ — the three Founder's trials + shared intro/result/HUD
  ui/              DOM layer: Boot, Title, Creator, HUD, TouchControls, overlay Panels, mini-games
```

**Adding a world:** create `world/<name>/layout.ts` (spawns, points of interest, coins, map shapes) and a default-exported world component. Register both in `world/registry.ts`, then place a `<Portal target="<name>" />` somewhere. Interactions (`useInteractable` or `<Kiosk>`), collectibles (`<Coins>`, `<ItemPickup>`), the map, fast travel and save data all work automatically.

**Performance:**
- Only the current world is mounted, and each world is a separate code-split chunk.
- The physics engine (Rapier WASM) loads only when you enter a world, and is preloaded during the title screen.
- The city skyline and the flying traffic are each a single instanced draw call.
- Floors, sky, portals, particles, rain and cabinet screens are lightweight shaders, not textures.
- There are no shadow maps; the player has a ray-cast blob shadow.
- "Low" quality turns off bloom and rain and reduces the city density.

## Testing

`scripts/e2e.mjs` drives the real game in headless Chromium with Playwright. It covers:
- boot, title and avatar creation
- avatar persistence in the save and across a reload
- WASD, sprint, jump, arrow-key and drag camera control
- interaction prompts, pause, inventory and map
- coins and secrets
- the race and a cabinet mini-game
- portal travel and fast travel
- the hidden room, the Copper Key and the gate
- the prize shop and equipping items
- mobile touch controls on an emulated iPhone

It saves screenshots to `screenshots/`.

`scripts/e2e-part2.mjs` starts from a save where Part 1 is complete and plays Part 2:
- **The race:** it drives with the keyboard (throttle, steering, boost, drift, brake, respawn). A built-in waypoint autopilot then finishes the Grand Prix through the real vehicle physics; it uses the same controls a player does, with no teleporting. It also drives the hidden undercity route.
- **The arcade:** it plays Glitch Hop, Star Lancer and Grid Gladiator.
- **The hunt:** it collects all six marks.
- **The trials:** it completes all three, including their failure branches (a wrong memory order, being spotted, signing the contract, a corruption overload) and a different Blueprint solution from the one mentioned in this README.
- **The ending:** it solves the cipher, claims the Egg, equips the rewards, checks persistence after a reload, and drives on touch on a phone.

```bash
npm run dev &
npm run test:e2e        # both suites; or test:e2e:part1 / test:e2e:part2
```

Debug handles for the console:
- `window.__oasis`: the game store.
- `window.__player`: live player state, plus `teleport([x, y, z], yaw)`.
- `window.__race` and `window.__car`: race state and car telemetry; `__race.setState({ autopilot: true })` drives the car.
- `window.__past`, `__present` and `__future`: the trial states.

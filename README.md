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

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move | WASD (or ↑ ↓) | Left virtual stick |
| Look | Mouse (click to capture) | Drag on the right side |
| Turn camera without a mouse | ← → or Q / R, PageUp / PageDown | — |
| Jump | Space | JUMP |
| Sprint | Shift (uses energy) | » toggle |
| Interact | E (or Enter) | E button or tap the prompt |
| Inventory / map | I / M | HUD buttons |
| Pause | Esc (or P) | ❚❚ |

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
      hub/         OASIS Prime: layout data + world + stations (gate, circuit, records, nexus, atlas)
      arcade/      Arcade District: layout data + world + props (cabinets, rain, signs)
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

```bash
npm run dev &
npm run test:e2e
```

Debug handles for the console: `window.__oasis` (store) and `window.__player` (live player state, plus `teleport([x, y, z], yaw)`).

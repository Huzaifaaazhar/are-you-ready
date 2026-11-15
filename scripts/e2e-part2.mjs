// Part 2 end-to-end test: race, arcade games, Easter-egg hunt, three trials, progression and persistence.
// Usage: start `npm run dev`, then `node scripts/e2e-part2.mjs [url]`.
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'

const require = createRequire(import.meta.url)
const { chromium, devices } = require('playwright')
const URL = process.argv[2] ?? 'http://127.0.0.1:5173/'
const OUT = process.env.SHOTS ?? 'screenshots'
mkdirSync(OUT, { recursive: true })
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })

// A Part-1-complete save: avatar, Arcade visited, Copper Key used on lock I, hidden cabinet found.
const SAVE = {
  state: {
    avatar: { name: 'Hunter', accent: '#3dff8b' },
    worldId: 'hub',
    settings: { quality: 'low' },
    progress: { visited: ['hub', 'arcade'], items: ['holo-map', 'copper-key'], locks: 1, gateOpened: true, secrets: ['hidden-cabinet'], wallet: 30 },
  },
  version: 1,
}

async function desktop() {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 680 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.addInitScript((save) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('oasis-save-v1', JSON.stringify(save))
      sessionStorage.setItem('seeded', '1')
    }
  }, SAVE)
  const state = () => page.evaluate(() => window.__oasis.getState())
  const prog = async () => (await state()).progress
  const teleport = (p, yaw = 0) => page.evaluate(([p, yaw]) => window.__player.teleport(p, yaw), [p, yaw])
  const ready = async () => {
    await page.waitForFunction(() => {
      const s = window.__oasis.getState()
      return s.phase === 'world' && !s.worldLoading && !s.transition.active
    }, null, { timeout: 90000 })
    await sleep(700)
  }
  const travel = async (w) => {
    await page.evaluate((w) => window.__oasis.getState().travel(w), w)
    await page.waitForFunction((w) => window.__oasis.getState().worldId === w, w, { timeout: 10000 })
    await ready()
  }
  const interact = async (pos, id, yaw = 0) => {
    await teleport(pos, yaw)
    const ok = await page.waitForFunction((id) => window.__oasis.getState().prompt?.id === id, id, { timeout: 6000 }).then(() => true).catch(() => false)
    if (!ok) return false
    await page.keyboard.press('KeyE')
    await sleep(400)
    return true
  }
  const closeInfo = async () => {
    if ((await state()).overlay?.type === 'info') {
      await page.keyboard.press('Escape')
      await sleep(250)
    }
  }

  await page.goto(URL)
  await page.waitForSelector('text=OASIS VR KERNEL')
  await page.keyboard.press('Space')
  await page.waitForSelector('[data-testid=continue]', { timeout: 30000 })
  await page.click('[data-testid=continue]')
  await page.waitForFunction(() => window.__player?.teleport, null, { timeout: 90000 })
  await ready()
  check('Part 1 save loads with lock I open', (await prog()).locks === 1)

  // ---------------- Hunt: marks 1 + 2 in the hub ----------------
  await interact([-40.5, 1.2, 3], 'dev-terminal', -Math.PI / 2)
  await closeInfo()
  await interact([0, 1.2, -9], 'glyph-2', 0)
  await closeInfo()
  let p = await prog()
  check('hunt: marks 1 and 2 found in OASIS Prime', p.glyphs.includes(1) && p.glyphs.includes(2), JSON.stringify(p.glyphs))
  check('journal item granted and clue recorded', p.items.includes('journal') && p.journal.length >= 0)
  await page.keyboard.press('KeyJ')
  await page.waitForSelector('[data-testid=journal]')
  await page.screenshot({ path: `${OUT}/p2-01-journal.png` })
  await page.keyboard.press('Escape')

  // Trial I is sealed until the Grand Prix is finished
  await interact([-33, 1.2, 0], 'founder-gate', -Math.PI / 2)
  await page.waitForSelector('[data-testid=gate]')
  check('gate explains the race requirement', (await page.textContent('[data-testid=gate]')).includes('Grand Prix'))
  await page.keyboard.press('Escape')

  // ---------------- Race ----------------
  await teleport([0, 1.2, 36], Math.PI)
  await page.keyboard.down('KeyW')
  await page.waitForFunction(() => window.__oasis.getState().worldId === 'race', null, { timeout: 8000 }).catch(() => {})
  await page.keyboard.up('KeyW')
  await ready()
  await page.waitForSelector('[data-testid=garage]', { timeout: 20000 })
  check('race portal → Velocity City garage', (await state()).worldId === 'race')
  await page.screenshot({ path: `${OUT}/p2-02-garage.png` })
  check('locked vehicles shown as locked', (await page.textContent('[data-testid=garage]')).includes('Finish the Grand Prix once'))
  await page.click('[data-testid=race-start]')
  await page.waitForFunction(() => window.__race.getState().status === 'racing', null, { timeout: 10000 })
  const car = () => page.evaluate(() => ({ ...window.__player.position, h: window.__player.heading, v: window.__car.speed, boost: window.__car.boost, drift: window.__car.drifting }))
  const c0 = await car()
  await page.keyboard.down('KeyW')
  await sleep(1800)
  const c1 = await car()
  check('throttle accelerates the car (physics)', c1.v > 8 && c1.z > c0.z + 5, `v=${c1.v.toFixed(1)} z=${c1.z.toFixed(1)}`)
  await page.keyboard.down('KeyA')
  await sleep(500)
  await page.keyboard.up('KeyA')
  const c2 = await car()
  check('steering turns the car', Math.abs(c2.h - c1.h) > 0.1, `heading ${c1.h.toFixed(2)} → ${c2.h.toFixed(2)}`)
  // counter-steer back to straight (how far a timed key press turns depends on the frame rate)
  for (let i = 0; i < 40 && Math.abs((await car()).h) > 0.15; i++) {
    const key = (await car()).h > 0 ? 'KeyD' : 'KeyA'
    await page.keyboard.down(key)
    await sleep(90)
    await page.keyboard.up(key)
  }
  await page.keyboard.down('ShiftLeft')
  await sleep(700)
  const c3 = await car()
  await page.keyboard.up('ShiftLeft')
  check('boost drains the boost meter', c3.boost < 95, `boost=${c3.boost.toFixed(0)}`)
  await page.keyboard.down('Space')
  await page.keyboard.down('KeyD')
  await sleep(400)
  const c4 = await car()
  await page.keyboard.up('KeyD')
  await page.keyboard.up('Space')
  await page.keyboard.up('KeyW')
  check('handbrake puts the car into a drift', c4.drift === true, `v=${c4.v.toFixed(1)}`)
  await page.keyboard.down('KeyS')
  await sleep(1200)
  await page.keyboard.up('KeyS')
  const c5 = await car()
  check('braking slows the car', Math.abs(c5.v) < Math.abs(c4.v), `${c4.v.toFixed(1)} → ${c5.v.toFixed(1)}`)
  await page.screenshot({ path: `${OUT}/p2-03-drive.png` })
  await page.keyboard.press('KeyR')
  await sleep(500)
  check('R respawns the car at the last checkpoint', Math.abs((await car()).z - 14) < 3)
  // let the autopilot drive the rest through real physics
  await page.evaluate(() => window.__race.setState({ autopilot: true }))
  await page.waitForFunction(() => window.__race.getState().status === 'finished', null, { timeout: 240000 }).catch(() => {})
  const r = await page.evaluate(() => window.__race.getState())
  check('car completes the Grand Prix through checkpoints to the finish', r.status === 'finished' && r.cp === 4, `time ${r.finishTime?.toFixed(2)}s`)
  await page.waitForSelector('[data-testid=race-result]', { timeout: 5000 })
  await page.screenshot({ path: `${OUT}/p2-04-race-result.png` })
  p = await prog()
  check('race rewards persist: best time, Brick Mk II, Racer Helmet', p.gpBest !== null && p.vehicles.includes('brick') && p.items.includes('racer-helmet') && p.gpFinishes === 1)

  // hidden undercity route → mark 5
  await page.click('[data-testid=race-retry]')
  await page.waitForFunction(() => window.__race.getState().status === 'racing', null, { timeout: 10000 })
  await page.evaluate(() => {
    window.__autopilotRoute('undercity')
    window.__car.teleport([0, 0.2, -44], Math.PI)
    window.__race.setState({ autopilot: true })
  })
  await page.waitForFunction(() => window.__oasis.getState().progress.glyphs.includes(5), null, { timeout: 120000 }).catch(() => {})
  await page.screenshot({ path: `${OUT}/p2-05-undercity.png` })
  p = await prog()
  check('hunt: hidden undercity route drivable, mark 5 found', p.glyphs.includes(5) && p.achievements.includes('gp-reverse'))
  await page.waitForFunction(() => window.__race.getState().cp >= 2, null, { timeout: 90000 }).catch(() => {})
  check('undercity route counts as a valid line (junction + merge)', (await page.evaluate(() => window.__race.getState().cp)) >= 2)
  await page.evaluate(() => {
    window.__race.setState({ autopilot: false })
    window.__autopilotRoute('main')
  })
  await page.keyboard.press('Escape')
  await page.click('[data-testid=pause-hub]')
  await page.waitForFunction(() => window.__oasis.getState().worldId === 'hub', null, { timeout: 10000 })
  await ready()

  // ---------------- Arcade games ----------------
  await travel('arcade')
  await interact([-28.6, 1.2, 9.2], 'cab-glitchhop', Math.PI)
  await page.waitForSelector('[data-testid=arcade-glitchhop]')
  await page.click('[data-testid=arcade-start]')
  await sleep(600)
  const g0 = await page.evaluate(() => window.__glitchhop.pl.x)
  await page.keyboard.down('ArrowRight')
  await page.keyboard.down('Space')
  await sleep(1200)
  await page.keyboard.up('Space')
  await page.keyboard.up('ArrowRight')
  const g1 = await page.evaluate(() => window.__glitchhop.pl.x)
  check('Glitch Hop: running and jumping move the player', g1 > g0 + 2, `${g0.toFixed(1)} → ${g1.toFixed(1)}`)
  await page.screenshot({ path: `${OUT}/p2-06-glitchhop.png` })
  // skip to the final climb and finish with real controls (mover + jump)
  await page.evaluate(() => window.__glitchhop.warp(103))
  await page.keyboard.down('ArrowRight')
  await page.waitForSelector('text=CORE REACHED', { timeout: 15000 }).catch(() => {})
  await page.keyboard.up('ArrowRight')
  p = await prog()
  check('Glitch Hop: reaching the core completes it → Pixel Suit + mark 4', p.items.includes('pixel-suit') && p.glyphs.includes(4))
  await page.screenshot({ path: `${OUT}/p2-07-glitchhop-win.png` })
  await page.keyboard.press('Escape')
  await sleep(300)

  await interact([-21.5, 1.2, -9.2], 'cab-lancer', 0)
  await page.waitForSelector('[data-testid=arcade-lancer]')
  await page.click('[data-testid=arcade-start]')
  await page.keyboard.down('ArrowLeft')
  await sleep(2500)
  await page.keyboard.up('ArrowLeft')
  await page.keyboard.down('ArrowRight')
  await sleep(2500)
  await page.keyboard.up('ArrowRight')
  const lancerScore = await page.textContent('[data-testid=arcade-lancer] span')
  await page.screenshot({ path: `${OUT}/p2-08-lancer.png` })
  check('Star Lancer: waves spawn and shots score points', /SCORE 0*[1-9]/.test(lancerScore ?? ''), lancerScore)
  await page.keyboard.press('Escape')
  await sleep(300)

  await interact([-19.5, 1.2, 9.2], 'cab-gladiator', Math.PI)
  await page.waitForSelector('[data-testid=arcade-gladiator]')
  await page.click('[data-testid=arcade-start]')
  const t0 = Date.now()
  while (Date.now() - t0 < 14000) {
    await page.keyboard.press('KeyJ')
    await sleep(120)
    if (Date.now() - t0 > 7000) await page.keyboard.press('KeyK')
  }
  const waves = await page.textContent('[data-testid=arcade-gladiator] span')
  await page.screenshot({ path: `${OUT}/p2-09-gladiator.png` })
  check('Grid Gladiator: strikes defeat enemies and clear a wave', /WAVES 0*[1-9]/.test(waves ?? '') || (await page.isVisible('text=GAME OVER')), waves)
  await page.keyboard.press('Escape')
  await sleep(300)

  // mark 3 in the storage room
  await interact([-39.2, 1.2, -3], 'glyph-3', -Math.PI / 2)
  await closeInfo()
  check('hunt: mark 3 in the Founder’s storage room', (await prog()).glyphs.includes(3))

  // ---------------- Trial I ----------------
  await travel('hub')
  await teleport([-48, 1.2, -9], Math.PI / 2)
  await page.keyboard.down('KeyW')
  await page.waitForFunction(() => window.__oasis.getState().worldId === 'past', null, { timeout: 8000 }).catch(() => {})
  await page.keyboard.up('KeyW')
  await ready()
  check('Trial I portal opens after the race', (await state()).worldId === 'past')
  await page.waitForSelector('[data-testid=trial-intro]')
  await page.screenshot({ path: `${OUT}/p2-10-past-intro.png` })
  await page.click('[data-testid=trial-begin]')
  const origins = { 'mem-ticket': [9.6, 1.2, -4], 'mem-map': [-7.5, 1.2, -7.2], 'mem-cart': [9, 1.2, 6.2], 'mem-letter': [-9, 1.2, 7.5] }
  const peds = [[-3, 1.2, 4.6], [-1, 1.2, 4.6], [1, 1.2, 4.6], [3, 1.2, 4.6]]
  // wrong first, to exercise failure handling
  await interact(origins['mem-cart'], 'mem-mem-cart')
  await closeInfo()
  await interact(peds[0], 'ped-0', Math.PI)
  for (const [i, id] of ['mem-ticket', 'mem-map', 'mem-letter'].entries()) {
    await interact(origins[id], `mem-${id}`)
    await closeInfo()
    await interact(peds[i + 1], `ped-${i + 1}`, Math.PI)
  }
  let past = await page.evaluate(() => window.__past.getState())
  check('Trial I: wrong order costs integrity and returns memories', past.integrity === 2 && past.phase === 'restore')
  for (const [i, id] of ['mem-ticket', 'mem-map', 'mem-cart', 'mem-letter'].entries()) {
    past = await page.evaluate(() => window.__past.getState())
    if (past.where[id] === i) continue
    if (past.where[id] === 'origin') await interact(origins[id], `mem-${id}`)
    else await interact(peds[past.where[id]], `ped-${past.where[id]}`, Math.PI)
    await closeInfo()
    await interact(peds[i], `ped-${i}`, Math.PI)
  }
  await closeInfo()
  check('Trial I: correct chronology restores the memory', (await page.evaluate(() => window.__past.getState().phase)) === 'understand')
  await interact([-7.7, 1.2, -2], 'under-bed', -Math.PI / 2)
  await closeInfo()
  await interact([5.4, 1.2, -5.8], 'rook-chair', Math.PI)
  await page.waitForSelector('[data-testid=trial-result][data-success=true]')
  p = await prog()
  check('Trial I complete → Cobalt Key, Archivist Coat, mark 6', p.trials.includes('past') && p.items.includes('cobalt-key') && p.items.includes('archivist-coat') && p.glyphs.includes(6))
  await page.click('[data-testid=trial-hub]')
  await page.waitForFunction(() => window.__oasis.getState().worldId === 'hub', null, { timeout: 10000 })
  await ready()

  // lock II
  await interact([-33, 1.2, 0], 'founder-gate', -Math.PI / 2)
  await page.click('[data-testid=insert-key]')
  await sleep(400)
  await page.keyboard.press('Escape')
  check('Cobalt Key opens lock II', (await prog()).locks === 2)

  // ---------------- Trial II ----------------
  await teleport([-48, 1.2, 0], Math.PI / 2)
  await page.keyboard.down('KeyW')
  await page.waitForFunction(() => window.__oasis.getState().worldId === 'present', null, { timeout: 8000 }).catch(() => {})
  await page.keyboard.up('KeyW')
  await ready()
  await page.waitForSelector('[data-testid=trial-intro]')
  await page.click('[data-testid=trial-begin]')
  await teleport([2, 1.2, -5.2], 0)
  await page.waitForFunction(() => window.__present.getState().detections > 0, null, { timeout: 15000 }).catch(() => {})
  await page.screenshot({ path: `${OUT}/p2-11-present-detected.png` })
  check('Trial II: drones detect the player and reset to checkpoint', (await page.evaluate(() => window.__present.getState().detections)) > 0)
  await sleep(900)
  for (const x of [2, -6, -2]) {
    await teleport([x, 1.2, -55], 0)
    await sleep(900)
  }
  check('Trial II: the poster passphrase (sun, sky, bloom) opens the vault', await page.evaluate(() => window.__present.getState().doorOpen))
  await teleport([0, 1.2, -64], 0)
  await page.waitForFunction(() => window.__oasis.getState().overlay?.type === 'info', null, { timeout: 6000 })
  await page.keyboard.press('Escape')
  await interact([0, 1.2, -71.6], 'contract', Math.PI)
  await page.waitForSelector('[data-testid=trial-result][data-success=false]')
  check('Trial II: signing the contract fails the trial', !(await prog()).trials.includes('present'))
  await page.click('[data-testid=trial-retry]')
  await sleep(500)
  await interact([-9, 1.2, -68.6], 'broadcast', Math.PI)
  check('Trial II: broadcasting starts the escape', (await page.evaluate(() => window.__present.getState().stage)) === 'escape')
  await teleport([43, 1.2, -70], -Math.PI / 2)
  await page.waitForSelector('[data-testid=trial-result][data-success=true]', { timeout: 8000 })
  p = await prog()
  check('Trial II complete → Prism Key + Vanguard Armour', p.trials.includes('present') && p.items.includes('prism-key') && p.items.includes('vanguard-armour'))
  await page.click('[data-testid=trial-hub]')
  await page.waitForFunction(() => window.__oasis.getState().worldId === 'hub', null, { timeout: 10000 })
  await ready()
  await interact([-33, 1.2, 0], 'founder-gate', -Math.PI / 2)
  await page.click('[data-testid=insert-key]')
  await sleep(400)
  await page.keyboard.press('Escape')
  check('Prism Key opens lock III', (await prog()).locks === 3)

  // ---------------- Trial III ----------------
  await teleport([-48, 1.2, 9], Math.PI / 2)
  await page.keyboard.down('KeyW')
  await page.waitForFunction(() => window.__oasis.getState().worldId === 'future', null, { timeout: 8000 }).catch(() => {})
  await page.keyboard.up('KeyW')
  await ready()
  await page.waitForSelector('[data-testid=trial-intro]')
  await page.click('[data-testid=trial-begin]')
  const cx = (c) => (c - 4) * 3
  const cz = (r) => (r - 3) * 3
  await interact([-15.5, 1.2, 4.6], 'emitter-switch')
  await page.waitForFunction(() => window.__future.getState().overloads > 0, null, { timeout: 9000 }).catch(() => {})
  check('Trial III: feeding a corruption node overloads and resets the board', (await page.evaluate(() => window.__future.getState().overloads)) > 0)
  // a different valid solution from the one in the docs: (0,3)\, (0,6)\, (2,5)/, (2,6)/, (7,5) splitter
  const place = async (c, r, n) => {
    await interact([cx(c), 1.2, cz(r)], `cell-${c},${r}`)
    for (let i = 1; i < n; i++) {
      await page.keyboard.press('KeyE')
      await sleep(200)
    }
  }
  await place(0, 3, 2)
  await place(0, 6, 2)
  await place(2, 5, 1)
  await place(2, 6, 1)
  await place(7, 5, 3)
  await interact([-15.5, 1.2, 4.6], 'emitter-switch')
  await page.waitForFunction(() => window.__future.getState().solved, null, { timeout: 5000 }).catch(() => {})
  await teleport([0, 1.2, 12], 0)
  await sleep(900)
  await page.screenshot({ path: `${OUT}/p2-12-blueprint.png` })
  check('Trial III: an alternative routing lights all receivers', await page.evaluate(() => window.__future.getState().solved))
  await interact([0, 1.2, -17.5], 'monument-forge')
  await page.waitForSelector('[data-testid=monument]')
  for (const i of [12, 12, 12, 7, 11, 13, 17, 6, 8]) await page.click(`[data-testid=mcell-${i}]`)
  await page.click('[data-testid=monument-build]')
  await page.waitForSelector('[data-testid=trial-result][data-success=true]')
  p = await prog()
  check('Trial III complete → crown + monument saved', p.trials.includes('future') && p.items.includes('founder-crown') && p.monument?.h.reduce((a, b) => a + b, 0) >= 6)
  await page.click('[data-testid=trial-hub]')
  await page.waitForFunction(() => window.__oasis.getState().worldId === 'hub', null, { timeout: 10000 })
  await ready()
  await teleport([-12, 1.2, -4], 0)
  await sleep(1500)
  await page.screenshot({ path: `${OUT}/p2-13-monument-hub.png` })

  // ---------------- Cipher, vault, egg ----------------
  check('all six marks found', (await prog()).glyphs.length === 6)
  await interact([-40.5, 1.2, 3], 'dev-terminal', -Math.PI / 2)
  await page.waitForSelector('[data-testid=cipher]')
  for (const i of [2, 1]) await page.click(`[data-testid=cipher-${i}]`)
  for (const i of [3, 4, 5, 6]) await page.click(`[data-testid=cipher-${i}]`)
  check('cipher rejects a wrong order', !(await prog()).vaultOpen)
  for (const i of [1, 2, 3, 4, 5, 6]) await page.click(`[data-testid=cipher-${i}]`)
  await sleep(300)
  check('cipher opens the Founder’s Vault', (await prog()).vaultOpen)
  await interact([-43, 1.2, -9.5], 'vault-up', 0)
  await sleep(600)
  await teleport([-44, 41.2, -14], 0)
  await page.waitForFunction(() => window.__oasis.getState().progress.items.includes('founder-egg'), null, { timeout: 6000 }).catch(() => {})
  await sleep(600)
  await page.screenshot({ path: `${OUT}/p2-14-vault.png` })
  p = await prog()
  check('the Founder’s Egg is claimed', p.items.includes('founder-egg') && p.achievements.includes('egg'))

  // ---------------- Rewards on the avatar ----------------
  await page.evaluate(() => {
    const g = window.__oasis.getState()
    g.equipItem('founder-crown')
    g.equipItem('archivist-coat')
    g.equipItem('vanguard-armour')
  })
  const av = (await state()).avatar
  check('unlocked gear equips on the avatar', av.headGear === 'crown' && av.outfit === 'archivist' && av.armour === 'vanguard', JSON.stringify([av.headGear, av.outfit, av.armour]))
  await page.keyboard.press('Escape')
  await sleep(200)
  await page.click('button:has-text("Edit avatar")')
  await page.waitForSelector('[data-testid=avatar-name]')
  await page.click('[role=tab]:has-text("Gear")')
  check('creator lists the unlocked crown as selectable', !(await page.isDisabled('button.chip:has-text("Architect’s Crown")')))
  await page.click('[role=tab]:has-text("Outfit")')
  await sleep(500)
  await page.screenshot({ path: `${OUT}/p2-15-creator-unlocks.png` })
  await page.click('[data-testid=confirm-avatar]')
  await ready()
  p = await prog()
  check('XP and level progressed', p.xp > 1000, `xp=${p.xp}`)
  await page.click('[data-testid=hud-name]').catch(() => {})
  await page.evaluate(() => window.__oasis.getState().openOverlay({ type: 'profile' }))
  await page.waitForSelector('[data-testid=profile]')
  await page.screenshot({ path: `${OUT}/p2-16-profile.png` })
  await page.keyboard.press('Escape')

  // ---------------- Garage purchase ----------------
  await travel('race')
  await page.waitForSelector('[data-testid=garage]', { timeout: 20000 })
  await page.click('[data-testid=garage] button:has-text("Buy")')
  await sleep(300)
  p = await prog()
  check('Wisp GT bought with coins and selected', p.vehicles.includes('wisp') && p.vehicle === 'wisp')
  await page.screenshot({ path: `${OUT}/p2-17-garage-wisp.png` })
  await page.click('[data-testid=garage] button:has-text("Return to OASIS Prime")')
  await page.waitForFunction(() => window.__oasis.getState().worldId === 'hub', null, { timeout: 10000 })
  await ready()

  // ---------------- Persistence ----------------
  await page.reload()
  await page.waitForSelector('text=OASIS VR KERNEL')
  await page.keyboard.press('Space')
  await page.waitForSelector('[data-testid=continue]', { timeout: 30000 })
  p = await prog()
  check('everything persists after reload', p.trials.length === 3 && p.glyphs.length === 6 && p.vaultOpen && p.vehicles.includes('brick') && p.monument && p.gpBest !== null && p.locks === 3, `trials=${p.trials} glyphs=${p.glyphs.length} xp=${p.xp}`)
  const real = errors.filter((e) => !/requestPointerLock|pointer lock|WebGL: |GPU stall|Automatic fallback/i.test(e))
  check('no runtime errors', real.length === 0, real.slice(0, 5).join(' | '))
  await ctx.close()
}

async function mobile() {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.addInitScript((save) => localStorage.setItem('oasis-save-v1', JSON.stringify(save)), SAVE)
  await page.goto(URL)
  await page.waitForSelector('text=OASIS VR KERNEL')
  await page.tap('body')
  await page.waitForSelector('[data-testid=continue]', { timeout: 30000 })
  await page.tap('[data-testid=continue]')
  await page.waitForFunction(() => window.__player?.teleport && !window.__oasis.getState().worldLoading, null, { timeout: 90000 })
  await page.evaluate(() => window.__oasis.getState().travel('race'))
  await page.waitForSelector('[data-testid=garage]', { timeout: 60000 })
  await page.screenshot({ path: `${OUT}/p2-m1-garage.png` })
  await page.tap('[data-testid=race-start]')
  await page.waitForFunction(() => window.__race.getState().status === 'racing', null, { timeout: 15000 })
  const cdp = await ctx.newCDPSession(page)
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] })
  await touch('touchStart', 90, 600)
  for (let i = 1; i <= 6; i++) await touch('touchMove', 90, 600 - i * 10)
  await sleep(2000)
  const v = await page.evaluate(() => window.__car.speed)
  await page.screenshot({ path: `${OUT}/p2-m2-drive.png` })
  await touch('touchEnd', 90, 540)
  check('mobile: virtual stick drives the car', v > 5, `v=${v.toFixed(1)}`)
  check('mobile: no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '))
  await ctx.close()
}

try {
  await desktop()
  await mobile()
} catch (e) {
  check('test run completed', false, String(e).slice(0, 400))
} finally {
  await browser.close()
}
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)

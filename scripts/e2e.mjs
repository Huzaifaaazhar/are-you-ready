// End-to-end smoke test: drives the real game in Chromium and checks the core systems.
// Usage: start `npm run dev` (or preview), then `node scripts/e2e.mjs [url]`.
import { createRequire } from 'node:module'
// Use the project's playwright if installed, otherwise a globally installed one.
const require = createRequire(import.meta.url)
const { chromium, devices } = require('playwright')
import { mkdirSync } from 'node:fs'

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

async function desktop() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  const state = () => page.evaluate(() => window.__oasis.getState())
  const pos = () => page.evaluate(() => ({ ...window.__player.position, yaw: window.__player.cameraYaw }))
  const teleport = (p, yaw) => page.evaluate(([p, yaw]) => window.__player.teleport(p, yaw), [p, yaw])
  const waitWorld = async () => {
    await page.waitForFunction(() => {
      const s = window.__oasis.getState()
      return s.phase === 'world' && !s.worldLoading && !s.transition.active
    }, null, { timeout: 60000 })
    await page.waitForFunction(() => window.__player.teleport !== null, null, { timeout: 60000 })
    await sleep(800)
  }
  const setQuality = (q) => page.evaluate((q) => window.__oasis.getState().updateSettings({ quality: q }), q)
  const shot = async (name) => {
    await setQuality('high')
    await sleep(1500)
    await page.screenshot({ path: `${OUT}/${name}.png` })
    await setQuality('low')
    await sleep(300)
  }
  const fps = () => page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n) }; requestAnimationFrame(f) }))
  const hold = async (key, ms) => {
    await page.keyboard.down(key)
    await sleep(ms)
    await page.keyboard.up(key)
  }

  await page.goto(URL)
  await page.waitForSelector('text=OASIS VR KERNEL')
  await page.screenshot({ path: `${OUT}/01-boot.png` })
  await page.keyboard.press('Space')
  await page.waitForSelector('[data-testid=start]', { timeout: 20000 })
  await sleep(1800)
  await page.screenshot({ path: `${OUT}/02-title.png` })
  check('boot sequence skips to title', (await state()).phase === 'title')

  await page.click('[data-testid=start]')
  await page.waitForSelector('[data-testid=avatar-name]', { timeout: 20000 })
  await sleep(1200)
  // pick preset 2, change hair + armour, set name
  await page.click('button:has-text("Nyx Rune")')
  await page.click('[role=tab]:has-text("Hair")')
  await page.click('button.chip:has-text("Mohawk"), button.chip:has-text("Ridge")')
  await page.click('[role=tab]:has-text("Armour")')
  await page.click('button.chip:has-text("Full Rig")')
  await page.fill('[data-testid=avatar-name]', 'Test Pilot')
  await sleep(600)
  await page.screenshot({ path: `${OUT}/03-creator.png` })
  const draft = await page.evaluate(() => null)
  void draft
  await page.click('[data-testid=confirm-avatar]')
  await waitWorld()
  await page.screenshot({ path: `${OUT}/04-hub.png` })
  console.log(`fps (high): ${await fps()}`)
  await setQuality('low')
  await sleep(500)
  console.log(`fps (low): ${await fps()}`)
  let s = await state()
  check('avatar saved to store', s.avatar?.name === 'Test Pilot' && s.avatar?.hair === 'mohawk' && s.avatar?.armour === 'full', JSON.stringify({ n: s.avatar?.name, h: s.avatar?.hair, a: s.avatar?.armour }))
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('oasis-save-v1') ?? '{}'))
  check('avatar persisted to localStorage', saved?.state?.avatar?.name === 'Test Pilot')
  check('HUD shows name + location', (await page.textContent('[data-testid=hud-name]')) === 'Test Pilot' && (await page.textContent('[data-testid=hud-location]')).includes('OASIS Prime'))
  check('first-login achievement + holo-map item', s.progress.achievements.includes('logged-in') && s.progress.items.includes('holo-map'))

  // movement
  await page.mouse.move(640, 380)
  const p0 = await pos()
  await hold('KeyW', 2000)
  const p1 = await pos()
  check('W moves forward (-Z at spawn)', p1.z < p0.z - 3, `z ${p0.z.toFixed(2)} -> ${p1.z.toFixed(2)}`)
  await hold('KeyD', 600)
  const p2 = await pos()
  check('D strafes right (+X)', p2.x > p1.x + 1, `x ${p1.x.toFixed(2)} -> ${p2.x.toFixed(2)}`)
  // sprint
  const e0 = (await state()).energy
  await page.keyboard.down('ShiftLeft')
  await hold('KeyS', 1600)
  await page.keyboard.up('ShiftLeft')
  const e1 = (await state()).energy
  check('Shift sprint drains energy', e1 < e0 - 5, `energy ${e0} -> ${e1}`)
  // jump
  const y0 = (await pos()).y
  await page.keyboard.press('Space')
  let maxY = y0
  const t0 = Date.now()
  while (Date.now() - t0 < 2500) {
    await sleep(30)
    maxY = Math.max(maxY, (await pos()).y)
  }
  await page.waitForFunction((y0) => Math.abs(window.__player.position.y - y0) < 0.2, y0, { timeout: 5000 }).catch(() => {})
  const y2 = (await pos()).y
  check('Space jumps and lands', maxY > y0 + 0.5 && Math.abs(y2 - y0) < 0.2, `y0 ${y0.toFixed(2)} peak ${maxY.toFixed(2)} land ${y2.toFixed(2)}`)
  // camera keys
  const yaw0 = (await pos()).yaw
  await hold('ArrowLeft', 900)
  const yaw1 = (await pos()).yaw
  check('arrow keys rotate camera', Math.abs(yaw1 - yaw0) > 0.3, `yaw ${yaw0.toFixed(2)} -> ${yaw1.toFixed(2)}`)
  // assist-mode drag look
  await page.evaluate(() => window.__oasis.getState().updateSettings({ controlMode: 'assist' }))
  const yaw2 = (await pos()).yaw
  await page.mouse.move(700, 400)
  await page.mouse.down()
  await page.mouse.move(900, 400, { steps: 8 })
  await page.mouse.up()
  await sleep(200)
  const yaw3 = (await pos()).yaw
  check('assist mode: drag rotates camera', Math.abs(yaw3 - yaw2) > 0.3, `yaw ${yaw2.toFixed(2)} -> ${yaw3.toFixed(2)}`)

  // interaction: welcome beacon
  await teleport([-7, 1.2, 19.5], 0)
  await sleep(600)
  const prompt = await page.textContent('[data-testid=prompt]').catch(() => null)
  check('interaction prompt appears near beacon', !!prompt && prompt.includes('welcome beacon'), prompt ?? 'none')
  await page.keyboard.press('KeyE')
  await page.waitForSelector('[data-testid=info]', { timeout: 5000 })
  await shot('05-interact')
  check('E opens interaction overlay', (await state()).overlay?.type === 'info')
  await page.keyboard.press('Escape')
  await sleep(400)
  check('Escape closes overlay', (await state()).overlay === null)
  // pause
  await page.keyboard.press('Escape')
  await sleep(300)
  check('Escape opens pause menu', (await state()).overlay?.type === 'pause')
  await shot('06-pause')
  await page.click('[data-testid=resume]')
  await sleep(300)

  // inventory / map hotkeys
  await page.keyboard.press('KeyI')
  await sleep(300)
  check('I opens inventory', (await state()).overlay?.type === 'inventory')
  await page.keyboard.press('KeyI')
  await page.keyboard.press('KeyM')
  await sleep(400)
  check('M opens map', (await state()).overlay?.type === 'map')
  await shot('07-map')
  await page.keyboard.press('Escape')
  await sleep(300)

  // collectibles
  const w0 = (await state()).progress.wallet
  await teleport([11, 1.2, 8], 0)
  await page.waitForFunction(() => window.__oasis.getState().progress.collected.includes('hub-c2'), null, { timeout: 5000 }).catch(() => {})
  s = await state()
  check('walking into a coin collects it', s.progress.wallet >= w0 + 1 && s.progress.collected.includes('hub-c2'), `wallet ${w0} -> ${s.progress.wallet}`)

  // sky platform secret via teleport onto final stone
  await teleport([21.5, 9.2, -27.5], 0)
  await sleep(500)
  await teleport([27.5, 10.4, -29], 0)
  await page.waitForFunction(() => window.__oasis.getState().progress.secrets.includes('sky-platform'), null, { timeout: 6000 }).catch(() => {})
  s = await state()
  check('sky platform secret + item', s.progress.secrets.includes('sky-platform') && s.progress.items.includes('founder-quarter'))

  // race start
  await teleport([41, 1.2, 7], Math.PI)
  await sleep(600)
  const rp = await page.textContent('[data-testid=prompt]').catch(() => '')
  check('race kiosk prompt', rp?.includes('Velocity Circuit'), rp ?? '')
  await page.keyboard.press('KeyE')
  await sleep(500)
  check('race countdown starts', (await state()).race.status === 'countdown')
  await page.screenshot({ path: `${OUT}/08-race.png` })
  await sleep(3300)
  check('race runs after countdown', (await state()).race.status === 'running')
  // fly through checkpoints by teleporting
  const cps = await page.evaluate(async () => {
    const m = await import('/src/game/world/hub/layout.ts')
    return m.RACE_CHECKPOINTS.map((c) => c.pos)
  })
  for (const c of cps) {
    await teleport([c[0], 1.2, c[2]])
    await sleep(250)
  }
  s = await state()
  check('race finishes and records time', s.progress.bestRace !== null && s.race.status === 'idle' && s.progress.achievements.includes('racer'), `best ${s.progress.bestRace}`)

  // portal to arcade (walk-through)
  await teleport([0, 1.2, -33], 0)
  await hold('KeyW', 900)
  await page.waitForFunction(() => window.__oasis.getState().worldId === 'arcade', null, { timeout: 8000 }).catch(() => {})
  await waitWorld()
  s = await state()
  check('walking through portal travels to Arcade District', s.worldId === 'arcade' && s.progress.achievements.includes('traveler'))
  await shot('09-arcade')
  check('HUD location updates', (await page.textContent('[data-testid=hud-location]')).includes('Arcade District'))

  // hall + cabinets
  await teleport([-17, 1.2, -7], 0)
  await sleep(900)
  await shot('10-hall')
  await teleport([-26, 1.2, -8.4], 0)
  await sleep(600)
  await page.waitForFunction(() => window.__oasis.getState().prompt?.id === 'cab-serpent', null, { timeout: 6000 }).catch(() => {})
  const cp = (await state()).prompt?.label ?? ''
  check('serpent cabinet prompt', cp.includes('NEON SERPENT'), cp)
  await page.keyboard.press('KeyE')
  await page.waitForSelector('[data-testid=arcade-serpent]')
  await page.click('[data-testid=arcade-start]')
  await sleep(1500)
  await page.screenshot({ path: `${OUT}/11-serpent.png` })
  await page.waitForSelector('text=GAME OVER', { timeout: 15000 })
  s = await state()
  check('mini-game plays to game over and records score', 'serpent' in s.progress.highScores, JSON.stringify(s.progress.highScores))
  await page.keyboard.press('Escape')
  await sleep(300)

  // broken cabinet secret -> back room -> copper key
  await teleport([-28.6, 1.2, 0], Math.PI / 2)
  await page.waitForFunction(() => window.__oasis.getState().prompt?.id === 'cab-broken', null, { timeout: 6000 }).catch(() => {})
  const bp = (await state()).prompt?.label ?? ''
  check('broken cabinet prompt', bp.includes('out-of-order'), bp)
  await page.keyboard.press('KeyE')
  await sleep(400)
  await page.keyboard.press('Escape')
  await sleep(1500)
  // walk through the doorway west
  await hold('KeyW', 2600)
  const bpos = await pos()
  check('can walk into the back room after moving cabinet', bpos.x < -31.5, `x ${bpos.x.toFixed(2)}`)
  await teleport([-38, 1.2, 2], 0)
  await sleep(800)
  s = await state()
  check('copper key collected', s.progress.items.includes('copper-key') && s.progress.secrets.includes('hidden-cabinet'))
  await shot('12-backroom')

  // light sequence
  for (const x of [2, -6, -2]) {
    await teleport([x, 1.2, -31], 0)
    await page.waitForFunction((x) => Math.abs(window.__player.position.x - x) < 0.2, x, { timeout: 5000 }).catch(() => {})
    await sleep(900)
  }
  await page.waitForFunction(() => window.__oasis.getState().progress.secrets.includes('light-sequence'), null, { timeout: 5000 }).catch(() => {})
  s = await state()
  check('light pad sequence secret', s.progress.secrets.includes('light-sequence'), JSON.stringify({ ...(await pos()), secrets: s.progress.secrets, overlay: s.overlay?.type }))

  // prize counter
  await page.evaluate(() => window.__oasis.getState().addWallet(10))
  await teleport([7.6, 1.2, -6], -Math.PI / 2)
  await sleep(600)
  await page.keyboard.press('KeyE')
  await page.waitForSelector('[data-testid=shop]')
  await page.click('[data-testid=shop] button:has-text("◎ 8")')
  await sleep(300)
  s = await state()
  check('prize redeemed', s.progress.items.includes('neon-visor'))
  await page.keyboard.press('Escape')
  await page.keyboard.press('KeyI')
  await page.click('[data-testid=inventory] button:has-text("Neon Visor")')
  await page.click('button:has-text("Equip on avatar")')
  s = await state()
  check('equip item changes avatar', s.avatar.headGear === 'neon-visor')
  await page.keyboard.press('Escape')

  // map fast travel back to hub
  await page.keyboard.press('KeyM')
  await page.click('[data-testid=map] button:has-text("OASIS Prime")')
  await page.waitForFunction(() => window.__oasis.getState().worldId === 'hub', null, { timeout: 8000 })
  await waitWorld()
  check('map fast travel back to hub', (await state()).worldId === 'hub')

  // founder's gate
  await teleport([-30, 1.2, 0], Math.PI / 2)
  await sleep(600)
  await page.keyboard.press('KeyE')
  await page.waitForSelector('[data-testid=gate]')
  await page.click('[data-testid=insert-key]')
  await sleep(1500)
  s = await state()
  check('copper key opens the Founder’s Gate', s.progress.gateOpened && s.progress.achievements.includes('gate'))
  await page.keyboard.press('Escape')
  await sleep(1500)
  await shot('13-gate')

  // persistence across reload
  await page.reload()
  await page.waitForSelector('text=OASIS VR KERNEL')
  await page.keyboard.press('Space')
  await page.waitForSelector('[data-testid=continue]', { timeout: 20000 })
  const cont = await page.textContent('[data-testid=continue]')
  s = await state()
  check('avatar + progress persist after reload', cont.includes('Test Pilot') && s.progress.gateOpened && s.avatar.headGear === 'neon-visor', cont)
  await page.click('[data-testid=continue]')
  await waitWorld()
  check('continue enters saved world', (await state()).phase === 'world')

  const real = errors.filter((e) => !/requestPointerLock|pointer lock|WebGL: |GPU stall|Automatic fallback/i.test(e))
  check('no runtime errors', real.length === 0, real.slice(0, 5).join(' | '))
  await ctx.close()
}

async function mobile() {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(URL)
  await page.waitForSelector('text=OASIS VR KERNEL')
  await page.tap('body')
  await page.waitForSelector('[data-testid=start]', { timeout: 20000 })
  await sleep(1500)
  await page.screenshot({ path: `${OUT}/m1-title.png` })
  await page.tap('[data-testid=start]')
  await page.waitForSelector('[data-testid=avatar-name]')
  await sleep(1000)
  await page.screenshot({ path: `${OUT}/m2-creator.png` })
  await page.tap('[data-testid=confirm-avatar]')
  await page.waitForFunction(() => {
    const s = window.__oasis.getState()
    return s.phase === 'world' && !s.worldLoading && window.__player.teleport
  }, null, { timeout: 60000 })
  await sleep(1200)
  check('mobile: touch controls shown', await page.isVisible('[data-testid=touch-controls]'))
  // drag the virtual stick upward
  const p0 = await page.evaluate(() => ({ ...window.__player.position }))
  const cdp = await ctx.newCDPSession(page)
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] })
  await touch('touchStart', 90, 600)
  for (let i = 1; i <= 6; i++) await touch('touchMove', 90, 600 - i * 10)
  await sleep(1200)
  await touch('touchEnd', 90, 540)
  const p1 = await page.evaluate(() => ({ ...window.__player.position }))
  check('mobile: virtual stick moves player', Math.hypot(p1.x - p0.x, p1.z - p0.z) > 2, `moved ${Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(2)}`)
  await page.screenshot({ path: `${OUT}/m3-hub.png` })
  await page.tap('[data-testid=pause-btn]')
  await sleep(500)
  await page.screenshot({ path: `${OUT}/m4-pause.png` })
  check('mobile: pause menu fits', await page.isVisible('[data-testid=pause-menu]'))
  check('mobile: no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '))
  await ctx.close()
}

try {
  await desktop()
  await mobile()
} catch (e) {
  check('test run completed', false, String(e))
} finally {
  await browser.close()
}
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)

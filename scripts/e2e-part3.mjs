// Part 3 end-to-end test: new game, NPCs & quests, market & equipment, the three expansion worlds,
// the final showdown (all five stages), all three endings, profile, persistence and mobile.
// Usage: start `npm run dev`, then `node scripts/e2e-part3.mjs [url]`.
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
let currentPage = null
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })

async function desktop() {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 680 } })
  const page = await ctx.newPage()
  currentPage = page
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  const state = () => page.evaluate(() => window.__oasis.getState())
  const prog = async () => (await state()).progress
  const teleport = (p, yaw = 0) => page.evaluate(([p, yaw]) => window.__player.teleport(p, yaw), [p, yaw])
  const pos = () => page.evaluate(() => ({ ...window.__player.position }))
  const ready = async () => {
    await page.waitForFunction(() => {
      const s = window.__oasis.getState()
      return s.phase === 'world' && !s.worldLoading && !s.transition.active && window.__player?.teleport
    }, null, { timeout: 90000 })
    await sleep(700)
  }
  const travel = async (w, spawn) => {
    await page.evaluate(([w, spawn]) => window.__oasis.getState().travel(w, spawn), [w, spawn])
    await page.waitForFunction((w) => window.__oasis.getState().worldId === w, w, { timeout: 10000 })
    await ready()
  }
  const interact = async (p, id, yaw = 0) => {
    await teleport(p, yaw)
    const ok = await page.waitForFunction((id) => window.__oasis.getState().prompt?.id === id, id, { timeout: 7000 }).then(() => true).catch(() => false)
    if (!ok) return false
    await page.keyboard.press('KeyE')
    await sleep(350)
    return true
  }
  const closeAll = async () => {
    for (let i = 0; i < 3; i++) {
      const o = (await state()).overlay
      if (!o) return
      await page.keyboard.press('Escape')
      await sleep(250)
    }
  }
  const talk = async (npc) => {
    const p = await page.evaluate((id) => {
      const e = window.__presence.providers[0].entities().find((x) => x.id === id)
      return e ? [e.position.x, e.position.y, e.position.z] : null
    }, npc)
    if (!p) return false
    await teleport([p[0], p[1] + 1.2, p[2] + 1.4], Math.PI)
    const ok = await page.waitForFunction((id) => window.__oasis.getState().prompt?.id === `npc-${id}`, npc, { timeout: 7000 }).then(() => true).catch(() => false)
    if (!ok) return false
    await page.keyboard.press('KeyE')
    await page.waitForSelector(`[data-testid=dialogue][data-npc=${npc}]`, { timeout: 5000 })
    await sleep(300)
    return true
  }
  const choose = async (text) => {
    const btn = page.locator('[data-testid=dialogue] button', { hasText: text }).first()
    if (!(await btn.count())) return false
    await btn.click()
    await sleep(300)
    return true
  }
  // Teleport onto a relic and wait until the pickup registers (frame rate varies under software rendering).
  const grab = async (at) => {
    const n = (await prog()).relics.length
    await teleport(at)
    await page.waitForFunction((n) => window.__oasis.getState().progress.relics.length > n, n, { timeout: 5000 }).catch(() => {})
  }
  const questState = async (id) => (await prog()).quests[id]

  // ---------------- New game ----------------
  await page.goto(URL)
  await page.waitForSelector('text=OASIS VR KERNEL')
  await page.keyboard.press('Space')
  await page.waitForSelector('[data-testid=start]', { timeout: 30000 })
  await page.click('[data-testid=start]')
  await page.waitForSelector('[data-testid=avatar-name]')
  await page.fill('[data-testid=avatar-name]', 'Wade Runner')
  await page.click('[role=tab]:has-text("Gear")')
  check('new game: aura options locked until earned', await page.isDisabled('button.chip:has-text("Frost")'))
  await page.click('[data-testid=confirm-avatar]')
  await ready()
  let p = await prog()
  check('new game starts in OASIS Prime with an empty quest log', (await state()).worldId === 'hub' && Object.keys(p.quests).length === 0)
  await page.evaluate(() => window.__oasis.getState().updateSettings({ quality: 'low' }))
  await page.evaluate(() => window.__oasis.getState().addWallet(150))

  // ---------------- NPCs, quests, market ----------------
  check('hub residents are present (NPCs, not players)', (await page.evaluate(() => window.__presence.providers[0].entities().length)) >= 5 && !(await page.evaluate(() => window.__presence.online())))
  check('talk to Glimmer', await talk('glimmer'))
  await page.screenshot({ path: `${OUT}/p3-01-dialogue.png` })
  await choose('Quest: Beyond the Plaza')
  await choose('I’ll do it')
  check('quest accepted from an NPC', (await questState('q-explorer')) === 'active')
  await closeAll()
  check('talk to Mercer', await talk('mercer'))
  await choose('Show me the Exchange')
  await page.waitForSelector('[data-testid=market]')
  await page.click('[data-testid=buy-neon-kimono]')
  await page.click('[data-testid=buy-paint-gold]')
  await page.click('[data-testid=buy-snow-globe]')
  await sleep(300)
  p = await prog()
  check('marketplace purchases with earned coins', p.items.includes('neon-kimono') && p.items.includes('paint-gold') && p.items.includes('snow-globe'), `wallet ${p.wallet}`)
  await page.screenshot({ path: `${OUT}/p3-02-market.png` })
  await page.click('[data-testid=equip-neon-kimono]')
  await sleep(200)
  check('equipping a purchase changes the avatar', (await state()).avatar.outfit === 'kimono')
  await closeAll()
  check('talk to Patch → Lost Data', (await talk('patch')) && (await choose('Quest: Lost Data')) && (await choose('I’ll do it')))
  await closeAll()

  // ---------------- Neon Heights ----------------
  await teleport([29, 1.2, -17.6], Math.atan2(29, -17.6) + Math.PI)
  await page.keyboard.down('KeyW')
  await page.waitForFunction(() => window.__oasis.getState().worldId === 'city', null, { timeout: 8000 }).catch(() => {})
  await page.keyboard.up('KeyW')
  await ready()
  check('walk through the Neon Heights portal', (await state()).worldId === 'city')
  await page.screenshot({ path: `${OUT}/p3-03-city.png` })
  await talk('dash')
  await choose('Quest: Rooftop Runner')
  await choose('I’ll do it')
  await choose('Quest: Special Delivery')
  await choose('I’ll do it')
  await closeAll()
  p = await prog()
  check('Dash: two quests, package handed over', p.quests['q-rooftop'] === 'active' && p.quests['q-courier'] === 'active' && p.items.includes('sealed-package'))
  // ride lift A up (real kinematic platform)
  // board while the lift rests at the bottom (its cycle runs on the physics clock)
  await page.waitForFunction(() => window.__lifts?.['-14,7'] === 0, null, { timeout: 20000 }).catch(() => {})
  await teleport([-14, 1.4, 7], 0)
  await page.waitForFunction(() => window.__player.position.y > 7, null, { timeout: 20000 }).catch(() => {})
  check('lift carries the player up to a rooftop', (await pos()).y > 7, `y=${(await pos()).y.toFixed(1)}`)
  // jump pad on Kasumi roof → Radio 8 roof
  await teleport([-14, 9.2, 0], 0)
  await page.keyboard.down('KeyW')
  await page.waitForFunction(() => window.__player.position.z < -2.4 || window.__player.position.y > 10, null, { timeout: 6000 }).catch(() => {})
  await page.keyboard.up('KeyW')
  await page.waitForFunction(() => window.__player.position.y > 19 && window.__player.position.z < -15, null, { timeout: 8000 }).catch(() => {})
  await sleep(1500)
  const r3 = await pos()
  check('jump pad launches onto the Radio 8 roof', r3.y > 19.5 && r3.z < -18, `(${r3.x.toFixed(1)}, ${r3.y.toFixed(1)}, ${r3.z.toFixed(1)})`)
  await interact([-14, 21.2, -25], 'radio-tower', Math.PI)
  check('broadcast tower switches on', (await prog()).flags.includes('city-radio'))
  await page.screenshot({ path: `${OUT}/p3-04-radio.png` })
  // collect sigils
  for (const s of [[-27, 1.2, -12], [-16, 9.2, 2], [16, 15.2, 1], [-11, 21.2, -21], [16.5, 15.2, -18.5]]) {
    await grab(s)
  }
  // secret: the pad behind the Vanta billboard
  await interact([12, 27.2, -23], 'billboard-switch')
  await interact([12, 27.2, -23], 'billboard-switch')
  await teleport([14, 27.2, -31.2])
  await page.waitForFunction(() => window.__oasis.getState().progress.flags.includes('city-rooftop'), null, { timeout: 9000 }).catch(() => {})
  check('hidden pad behind the billboard reaches the Skyline Garden', (await prog()).flags.includes('city-rooftop'))
  await page.screenshot({ path: `${OUT}/p3-05-garden.png` })
  await teleport([-3, 35.2, -50])
  await sleep(800)
  p = await prog()
  check('all six Neon Sigils collected', p.relics.filter((r) => r.startsWith('sigil')).length === 6 && p.achievements.includes('city-relics'))
  await talk('dash')
  await choose('Turn in: Rooftop Runner')
  await closeAll()
  p = await prog()
  check('Rooftop Runner turned in → Hoverboard', p.quests['q-rooftop'] === 'done' && p.items.includes('hoverboard'))

  // ---------------- Aether Isles ----------------
  await travel('fantasy')
  await page.screenshot({ path: `${OUT}/p3-06-fantasy.png` })
  await talk('ysolde')
  await choose('package from Dash')
  check('item exchange: package → Knight’s Token', (await prog()).items.includes('ysolde-token'))
  await choose('Quest: The Aether Crystal')
  await choose('I’ll do it')
  await closeAll()
  const statuePresses = [1, 3, 2]
  const statuePos = [[-6, 1.2, -10], [6, 1.2, -10], [0, 1.2, -3.5]]
  for (let i = 0; i < 3; i++) {
    await interact(statuePos[i], `statue-${i}`, Math.PI)
    for (let k = 1; k < statuePresses[i]; k++) {
      await page.keyboard.press('KeyE')
      await sleep(250)
    }
  }
  await sleep(400)
  check('statue puzzle raises the aether bridge', (await prog()).flags.includes('fantasy-bridge'))
  // walk the bridge steps for real
  await teleport([0, 1.2, -21], 0)
  await page.keyboard.down('KeyW')
  for (let i = 0; i < 10 && (await pos()).z > -37; i++) {
    await page.keyboard.press('Space')
    await sleep(450)
  }
  await page.keyboard.up('KeyW')
  await sleep(800)
  const onCastle = await pos()
  check('aether bridge is walkable up to the castle island', onCastle.y > 4.5 && onCastle.z < -35, `(${onCastle.y.toFixed(1)}, ${onCastle.z.toFixed(1)})`)
  for (const t of [[-6, 5.2, -53], [6, 5.2, -53], [-6, 5.2, -43], [6, 5.2, -43]]) {
    await teleport(t)
    await sleep(600)
  }
  check('rune tiles reveal the secret portal', (await prog()).flags.includes('fantasy-secret'))
  await teleport([0, 5.2, -46.5], 0)
  await page.keyboard.down('KeyW')
  await page.waitForFunction(() => window.__player.position.y > 25, null, { timeout: 6000 }).catch(() => {})
  await page.keyboard.up('KeyW')
  await sleep(600)
  check('secret warp ring reaches the hidden garden', (await pos()).y > 25)
  await teleport([22, 31.2, -64])
  await page.waitForFunction(() => window.__oasis.getState().progress.items.includes('aether-crystal'), null, { timeout: 5000 }).catch(() => {})
  await page.screenshot({ path: `${OUT}/p3-07-garden.png` })
  for (const r of [[24, 31.2, -66], [13, 1.2, 18], [-7.5, 1.2, -19], [-10, 15.4, -58.5], [-28, 4.4, -14]]) {
    await grab(r)
  }
  p = await prog()
  check('Aether Crystal + all five rune stones', p.items.includes('aether-crystal') && p.relics.filter((r) => r.startsWith('rune')).length === 5)
  await talk('ysolde')
  await choose('Turn in: The Aether Crystal')
  await closeAll()
  check('Aether Crystal quest complete → Frost Aura', (await prog()).items.includes('aura-frost'))

  // ---------------- Null Sector ----------------
  await travel('wasteland')
  await page.screenshot({ path: `${OUT}/p3-08-wasteland.png` })
  await talk('echo')
  await choose('Quest: The Last Save')
  await choose('I’ll do it')
  await closeAll()
  await teleport([-12, 1.2, 3.5])
  await sleep(900)
  const afterPool = await pos()
  check('corruption pool is a hazard (respawn)', Math.hypot(afterPool.x + 12, afterPool.z - 3.5) > 5, `(${afterPool.x.toFixed(1)}, ${afterPool.z.toFixed(1)})`)
  await teleport([-13, 1.2, -12.8])
  await sleep(2500)
  const afterBridge = await pos()
  check('collapsing bridge tile drops the player', afterBridge.y < -2 || Math.hypot(afterBridge.x + 13, afterBridge.z + 12.8) > 4, `y=${afterBridge.y.toFixed(1)}`)
  await sleep(1500)
  for (const s of [[23, 7.6, -4], [-13, 1.2, -27], [12, 1.2, -42], [10, 1.2, -12]]) {
    await grab(s)
  }
  await teleport([23.5, 1.2, -40], -Math.PI / 2)
  await page.keyboard.down('KeyW')
  await page.waitForFunction(() => window.__oasis.getState().progress.flags.includes('waste-passage'), null, { timeout: 6000 }).catch(() => {})
  await page.keyboard.up('KeyW')
  check('glitched wall is a hidden passage', (await prog()).flags.includes('waste-passage'))
  await teleport([29, 1.2, -40])
  await sleep(700)
  await grab([30, 1.2, -42])
  p = await prog()
  check('Ghost Byte + all five data shards', p.items.includes('ghost-byte') && p.relics.filter((r) => r.startsWith('shard')).length === 5 && p.achievements.includes('wasteland-relics'))
  await page.screenshot({ path: `${OUT}/p3-09-secret-room.png` })
  await talk('echo')
  await choose('Turn in: The Last Save')
  await closeAll()
  check('The Last Save turned in (Ghost Byte consumed, clue gained)', (await questState('q-ghost')) === 'done' && !(await prog()).items.includes('ghost-byte') && (await prog()).journal.includes('last-door'))

  // ---------------- Back to the hub: turn-ins ----------------
  await travel('hub')
  await talk('patch')
  await choose('Turn in: Lost Data')
  await closeAll()
  await talk('glimmer')
  await choose('Turn in: Beyond the Plaza')
  await closeAll()
  await travel('city')
  await talk('dash')
  await choose('Turn in: Special Delivery')
  await closeAll()
  p = await prog()
  check('side quests completed: Lost Data, Beyond the Plaza, Special Delivery', p.quests['q-lostdata'] === 'done' && p.quests['q-explorer'] === 'done' && p.quests['q-courier'] === 'done' && !p.items.includes('ysolde-token'))
  check('five side quests → Helping Hand achievement', p.achievements.includes('quests-5'))
  await page.keyboard.press('KeyL')
  await page.waitForSelector('[data-testid=quests]')
  await page.screenshot({ path: `${OUT}/p3-10-questlog.png` })
  await closeAll()

  // ---------------- Inventory & equipment ----------------
  await page.keyboard.press('KeyI')
  await page.waitForSelector('[data-testid=inventory]')
  await sleep(800)
  const equipFrom = async (tab, item, done) => {
    await page.click(`[data-testid=inv-tab-${tab}]`)
    await page.waitForSelector(`[data-testid=inv-tab-${tab}][aria-selected=true]`)
    await page.click(`[data-testid=inv-${item}]`)
    await page.waitForSelector(`[data-testid=inv-${item}][aria-pressed=true]`)
    if (!(await page.evaluate(done))) await page.click('[data-testid=inv-equip]')
    await sleep(300)
  }
  const before3 = await state()
  console.log(`   (before: aura=${before3.avatar.aura} paint=${before3.progress.paint})`)
  await equipFrom('accessory', 'aura-frost', () => window.__oasis.getState().avatar.aura === 'frost')
  await equipFrom('vehicle', 'paint-gold', () => window.__oasis.getState().progress.paint === '#ffd23f')
  await page.click('[data-testid=inv-tab-collectible]')
  await page.screenshot({ path: `${OUT}/p3-11-inventory.png` })
  await closeAll()
  const av = (await state()).avatar
  p = await prog()
  check('inventory equips an aura and a car paint', av.aura === 'frost' && p.paint === '#ffd23f')

  // ---------------- Final showdown ----------------
  // Grant the late-game state this suite does not replay (covered by the Part 1/2 suites).
  await page.evaluate(() => {
    const g = window.__oasis.getState()
    window.__oasis.setState({
      progress: {
        ...g.progress,
        items: [...new Set([...g.progress.items, 'founder-egg'])],
        glyphs: [1, 2, 3, 4, 5, 6],
        trials: ['past', 'present', 'future'],
        journal: [...new Set([...g.progress.journal, 'lights', 'mem-ticket', 'mem-map', 'mem-cart', 'mem-letter'])],
        claimedCabinets: ['glitchhop', 'gladiator'],
        gpFinishes: 1,
        gpBest: 58,
      },
    })
  })
  await sleep(500)
  check('main quest auto-starts once the Egg is claimed', (await questState('q-null')) === 'active')
  await travel('hub')
  await teleport([-11.5, 1.2, 32.8], Math.atan2(-11.5, 32.8) + Math.PI)
  await page.keyboard.down('KeyW')
  await page.waitForFunction(() => window.__oasis.getState().worldId === 'showdown', null, { timeout: 8000 }).catch(() => {})
  await page.keyboard.up('KeyW')
  await ready()
  check('Null Citadel portal appears in the hub and leads to the showdown', (await state()).worldId === 'showdown')
  await page.waitForSelector('[data-testid=prep]')
  await page.screenshot({ path: `${OUT}/p3-12-prep.png` })
  check('stage 1: preparation lists clues and abilities', (await page.textContent('[data-testid=prep]')).includes('SUN → SKY → BLOOM'))
  await page.click('[data-testid=gift-aegis]')
  await page.click('[data-testid=prep-begin]')
  await sleep(600)
  const sd = () => page.evaluate(() => window.__showdown.getState())
  check('stage 2 begins with Aegis integrity', (await sd()).stage === 'infil' && (await sd()).integrity === 5)
  // firewall damage (wait for it to switch on)
  await page.waitForFunction(() => (performance.now() / 1000 + 0) % 2.6 / 2.6 < 0.5, null, { timeout: 5000 }).catch(() => {})
  await teleport([0, 1.2, -50.1])
  await sleep(500)
  check('firewall costs integrity and respawns you', (await sd()).integrity < 5)
  // phase dash through a firewall (ability)
  const before = (await sd()).integrity
  await page.evaluate(() => window.__showdown.setState({ invulnUntil: 0 }))
  await teleport([0, 1.2, -52.4], 0)
  await sleep(300)
  await page.keyboard.press('KeyF')
  await sleep(600)
  check('phase dash ability moves the player through', (await pos()).z < -54, `z=${(await pos()).z.toFixed(1)} integrity ${before}→${(await sd()).integrity}`)
  await teleport([0, 1.2, -63.5])
  await page.waitForFunction(() => window.__showdown.getState().stage === 'puzzle', null, { timeout: 5000 }).catch(() => {})
  check('stage 3 reached after the firewall', (await sd()).stage === 'puzzle' && (await prog()).flags.includes('sd-infil'))
  // wrong lever pull
  const intBefore = (await sd()).integrity
  await interact([0, 1.2, -79.8], 'door-lever', Math.PI)
  await sleep(400)
  check('a wrong lever pull bites back', (await sd()).integrity === intBefore - 1 && !(await sd()).doorOpen, `integrity ${intBefore}→${(await sd()).integrity}`)
  // set the six sockets to marks 1..6
  const sockPress = [4, 3, 2, 4, 3, 2]
  for (let i = 0; i < 6; i++) {
    await interact([-6.7, 1.2, -67.5 - i * 2.6], `socket-${i}`, -Math.PI / 2)
    for (let k = 1; k < sockPress[i]; k++) {
      await page.keyboard.press('KeyE')
      await sleep(200)
    }
  }
  const plinthPress = [2, 1, 3, 2]
  for (let i = 0; i < 4; i++) {
    await interact([6.7, 1.2, -68 - i * 3.6], `plinth-${i}`, Math.PI / 2)
    for (let k = 1; k < plinthPress[i]; k++) {
      await page.keyboard.press('KeyE')
      await sleep(200)
    }
  }
  for (const x of [1.5, -4.5, -1.5]) {
    await teleport([x, 1.2, -76])
    await sleep(800)
  }
  const sdState = await sd()
  check('marks, memories and lights set from the clues', sdState.sockets.join() === '1,2,3,4,5,6' && sdState.plinths.join() === '0,1,2,3' && sdState.lightsDone, `${sdState.sockets} | ${sdState.plinths} | ${sdState.lightsDone}`)
  await interact([0, 1.2, -79.8], 'door-lever', Math.PI)
  await sleep(500)
  check('the last door opens', (await sd()).doorOpen && (await prog()).flags.includes('sd-puzzle'))
  await page.screenshot({ path: `${OUT}/p3-13-door.png` })
  // stage 4: the Null Titan
  await teleport([0, 1.2, -95], 0)
  await page.waitForFunction(() => window.__showdown.getState().stage === 'boss', null, { timeout: 5000 }).catch(() => {})
  check('stage 4: Null Titan encounter starts', (await sd()).stage === 'boss')
  const cz = -110
  const pylons = [Math.PI / 2, (7 * Math.PI) / 6, (11 * Math.PI) / 6].map((a) => [Math.sin(a) * 12.5, 1.2, cz + Math.cos(a) * 12.5])
  let hits = 0
  let fails = 0
  for (let attempt = 0; attempt < 30 && (await sd()).titanHp > 0; attempt++) {
    const s = await sd()
    if ((await state()).overlay?.type === 'sd-fail') {
      fails++
      await page.click('[data-testid=sd-retry]')
      await sleep(500)
      continue
    }
    const i = s.spent.findIndex((x) => !x)
    await teleport(pylons[i])
    // hop when a shockwave approaches; otherwise hold position to charge
    const t0 = Date.now()
    while (Date.now() - t0 < 1200) {
      await page.keyboard.press('Space')
      await sleep(250)
    }
    if ((await sd()).integrity < s.integrity) hits++
  }
  await page.screenshot({ path: `${OUT}/p3-14-titan.png` })
  p = await prog()
  check('charging the three pylons defeats the Null Titan', (await sd()).titanHp <= 0 && p.flags.includes('sd-boss') && p.achievements.includes('final'), `hits taken ${hits}, stage restarts ${fails}`)
  // stage 5: the choice
  await interact([-6, 1.2, -140.4], 'choice-open', Math.PI)
  await page.waitForSelector('[data-testid=ending-confirm]')
  await page.click('[data-testid=ending-choose]')
  await page.waitForSelector('[data-testid=ending][data-ending=open]')
  const endA = await page.textContent('[data-testid=ending]')
  await page.screenshot({ path: `${OUT}/p3-15-ending-open.png` })
  p = await prog()
  check('ending: The Open Door, shaped by progress', p.endings.includes('open') && endA.includes('Patch') && endA.includes('Dash'), endA.slice(0, 80))
  check('main quest completes with the choice', (await questState('q-null')) === 'done')
  await page.click('[data-testid=ending-profile]')
  await page.waitForSelector('[data-testid=profile-view]')
  await sleep(1200)
  await page.screenshot({ path: `${OUT}/p3-16-profile.png` })
  check('immersive profile shows the final outcome', (await page.textContent('[data-testid=profile-outcome]')).includes('The Open Door'))
  await page.click('[data-testid=profile-back]')
  await ready()
  // replay the choice for the other endings
  const endingTexts = { open: endA }
  for (const [id, pos2] of [['caretaker', [0, 1.2, -143.4]], ['rest', [6, 1.2, -140.4]]]) {
    await travel('showdown')
    await page.waitForSelector('[data-testid=prep]')
    await page.click('[data-testid=gift-chronos]')
    await page.click('[data-testid=prep-skip]')
    await sleep(600)
    await interact(pos2, `choice-${id}`, Math.PI)
    await page.waitForSelector('[data-testid=ending-confirm]')
    await page.click('[data-testid=ending-choose]')
    await page.waitForSelector(`[data-testid=ending][data-ending=${id}]`)
    endingTexts[id] = await page.textContent('[data-testid=ending]')
    await page.screenshot({ path: `${OUT}/p3-17-ending-${id}.png` })
    await page.click('[data-testid=ending-hub]')
    await ready()
  }
  p = await prog()
  check('three distinct endings, all recorded', p.endings.length === 3 && new Set(Object.values(endingTexts)).size === 3 && p.achievements.includes('all-endings'))

  // ---------------- Settings & persistence ----------------
  await page.keyboard.press('Escape')
  await page.click('[data-testid=open-settings]')
  await page.waitForSelector('[data-testid=settings]')
  check('settings expose quality presets and separate audio volumes', (await page.textContent('[data-testid=settings]')).includes('Medium') && (await page.textContent('[data-testid=settings]')).includes('Environmental audio'))
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.reload()
  await page.waitForSelector('text=OASIS VR KERNEL')
  await page.keyboard.press('Space')
  await page.waitForSelector('[data-testid=continue]', { timeout: 30000 })
  p = await prog()
  check('quests, relics, endings and equipment persist after reload', p.endings.length === 3 && p.relics.length >= 16 && p.quests['q-rooftop'] === 'done' && (await state()).avatar.aura === 'frost')
  const real = errors.filter((e) => !/requestPointerLock|pointer lock|WebGL: |GPU stall|Automatic fallback/i.test(e))
  check('no runtime errors', real.length === 0, real.slice(0, 5).join(' | '))
  await ctx.close()
}

async function mobile() {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.addInitScript(() => localStorage.setItem('oasis-save-v1', JSON.stringify({ state: { avatar: { name: 'Pocket' }, worldId: 'hub', progress: { visited: ['hub'], claimedCabinets: ['gladiator'] } }, version: 1 })))
  await page.goto(URL)
  await page.waitForSelector('text=OASIS VR KERNEL')
  await page.tap('body')
  await page.waitForSelector('[data-testid=continue]', { timeout: 30000 })
  check('mobile: defaults to low graphics quality', (await page.evaluate(() => window.__oasis.getState().settings.quality)) === 'low')
  await page.tap('[data-testid=continue]')
  await page.waitForFunction(() => window.__player?.teleport && !window.__oasis.getState().worldLoading, null, { timeout: 90000 })
  await sleep(1000)
  check('mobile: dash button appears with the ability', await page.isVisible('button[aria-label="Phase dash"]'))
  const e = await page.evaluate(() => window.__presence.providers[0].entities().find((x) => x.id === 'glimmer').position)
  await page.evaluate((e) => window.__player.teleport([e.x, 1.2, e.z + 1.4], Math.PI), e)
  await page.waitForFunction(() => window.__oasis.getState().prompt?.id === 'npc-glimmer', null, { timeout: 7000 }).catch(() => {})
  await page.tap('button[aria-label="Interact"]')
  await page.waitForSelector('[data-testid=dialogue]', { timeout: 5000 }).catch(() => {})
  check('mobile: talk to an NPC with the touch button', await page.isVisible('[data-testid=dialogue]'))
  await page.screenshot({ path: `${OUT}/p3-m1-dialogue.png` })
  await page.tap('[data-testid=dlg-0]')
  await sleep(300)
  await page.evaluate(() => window.__oasis.getState().closeOverlay())
  await page.evaluate(() => window.__oasis.getState().openProfile())
  await page.waitForSelector('[data-testid=profile-view]')
  await sleep(1000)
  await page.screenshot({ path: `${OUT}/p3-m2-profile.png` })
  check('mobile: profile view renders', await page.isVisible('[data-testid=profile-back]'))
  check('mobile: no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '))
  await ctx.close()
}

try {
  await desktop()
  await mobile()
} catch (e) {
  check('test run completed', false, String(e).slice(0, 400))
  try {
    await currentPage?.screenshot({ path: `${OUT}/p3-failure.png` })
    console.log('state at failure:', JSON.stringify(await currentPage?.evaluate(() => { const s = window.__oasis.getState(); return { world: s.worldId, phase: s.phase, loading: s.worldLoading, transition: s.transition, overlay: s.overlay, error: s.worldError } })))
  } catch {}
} finally {
  await browser.close()
}
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)

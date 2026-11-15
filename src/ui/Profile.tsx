import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ACHIEVEMENTS, CABINETS, GLYPHS, ITEMS, SECRETS, TRIALS, levelFor } from '../data/content'
import { QUESTS } from '../data/quests'
import { ENDING_CHOICES } from '../data/endings'
import { RELIC_SETS, completionPercent, useGame } from '../store/useGame'
import { WORLDS, WORLD_ORDER } from '../game/world/registry'
import { GlyphIcon } from './GlyphIcon'
import { xpPct } from './panels/Panels'

function Card({ title, accent, children, delay = 0, testid }: { title: string; accent: string; children: ReactNode; delay?: number; testid?: string }) {
  return (
    <motion.div className="holo p-3" style={{ '--accent': accent } as CSSProperties} initial={{ opacity: 0, y: 14, rotateY: -8 }} animate={{ opacity: 1, y: 0, rotateY: 0 }} transition={{ delay, duration: 0.5 }} data-testid={testid}>
      <div className="mb-1.5 font-display text-[0.6rem] uppercase tracking-[0.28em]" style={{ color: accent }}>
        {title}
      </div>
      {children}
    </motion.div>
  )
}

/** Immersive player profile: holographic cards floating around the 3D avatar (rendered by ProfileScene). */
export function Profile() {
  const avatar = useGame((s) => s.avatar)
  const p = useGame((s) => s.progress)
  if (!avatar) return null
  const back = () => useGame.getState().setPhase('world')
  const outcome = p.finalOutcome
  const ending = outcome ? ENDING_CHOICES.find((e) => e.id === outcome.ending) : null
  const doneQuests = QUESTS.filter((q) => p.quests[q.id] === 'done')
  const equipped = [avatar.outfit, avatar.armour, avatar.headGear, avatar.backGear, avatar.aura].filter((x) => x && x !== 'none')
  return (
    <motion.div className="fixed inset-0 z-30 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="profile-view">
      <div className="mx-auto grid min-h-full max-w-7xl grid-cols-1 gap-3 p-3 pb-24 md:grid-cols-[320px_1fr_320px] md:p-5">
        <div className="flex flex-col gap-3">
          <Card title="Identity" accent={avatar.accent}>
            <div className="font-display text-xl font-black text-white">{avatar.name}</div>
            <div className="font-mono text-[0.7rem] text-white/60">Level {levelFor(p.xp)} · {p.xp} XP · {completionPercent(p)}% complete</div>
            <div className="mt-1 h-1 bg-white/10">
              <div className="h-full bg-cyan" style={{ width: `${xpPct(p.xp)}%` }} />
            </div>
            <div className="mt-2 text-[0.7rem] text-white/60">Wearing: {equipped.join(' · ') || 'basics'}</div>
          </Card>
          <Card title="Final outcome" accent={ending?.color ?? '#ff2040'} delay={0.05} testid="profile-outcome">
            {outcome && ending ? (
              <>
                <div className="font-display text-lg" style={{ color: ending.color }}>{ending.title}</div>
                <div className="text-[0.75rem] text-white/70">{outcome.rank} · chose {ending.value} · gift: {outcome.gift}</div>
                <div className="mt-1 text-[0.68rem] text-white/50">Endings seen: {p.endings.map((e) => ENDING_CHOICES.find((c) => c.id === e)?.title).join(', ')}</div>
              </>
            ) : (
              <div className="text-[0.78rem] text-white/60">{p.items.includes('founder-egg') ? 'The Null Protocol awaits in the Null Citadel.' : 'The story is still being written.'}</div>
            )}
          </Card>
          <Card title="Challenges" accent="#ffe14d" delay={0.1}>
            <ul className="space-y-0.5 text-[0.75rem] text-white/80">
              <li>{p.gpFinishes ? '✔' : '○'} The Race — {p.gpBest ? `${p.gpBest.toFixed(2)}s best` : 'not finished'}</li>
              {TRIALS.map((t) => (
                <li key={t.id}>{p.trials.includes(t.id) ? '✔' : '○'} {t.name}</li>
              ))}
              <li>{p.items.includes('founder-egg') ? '✔' : '○'} The Founder’s Egg</li>
              <li>{p.flags.includes('sd-boss') ? '✔' : '○'} The Null Titan</li>
            </ul>
          </Card>
          <Card title="Quests" accent="#3dff8b" delay={0.15}>
            <div className="text-[0.75rem] text-white/80">{doneQuests.length}/{QUESTS.length} complete</div>
            <div className="mt-1 text-[0.68rem] text-white/55">{doneQuests.map((q) => q.title).join(' · ') || 'None yet'}</div>
          </Card>
        </div>
        <div className="flex flex-col justify-end gap-3 md:min-h-[85vh]">
          <div className="flex flex-wrap justify-center gap-2">
            <button className="holo-btn primary" style={{ '--accent': '#00f0ff' } as CSSProperties} onClick={back} data-testid="profile-back">
              ◂ Back to the OASIS
            </button>
            <button className="holo-btn" style={{ '--accent': '#ff2bd6' } as CSSProperties} onClick={() => useGame.getState().openCreator('world')}>
              ✎ Edit avatar
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Card title={`Achievements · ${p.achievements.length}/${ACHIEVEMENTS.length}`} accent="#ffe14d">
            <div className="grid grid-cols-8 gap-1">
              {ACHIEVEMENTS.map((a) => {
                const on = p.achievements.includes(a.id)
                return (
                  <div key={a.id} title={`${a.title}: ${a.desc}`} className="flex aspect-square items-center justify-center border text-sm" style={{ borderColor: on ? '#ffe14d88' : '#ffffff14', color: on ? '#ffe14d' : '#3a3450' }}>
                    {on ? a.glyph : '·'}
                  </div>
                )
              })}
            </div>
          </Card>
          <Card title="Worlds" accent="#00f0ff" delay={0.05}>
            <ul className="grid grid-cols-2 gap-x-2 text-[0.72rem]">
              {WORLD_ORDER.map((w) => (
                <li key={w} className={p.visited.includes(w) ? 'text-white/85' : 'text-white/30'}>
                  {p.visited.includes(w) ? '◉' : '○'} {WORLDS[w].layout.name}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Records & high scores" accent="#ff2bd6" delay={0.1}>
            <ul className="space-y-0.5 font-mono text-[0.7rem] text-white/80">
              <li>Grand Prix {p.gpBest ? `${p.gpBest.toFixed(2)}s` : '—'} · Circuit {p.bestRace ? `${p.bestRace.toFixed(2)}s` : '—'}</li>
              {Object.values(CABINETS).map((c) => (
                <li key={c.id}>
                  {c.title} {p.highScores[c.id] ?? 0}
                  {p.claimedCabinets.includes(c.id) ? ' ★' : ''}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Easter eggs" accent="#3dff8b" delay={0.15}>
            <div className="flex gap-1">
              {GLYPHS.map((g) => (
                <GlyphIcon key={g.index} index={g.index} size={24} dim={!p.glyphs.includes(g.index)} />
              ))}
            </div>
            <div className="mt-1 text-[0.7rem] text-white/70">
              Secrets {p.secrets.length}/{SECRETS.length} · {Object.entries(RELIC_SETS).map(([k, r]) => `${r.name}s ${p.relics.filter((x) => x.startsWith(k + '-')).length}/${r.total}`).join(' · ')}
            </div>
          </Card>
          <Card title={`Inventory · ${p.items.length} items · ◎ ${p.wallet}`} accent="#9d4dff" delay={0.2}>
            <div className="flex flex-wrap gap-1">
              {p.items.map((i) => (
                <span key={i} title={ITEMS[i]?.name} className="text-base" style={{ color: ITEMS[i]?.color }}>
                  {ITEMS[i]?.glyph}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}

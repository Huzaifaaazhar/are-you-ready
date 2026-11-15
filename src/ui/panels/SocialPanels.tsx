import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { ITEMS, MARKET, itemCategory } from '../../data/content'
import { npcById, type DAction, type DNode, type DOption } from '../../data/npcs'
import { QUESTS, objectiveProgress, questById } from '../../data/quests'
import { useGame, type Progress } from '../../store/useGame'
import { DEFAULT_AVATAR } from '../../data/avatar'
import { sfx } from '../../game/systems/audio'
import { presence } from '../../game/social/presence'
import { AvatarBadge } from '../AvatarBadge'
import { Panel } from '../Panel'

const css = (accent: string) => ({ '--accent': accent }) as CSSProperties

/** NPC nodes plus automatically generated quest offer / status / turn-in nodes. */
function buildNodes(npc: string, p: Progress): Record<string, DNode> {
  const def = npcById(npc)
  const nodes = { ...def.nodes(p) }
  const questOpts: DOption[] = []
  for (const q of QUESTS.filter((x) => x.giver === npc)) {
    const st = p.quests[q.id]
    if (!st && (!q.available || q.available(p))) {
      questOpts.push({ label: `❗ Quest: ${q.title}`, next: `offer:${q.id}` })
      nodes[`offer:${q.id}`] = {
        text: `${q.summary}\n\nObjectives: ${q.objectives.map((o) => o.text).join(' · ')}\nReward: ${q.reward.coins} coins, ${q.reward.xp} XP${q.reward.items ? ', ' + q.reward.items.map((i) => ITEMS[i]?.name).join(', ') : ''}`,
        options: [{ label: 'I’ll do it.', next: 'start', action: { type: 'accept', quest: q.id } }, { label: 'Not right now.', next: 'start' }],
      }
    } else if (st === 'active') {
      questOpts.push({ label: `… About “${q.title}”`, next: `status:${q.id}` })
      const prog = objectiveProgress(q, p)
      nodes[`status:${q.id}`] = {
        text: q.objectives.map((o, i) => `${prog[i] >= o.target ? '✔' : '○'} ${o.text} (${prog[i]}/${o.target})`).join('\n'),
        options: [{ label: 'On it.', next: 'start' }],
      }
    } else if (st === 'ready') {
      questOpts.push({ label: `✔ Turn in: ${q.title}`, next: 'start', action: { type: 'turnin', quest: q.id } })
    }
  }
  nodes.start = { ...nodes.start, options: [...questOpts, ...nodes.start.options] }
  return nodes
}

export function DialoguePanel({ npc, close }: { npc: string; close: () => void }) {
  const p = useGame((s) => s.progress)
  const def = npcById(npc)
  const [node, setNode] = useState('start')
  const [typed, setTyped] = useState(0)
  const nodes = useMemo(() => buildNodes(npc, p), [npc, p])
  const cur = nodes[node] ?? nodes.start
  const options = cur.options.filter((o) => !o.if || o.if(p))
  useEffect(() => {
    useGame.getState().metNpc(npc)
  }, [npc])
  useEffect(() => {
    setTyped(0)
    const id = window.setInterval(() => setTyped((t) => t + 3), 16)
    return () => window.clearInterval(id)
  }, [node, cur.text])
  const choose = (o: DOption) => {
    sfx('blip')
    const g = useGame.getState()
    const a: DAction | undefined = o.action
    if (a) {
      if (a.type === 'accept') g.acceptQuest(a.quest)
      else if (a.type === 'turnin') g.turnInQuest(a.quest)
      else if (a.type === 'trade') g.trade(a)
      else if (a.type === 'flag') g.setFlag(a.flag)
      else if (a.type === 'journal') g.addJournal(a.id)
      else if (a.type === 'market') return g.openOverlay({ type: 'market' })
      else if (a.type === 'close') return close()
    }
    if (o.next) setNode(o.next)
  }
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= options.length) choose(options[n - 1])
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })
  const avatar = { ...DEFAULT_AVATAR, ...def.look, aura: 'none' as const }
  return (
    <Panel title={def.name.toUpperCase()} kicker={`NPC · ${def.title}`} accent={def.color} onClose={close}>
      <div className="flex gap-4" data-testid="dialogue" data-npc={npc}>
        <div className="hidden shrink-0 sm:block">
          <AvatarBadge avatar={avatar} size={84} />
        </div>
        <div className="flex-1">
          <p className="min-h-[4.5rem] whitespace-pre-line text-[0.92rem] leading-relaxed text-white/90">{cur.text.slice(0, typed)}</p>
          <div className="mt-4 flex flex-col gap-2">
            {options.map((o, i) => (
              <button key={o.label} className="holo-btn !normal-case !tracking-normal text-left" style={css(def.color)} onClick={() => choose(o)} data-testid={`dlg-${i}`}>
                <span className="mr-2 text-white/40">{i + 1}</span>
                {o.label}
              </button>
            ))}
          </div>
          <p className="mt-3 font-mono text-[0.6rem] text-white/35">
            {presence.online() ? 'Online' : 'Offline single-player · residents are non-player characters'}
          </p>
        </div>
      </div>
    </Panel>
  )
}

const CAT_LABEL: Record<string, string> = { outfit: 'Outfits', accessory: 'Accessories', vehicle: 'Vehicle paint', collectible: 'Collectibles' }

export function MarketPanel({ close }: { close: () => void }) {
  const p = useGame((s) => s.progress)
  const buy = useGame((s) => s.buyMarket)
  const equip = useGame((s) => s.equipItem)
  const me = useGame((s) => s.avatar) as unknown as Record<string, string> | null
  const isOn = (id: string) => {
    const e = ITEMS[id]?.equip
    if (!e || !me) return false
    return e.slot === 'paint' ? p.paint === e.value : me[e.slot] === e.value
  }
  const groups = MARKET.reduce<Record<string, typeof MARKET>>((acc, m) => {
    const c = itemCategory(ITEMS[m.item])
    ;(acc[c] ??= []).push(m)
    return acc
  }, {})
  return (
    <Panel title="OASIS EXCHANGE" kicker={`wallet ◎ ${p.wallet} · earned coins only, no real money`} accent="#ffe14d" onClose={close} wide>
      <div className="space-y-4" data-testid="market">
        {Object.entries(groups).map(([cat, list]) => (
          <div key={cat}>
            <div className="mb-2 font-display text-[0.65rem] uppercase tracking-[0.25em] text-gold">{CAT_LABEL[cat] ?? cat}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {list.map((m) => {
                const it = ITEMS[m.item]
                const owned = p.items.includes(m.item)
                return (
                  <div key={m.item} className="flex items-center gap-3 border border-white/10 bg-black/30 p-3">
                    <div className="text-2xl" style={{ color: it.color, textShadow: `0 0 10px ${it.color}` }}>{it.glyph}</div>
                    <div className="flex-1">
                      <div className="font-display text-[0.8rem] font-bold tracking-wider text-white">{it.name}</div>
                      <div className="text-[0.68rem] text-white/55">{it.desc}</div>
                    </div>
                    {owned ? (
                      it.equip ? (
                        <button className="holo-btn" style={css(it.color)} aria-pressed={isOn(m.item)} onClick={() => equip(m.item)} data-testid={`equip-${m.item}`}>{isOn(m.item) ? 'Unequip' : 'Equip'}</button>
                      ) : (
                        <span className="font-mono text-[0.7rem] text-lime">owned</span>
                      )
                    ) : (
                      <button className="holo-btn primary" style={css('#ffe14d')} disabled={p.wallet < m.price} onClick={() => buy(m.item)} data-testid={`buy-${m.item}`}>
                        ◎ {m.price}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

export function QuestLogPanel({ close }: { close: () => void }) {
  const p = useGame((s) => s.progress)
  const entries = QUESTS.filter((q) => p.quests[q.id])
  const offered = QUESTS.filter((q) => !p.quests[q.id] && q.giver && (!q.available || q.available(p)))
  return (
    <Panel title="QUEST LOG" kicker={`${entries.filter((q) => p.quests[q.id] === 'done').length} complete · ${entries.filter((q) => p.quests[q.id] !== 'done').length} in progress`} accent="#3dff8b" onClose={close} wide>
      <div className="space-y-3" data-testid="quests">
        {entries.length === 0 && <p className="text-white/60">No quests yet. Residents marked with ❗ have work for you.</p>}
        {[...entries].sort((a, b) => (a.kind === 'main' ? -1 : 0) - (b.kind === 'main' ? -1 : 0)).map((q) => {
          const st = p.quests[q.id]
          const prog = objectiveProgress(q, p)
          const giver = q.giver ? npcById(q.giver) : null
          return (
            <div key={q.id} className={`border p-3 ${st === 'done' ? 'border-white/10 bg-black/20 opacity-70' : q.kind === 'main' ? 'border-magenta/50 bg-magenta/5' : 'border-lime/30 bg-lime/5'}`} data-quest={q.id} data-state={st}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-display text-[0.85rem] font-bold tracking-wider text-white">
                  {q.kind === 'main' ? '◆ ' : ''}
                  {q.title}
                </div>
                <span className="font-mono text-[0.65rem] uppercase text-white/60">{st === 'ready' ? `return to ${giver?.name ?? '—'}` : st}</span>
              </div>
              <p className="mt-1 text-[0.75rem] text-white/60">{q.summary}</p>
              <ul className="mt-2 space-y-0.5 text-[0.78rem]">
                {q.objectives.map((o, i) => (
                  <li key={o.text} className={prog[i] >= o.target ? 'text-lime' : 'text-white/80'}>
                    {prog[i] >= o.target ? '✔' : '○'} {o.text} {o.target > 1 && `(${prog[i]}/${o.target})`}
                  </li>
                ))}
              </ul>
              <div className="mt-1 font-mono text-[0.65rem] text-gold">
                Reward: {q.reward.coins} coins · {q.reward.xp} XP{q.reward.items ? ' · ' + q.reward.items.map((i) => ITEMS[i]?.name).join(', ') : ''}
              </div>
            </div>
          )
        })}
        {offered.length > 0 && (
          <div className="text-[0.75rem] text-white/50">
            Available from residents: {offered.map((q) => `${q.title} (${npcById(q.giver!).name})`).join(' · ')}
          </div>
        )}
      </div>
    </Panel>
  )
}

export { questById }

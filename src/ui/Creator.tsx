import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  ARMOUR_OPTIONS, BACKGEAR_OPTIONS, BODY_OPTIONS, EYE_COLORS, FACE_OPTIONS, GLOW_COLORS, HAIR_COLORS, HAIR_OPTIONS, HEADGEAR_OPTIONS,
  HEAD_OPTIONS, OUTFIT_OPTIONS, PRESETS, SKIN_TONES, SUIT_COLORS, randomAvatar, randomName, sanitizeAvatar, type AvatarConfig, type Option,
} from '../data/avatar'
import { ITEMS } from '../data/content'
import { useGame } from '../store/useGame'
import { useCreator } from '../store/useCreator'
import { creatorView } from '../game/scenes/CreatorScene'
import { playMusic, sfx } from '../game/systems/audio'
import { AvatarBadge } from './AvatarBadge'

const TABS = ['Presets', 'Body', 'Head', 'Hair', 'Outfit', 'Armour', 'Gear', 'Colours'] as const
type Tab = (typeof TABS)[number]

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 font-display text-[0.65rem] uppercase tracking-[0.25em] text-cyan/70">{label}</div>
      {children}
    </div>
  )
}

function Choices<T extends string>({ options, value, onPick, owned }: { options: Option<T>[]; value: T; onPick: (v: T) => void; owned: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const locked = !!o.requires && !owned.includes(o.requires)
        return (
          <button
            key={o.id}
            className="chip"
            aria-pressed={value === o.id}
            disabled={locked}
            title={locked ? `Locked — redeem the ${ITEMS[o.requires!]?.name} at the Prize Zone in the Arcade District` : o.label}
            onClick={() => {
              sfx('blip')
              onPick(o.id)
            }}
          >
            {locked ? '🔒 ' : ''}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Swatches({ colors, value, onPick, label }: { colors: string[]; value: string; onPick: (c: string) => void; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {colors.map((c) => (
        <button
          key={c}
          aria-label={`${label} ${c}`}
          aria-pressed={value.toLowerCase() === c.toLowerCase()}
          className="h-8 w-8 border-2 transition-transform hover:scale-110"
          style={{ background: c, borderColor: value.toLowerCase() === c.toLowerCase() ? '#fff' : 'rgba(255,255,255,0.15)', boxShadow: value.toLowerCase() === c.toLowerCase() ? `0 0 12px ${c}` : undefined }}
          onClick={() => {
            sfx('blip')
            onPick(c)
          }}
        />
      ))}
      <label className="relative h-8 w-8 cursor-pointer border-2 border-dashed border-white/30" title="Custom colour">
        <input type="color" value={value} onChange={(e) => onPick(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={`Custom ${label}`} />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-white/70">+</span>
      </label>
    </div>
  )
}

/** Avatar creator: tabbed holo-panel beside a rotating 3D preview (rendered by CreatorScene). */
export function Creator() {
  const draft = useCreator((s) => s.draft)
  const patch = useCreator((s) => s.patch)
  const setDraft = useCreator((s) => s.setDraft)
  const owned = useGame((s) => s.progress.items)
  const from = useGame((s) => s.creatorReturn)
  const hasAvatar = useGame((s) => !!s.avatar)
  const [tab, setTab] = useState<Tab>('Presets')
  const drag = useRef<{ x: number; id: number } | null>(null)

  useEffect(() => {
    playMusic('title')
  }, [])

  const confirm = () => {
    const g = useGame.getState()
    const clean = sanitizeAvatar({ ...draft, name: draft.name.trim() || 'Player One' }, owned)
    g.saveAvatar(clean)
    sfx('unlock')
    if (from === 'world') g.setPhase('world')
    else g.enterWorld()
  }
  const cancel = () => {
    sfx('blip')
    useGame.getState().setPhase(from === 'world' ? 'world' : 'title')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.code === 'Escape' && (hasAvatar || from === 'world')) cancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const set = <K extends keyof AvatarConfig>(k: K) => (v: AvatarConfig[K]) => patch({ [k]: v } as Partial<AvatarConfig>)

  return (
    <motion.div className="fixed inset-0 z-30 flex flex-col md:flex-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* drag-to-rotate preview area */}
      <div
        className="relative min-h-[38dvh] flex-1 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, id: e.pointerId }
          creatorView.dragging = true
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!drag.current || drag.current.id !== e.pointerId) return
          const dx = e.clientX - drag.current.x
          drag.current.x = e.clientX
          creatorView.rotY += dx * 0.012
          creatorView.velocity = dx * 0.0008
        }}
        onPointerUp={() => {
          drag.current = null
          creatorView.dragging = false
        }}
        onWheel={(e) => {
          creatorView.zoom = Math.min(1.6, Math.max(0.8, creatorView.zoom - e.deltaY * 0.001))
        }}
      >
        <div className="pointer-events-none absolute left-4 top-4 sm:left-6 sm:top-6">
          <div className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-magenta">Identity Forge</div>
          <h1 className="neon-text font-display text-xl font-black tracking-[0.12em] sm:text-3xl" style={{ '--glow': '#00f0ff' } as CSSProperties}>
            CREATE YOUR AVATAR
          </h1>
        </div>
        <div className="pointer-events-none absolute bottom-3 left-0 right-0 text-center font-mono text-[0.65rem] tracking-[0.25em] text-white/40">DRAG TO ROTATE · SCROLL TO ZOOM</div>
      </div>

      {/* editor panel */}
      <div className="holo m-2 flex max-h-[60dvh] flex-col md:m-4 md:max-h-none md:w-[440px]" style={{ '--accent': '#00f0ff' } as CSSProperties}>
        <div className="flex items-center gap-3 border-b border-cyan/20 p-4">
          <AvatarBadge avatar={draft} size={46} />
          <div className="flex-1">
            <label htmlFor="avatar-name" className="font-display text-[0.6rem] uppercase tracking-[0.25em] text-cyan/70">
              Avatar name
            </label>
            <div className="flex gap-2">
              <input
                id="avatar-name"
                data-testid="avatar-name"
                value={draft.name}
                maxLength={18}
                onChange={(e) => patch({ name: e.target.value })}
                className="w-full border border-cyan/40 bg-black/40 px-2 py-1.5 font-display text-sm tracking-wider text-white outline-none focus:border-cyan focus:shadow-[0_0_12px_#00f0ff66]"
              />
              <button className="chip" title="Random name" aria-label="Random name" onClick={() => patch({ name: randomName() })}>
                ⟳
              </button>
            </div>
          </div>
        </div>
        <div className="scroll-thin flex gap-1 overflow-x-auto border-b border-cyan/20 px-3 py-2" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => {
                sfx('blip')
                setTab(t)
              }}
              className={`shrink-0 px-2.5 py-1.5 font-display text-[0.62rem] uppercase tracking-[0.18em] transition ${tab === t ? 'bg-cyan/20 text-white shadow-[inset_0_-2px_0_#00f0ff]' : 'text-cyan/60 hover:text-white'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4">
          {tab === 'Presets' && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  className="chip flex items-center gap-3 !p-2 text-left"
                  style={{ '--accent': p.accent } as CSSProperties}
                  aria-pressed={draft.name === p.name}
                  onClick={() => {
                    sfx('select')
                    setDraft({ ...p })
                  }}
                >
                  <AvatarBadge avatar={p} size={40} />
                  <span>
                    <span className="block font-display text-xs tracking-wider text-white">{p.name}</span>
                    <span className="text-[0.7rem] text-white/50">
                      {OUTFIT_OPTIONS.find((o) => o.id === p.outfit)?.label} · {ARMOUR_OPTIONS.find((o) => o.id === p.armour)?.label}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {tab === 'Body' && (
            <>
              <Section label="Build">
                <Choices options={BODY_OPTIONS} value={draft.body} onPick={set('body')} owned={owned} />
              </Section>
              <Section label={`Height · ${Math.round(draft.height * 178)} cm`}>
                <input type="range" min={0.9} max={1.1} step={0.01} value={draft.height} onChange={(e) => patch({ height: Number(e.target.value) })} className="w-full" aria-label="Height" />
              </Section>
              <Section label="Skin tone">
                <Swatches colors={SKIN_TONES} value={draft.skin} onPick={set('skin')} label="skin" />
              </Section>
            </>
          )}
          {tab === 'Head' && (
            <>
              <Section label="Head shape">
                <Choices options={HEAD_OPTIONS} value={draft.head} onPick={set('head')} owned={owned} />
              </Section>
              <Section label="Face">
                <Choices options={FACE_OPTIONS} value={draft.face} onPick={set('face')} owned={owned} />
              </Section>
              <Section label="Eye glow">
                <Swatches colors={EYE_COLORS} value={draft.eyes} onPick={set('eyes')} label="eyes" />
              </Section>
            </>
          )}
          {tab === 'Hair' && (
            <>
              <Section label="Style">
                <Choices options={HAIR_OPTIONS} value={draft.hair} onPick={set('hair')} owned={owned} />
              </Section>
              <Section label="Colour">
                <Swatches colors={HAIR_COLORS} value={draft.hairColor} onPick={set('hairColor')} label="hair" />
              </Section>
            </>
          )}
          {tab === 'Outfit' && (
            <>
              <Section label="Clothing">
                <Choices options={OUTFIT_OPTIONS} value={draft.outfit} onPick={set('outfit')} owned={owned} />
              </Section>
              <Section label="Primary">
                <Swatches colors={SUIT_COLORS} value={draft.primary} onPick={set('primary')} label="primary" />
              </Section>
              <Section label="Secondary">
                <Swatches colors={SUIT_COLORS} value={draft.secondary} onPick={set('secondary')} label="secondary" />
              </Section>
            </>
          )}
          {tab === 'Armour' && (
            <Section label="Armour">
              <Choices options={ARMOUR_OPTIONS} value={draft.armour} onPick={set('armour')} owned={owned} />
            </Section>
          )}
          {tab === 'Gear' && (
            <>
              <Section label="Head accessory">
                <Choices options={HEADGEAR_OPTIONS} value={draft.headGear} onPick={set('headGear')} owned={owned} />
              </Section>
              <Section label="Back accessory">
                <Choices options={BACKGEAR_OPTIONS} value={draft.backGear} onPick={set('backGear')} owned={owned} />
              </Section>
              <p className="text-[0.7rem] text-white/45">🔒 Locked gear is redeemed with OASIS coins at the Prize Zone in the Arcade District.</p>
            </>
          )}
          {tab === 'Colours' && (
            <>
              <Section label="Neon accent">
                <Swatches colors={GLOW_COLORS} value={draft.accent} onPick={set('accent')} label="accent" />
              </Section>
              <Section label="Primary">
                <Swatches colors={SUIT_COLORS} value={draft.primary} onPick={set('primary')} label="primary" />
              </Section>
              <Section label="Secondary">
                <Swatches colors={SUIT_COLORS} value={draft.secondary} onPick={set('secondary')} label="secondary" />
              </Section>
              <Section label="Eyes">
                <Swatches colors={EYE_COLORS} value={draft.eyes} onPick={set('eyes')} label="eyes" />
              </Section>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-cyan/20 p-3">
          <button
            className="holo-btn"
            style={{ '--accent': '#9d4dff' } as CSSProperties}
            onClick={() => {
              sfx('select')
              setDraft(randomAvatar(owned))
            }}
          >
            ⟳ Random
          </button>
          {(hasAvatar || from === 'world') && (
            <button className="holo-btn" style={{ '--accent': '#ff2bd6' } as CSSProperties} onClick={cancel}>
              Cancel
            </button>
          )}
          <button data-testid="confirm-avatar" className="holo-btn primary ml-auto" style={{ '--accent': '#3dff8b' } as CSSProperties} onClick={confirm}>
            {from === 'world' ? 'Save avatar' : 'Enter the OASIS ▶'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

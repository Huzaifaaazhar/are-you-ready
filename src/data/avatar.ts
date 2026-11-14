/** Avatar configuration model, option catalogues and original presets. */

export type BodyType = 'slim' | 'standard' | 'bulky'
export type HeadShape = 'round' | 'angular' | 'oval' | 'bot'
export type FaceStyle = 'bright' | 'visor' | 'narrow' | 'pixel'
export type HairStyle = 'none' | 'crop' | 'spikes' | 'mohawk' | 'long' | 'bun' | 'swoop'
export type Outfit = 'jumpsuit' | 'jacket' | 'hoodie' | 'racer'
export type Armour = 'none' | 'pauldrons' | 'chestplate' | 'full'
export type HeadGear = 'none' | 'headphones' | 'goggles' | 'antenna' | 'halo' | 'neon-visor'
export type BackGear = 'none' | 'jetpack' | 'blade' | 'wings' | 'pixel-cape'

export interface AvatarConfig {
  name: string
  body: BodyType
  height: number
  skin: string
  head: HeadShape
  face: FaceStyle
  eyes: string
  hair: HairStyle
  hairColor: string
  outfit: Outfit
  primary: string
  secondary: string
  accent: string
  armour: Armour
  headGear: HeadGear
  backGear: BackGear
}

export interface Option<T extends string> {
  id: T
  label: string
  /** Inventory item that must be owned for this option to be selectable. */
  requires?: string
}

export const BODY_OPTIONS: Option<BodyType>[] = [
  { id: 'slim', label: 'Slim' },
  { id: 'standard', label: 'Standard' },
  { id: 'bulky', label: 'Heavy' },
]
export const HEAD_OPTIONS: Option<HeadShape>[] = [
  { id: 'round', label: 'Round' },
  { id: 'angular', label: 'Angular' },
  { id: 'oval', label: 'Oval' },
  { id: 'bot', label: 'Synth Unit' },
]
export const FACE_OPTIONS: Option<FaceStyle>[] = [
  { id: 'bright', label: 'Bright Eyes' },
  { id: 'narrow', label: 'Focused' },
  { id: 'pixel', label: '8-Bit' },
  { id: 'visor', label: 'Light Band' },
]
export const HAIR_OPTIONS: Option<HairStyle>[] = [
  { id: 'none', label: 'None' },
  { id: 'crop', label: 'Crop' },
  { id: 'spikes', label: 'Spikes' },
  { id: 'mohawk', label: 'Ridge' },
  { id: 'long', label: 'Long' },
  { id: 'bun', label: 'Bun' },
  { id: 'swoop', label: 'Swoop' },
]
export const OUTFIT_OPTIONS: Option<Outfit>[] = [
  { id: 'jumpsuit', label: 'Flight Suit' },
  { id: 'jacket', label: 'Street Jacket' },
  { id: 'hoodie', label: 'Hacker Hoodie' },
  { id: 'racer', label: 'Racer Leathers' },
]
export const ARMOUR_OPTIONS: Option<Armour>[] = [
  { id: 'none', label: 'None' },
  { id: 'pauldrons', label: 'Pauldrons' },
  { id: 'chestplate', label: 'Core Plate' },
  { id: 'full', label: 'Full Rig' },
]
export const HEADGEAR_OPTIONS: Option<HeadGear>[] = [
  { id: 'none', label: 'None' },
  { id: 'headphones', label: 'Headphones' },
  { id: 'goggles', label: 'Goggles' },
  { id: 'antenna', label: 'Antenna' },
  { id: 'halo', label: 'Halo Ring' },
  { id: 'neon-visor', label: 'Neon Visor', requires: 'neon-visor' },
]
export const BACKGEAR_OPTIONS: Option<BackGear>[] = [
  { id: 'none', label: 'None' },
  { id: 'jetpack', label: 'Jetpack' },
  { id: 'blade', label: 'Light Blade' },
  { id: 'wings', label: 'Holo Wings' },
  { id: 'pixel-cape', label: 'Pixel Cape', requires: 'pixel-cape' },
]

export const SKIN_TONES = ['#f6d7c3', '#e8b896', '#c98e68', '#a0673f', '#6e4428', '#3f2717', '#9fd7ff', '#c7a6ff']
export const HAIR_COLORS = ['#101018', '#4a2b1a', '#b06a2b', '#f2d16b', '#f4f4f4', '#ff2bd6', '#00e5ff', '#7cff6b', '#ff6a2b']
export const SUIT_COLORS = ['#141428', '#24124a', '#0b2a4a', '#3a0d3f', '#e8e8f0', '#1a1a1a', '#7a1030', '#0f4038', '#4a3a10']
export const GLOW_COLORS = ['#00f0ff', '#ff2bd6', '#9d4dff', '#ffe14d', '#3dff8b', '#ff4d4d', '#4d7cff', '#ffffff']
export const EYE_COLORS = ['#00f0ff', '#ff2bd6', '#ffe14d', '#3dff8b', '#ffffff', '#ff7a1a', '#7a5cff']

export const PRESETS: AvatarConfig[] = [
  {
    name: 'Voltline', body: 'standard', height: 1, skin: '#e8b896', head: 'round', face: 'bright', eyes: '#00f0ff',
    hair: 'spikes', hairColor: '#101018', outfit: 'jacket', primary: '#141428', secondary: '#0b2a4a', accent: '#00f0ff',
    armour: 'none', headGear: 'goggles', backGear: 'none',
  },
  {
    name: 'Nyx Rune', body: 'slim', height: 0.97, skin: '#f6d7c3', head: 'oval', face: 'narrow', eyes: '#ff2bd6',
    hair: 'long', hairColor: '#ff2bd6', outfit: 'racer', primary: '#1a1a1a', secondary: '#3a0d3f', accent: '#ff2bd6',
    armour: 'pauldrons', headGear: 'none', backGear: 'blade',
  },
  {
    name: 'Kilobyte', body: 'bulky', height: 1.06, skin: '#6e4428', head: 'angular', face: 'visor', eyes: '#ffe14d',
    hair: 'mohawk', hairColor: '#ffe14d', outfit: 'jumpsuit', primary: '#4a3a10', secondary: '#141428', accent: '#ffe14d',
    armour: 'full', headGear: 'headphones', backGear: 'jetpack',
  },
  {
    name: 'Solar Drift', body: 'standard', height: 1.02, skin: '#a0673f', head: 'round', face: 'bright', eyes: '#3dff8b',
    hair: 'bun', hairColor: '#f4f4f4', outfit: 'hoodie', primary: '#0f4038', secondary: '#e8e8f0', accent: '#3dff8b',
    armour: 'chestplate', headGear: 'halo', backGear: 'wings',
  },
  {
    name: 'Unit 0xC0DE', body: 'slim', height: 1.04, skin: '#9fd7ff', head: 'bot', face: 'pixel', eyes: '#ff4d4d',
    hair: 'none', hairColor: '#101018', outfit: 'jumpsuit', primary: '#e8e8f0', secondary: '#24124a', accent: '#9d4dff',
    armour: 'pauldrons', headGear: 'antenna', backGear: 'none',
  },
]

export const DEFAULT_AVATAR: AvatarConfig = PRESETS[0]

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

const NAME_A = ['Neon', 'Byte', 'Glitch', 'Pixel', 'Nova', 'Vector', 'Echo', 'Static', 'Chrome', 'Lumen', 'Hex', 'Rift']
const NAME_B = ['Runner', 'Fox', 'Wraith', 'Pilot', 'Spark', 'Drifter', 'Knight', 'Ghost', 'Ronin', 'Signal', 'Vandal', 'Jet']

export function randomName() {
  return `${pick(NAME_A)} ${pick(NAME_B)}`
}

export function randomAvatar(owned: string[] = []): AvatarConfig {
  const allowed = <T extends string>(opts: Option<T>[]) => opts.filter((o) => !o.requires || owned.includes(o.requires))
  return {
    name: randomName(),
    body: pick(BODY_OPTIONS).id,
    height: Math.round((0.94 + Math.random() * 0.12) * 100) / 100,
    skin: pick(SKIN_TONES),
    head: pick(HEAD_OPTIONS).id,
    face: pick(FACE_OPTIONS).id,
    eyes: pick(EYE_COLORS),
    hair: pick(HAIR_OPTIONS).id,
    hairColor: pick(HAIR_COLORS),
    outfit: pick(OUTFIT_OPTIONS).id,
    primary: pick(SUIT_COLORS),
    secondary: pick(SUIT_COLORS),
    accent: pick(GLOW_COLORS),
    armour: pick(ARMOUR_OPTIONS).id,
    headGear: pick(allowed(HEADGEAR_OPTIONS)).id,
    backGear: pick(allowed(BACKGEAR_OPTIONS)).id,
  }
}

/** Ensure a loaded avatar only uses options the player actually owns (and fill missing fields). */
export function sanitizeAvatar(a: Partial<AvatarConfig> | null | undefined, owned: string[]): AvatarConfig {
  const merged: AvatarConfig = { ...DEFAULT_AVATAR, ...(a ?? {}) }
  const ok = <T extends string>(opts: Option<T>[], v: T, fallback: T) => {
    const o = opts.find((x) => x.id === v)
    if (!o) return fallback
    if (o.requires && !owned.includes(o.requires)) return fallback
    return v
  }
  merged.body = ok(BODY_OPTIONS, merged.body, 'standard')
  merged.head = ok(HEAD_OPTIONS, merged.head, 'round')
  merged.face = ok(FACE_OPTIONS, merged.face, 'bright')
  merged.hair = ok(HAIR_OPTIONS, merged.hair, 'crop')
  merged.outfit = ok(OUTFIT_OPTIONS, merged.outfit, 'jumpsuit')
  merged.armour = ok(ARMOUR_OPTIONS, merged.armour, 'none')
  merged.headGear = ok(HEADGEAR_OPTIONS, merged.headGear, 'none')
  merged.backGear = ok(BACKGEAR_OPTIONS, merged.backGear, 'none')
  merged.height = Math.min(1.1, Math.max(0.9, Number(merged.height) || 1))
  merged.name = (merged.name || 'Player One').slice(0, 18)
  return merged
}

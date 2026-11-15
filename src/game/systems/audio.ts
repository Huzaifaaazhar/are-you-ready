/**
 * Tiny procedural audio engine (Web Audio). Every sound is synthesised at runtime,
 * so the game ships no recorded music or samples.
 */

type Sfx =
  | 'blip' | 'select' | 'coin' | 'portal' | 'achievement' | 'error' | 'boot' | 'jump'
  | 'secret' | 'checkpoint' | 'countdown' | 'go' | 'unlock' | 'eat' | 'shoot' | 'explode' | 'hurt'

export type MusicPreset = 'title' | 'hub' | 'arcade' | 'arcade-synthwave' | 'arcade-chip' | 'race' | 'past' | 'present' | 'future' | 'off'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let musicBus: GainNode | null = null
let musicNodes: { stop: () => void } | null = null
let currentMusic: MusicPreset = 'off'
let muted = false
let volume = 0.7

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : volume
    master.connect(ctx.destination)
    musicBus = ctx.createGain()
    musicBus.gain.value = 0.32
    musicBus.connect(master)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Call from a user gesture to unlock audio on browsers with autoplay policies. */
export function unlockAudio() {
  ensure()
}

export function setAudioSettings(isMuted: boolean, vol: number) {
  muted = isMuted
  volume = vol
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.05)
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', gain = 0.15, slideTo?: number, delay = 0) {
  const c = ensure()
  if (!c || !master) return
  const t = c.currentTime + delay
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noise(dur: number, gain = 0.2, filterFreq = 1200, delay = 0) {
  const c = ensure()
  if (!c || !master) return
  const t = c.currentTime + delay
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = filterFreq
  const g = c.createGain()
  g.gain.value = gain
  src.connect(f).connect(g).connect(master)
  src.start(t)
}

export function sfx(name: Sfx) {
  if (muted) return
  switch (name) {
    case 'blip': tone(880, 0.06, 'square', 0.05); break
    case 'select': tone(660, 0.05, 'square', 0.06); tone(990, 0.08, 'square', 0.05, undefined, 0.05); break
    case 'coin': tone(988, 0.07, 'square', 0.08); tone(1319, 0.22, 'square', 0.08, undefined, 0.07); break
    case 'portal': tone(110, 0.9, 'sawtooth', 0.12, 880); noise(0.9, 0.12, 2400); break
    case 'achievement': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, undefined, i * 0.09)); break
    case 'secret': [784, 740, 622, 440, 415, 659, 831, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.06, undefined, i * 0.08)); break
    case 'error': tone(180, 0.18, 'sawtooth', 0.08, 120); break
    case 'boot': tone(220, 0.12, 'square', 0.05); tone(440, 0.12, 'square', 0.05, undefined, 0.12); break
    case 'jump': tone(300, 0.12, 'square', 0.04, 600); break
    case 'checkpoint': tone(784, 0.08, 'square', 0.08); tone(1175, 0.16, 'square', 0.08, undefined, 0.06); break
    case 'countdown': tone(440, 0.15, 'square', 0.08); break
    case 'go': tone(880, 0.35, 'square', 0.1); break
    case 'unlock': tone(330, 0.1, 'triangle', 0.1); tone(495, 0.1, 'triangle', 0.1, undefined, 0.1); tone(660, 0.35, 'triangle', 0.12, undefined, 0.2); break
    case 'eat': tone(600, 0.05, 'square', 0.06, 900); break
    case 'shoot': tone(1400, 0.07, 'square', 0.03, 400); break
    case 'explode': noise(0.25, 0.18, 900); break
    case 'hurt': tone(200, 0.3, 'sawtooth', 0.1, 60); noise(0.3, 0.1, 600); break
  }
}

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

interface MusicDef {
  chords: number[][]
  bpm: number
  wave: OscillatorType
  arp: boolean
  bass: boolean
  cutoff: number
}

const MUSIC: Record<Exclude<MusicPreset, 'off'>, MusicDef> = {
  title: { chords: [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 55]], bpm: 70, wave: 'sawtooth', arp: false, bass: true, cutoff: 900 },
  hub: { chords: [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 60]], bpm: 84, wave: 'sawtooth', arp: true, bass: true, cutoff: 1300 },
  arcade: { chords: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67], [52, 55, 59, 64]], bpm: 118, wave: 'square', arp: true, bass: true, cutoff: 2200 },
  'arcade-synthwave': { chords: [[45, 52, 57, 64], [48, 55, 60, 67], [43, 50, 55, 62], [41, 48, 53, 60]], bpm: 96, wave: 'sawtooth', arp: true, bass: true, cutoff: 1600 },
  race: { chords: [[45, 52, 57, 64], [43, 50, 55, 62], [41, 48, 53, 60], [43, 50, 55, 62]], bpm: 150, wave: 'sawtooth', arp: true, bass: true, cutoff: 2600 },
  past: { chords: [[48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59]], bpm: 66, wave: 'triangle', arp: true, bass: false, cutoff: 1100 },
  present: { chords: [[50, 53, 57, 60], [50, 53, 56, 60], [48, 51, 55, 58], [47, 50, 53, 57]], bpm: 100, wave: 'square', arp: false, bass: true, cutoff: 900 },
  future: { chords: [[52, 59, 64, 71], [57, 64, 69, 72], [55, 62, 67, 71], [60, 67, 72, 76]], bpm: 90, wave: 'sine', arp: true, bass: true, cutoff: 3200 },
  'arcade-chip': { chords: [[60, 64, 67, 72], [65, 69, 72, 77], [67, 71, 74, 79], [64, 67, 71, 76]], bpm: 140, wave: 'square', arp: true, bass: false, cutoff: 3500 },
}

/** Generative ambient music: a looping chord pad with optional arpeggio and bass. */
export function playMusic(preset: MusicPreset) {
  if (preset === currentMusic) return
  currentMusic = preset
  if (musicNodes) {
    musicNodes.stop()
    musicNodes = null
  }
  if (preset === 'off') return
  const c = ensure()
  if (!c || !musicBus) return
  const def = MUSIC[preset]
  const bus = c.createGain()
  bus.gain.setValueAtTime(0.0001, c.currentTime)
  bus.gain.exponentialRampToValueAtTime(1, c.currentTime + 1.5)
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = def.cutoff
  filter.Q.value = 2
  bus.connect(filter).connect(musicBus)

  const beat = 60 / def.bpm
  const barLen = beat * 4
  let bar = 0
  let nextTime = c.currentTime + 0.1
  let stopped = false

  const scheduleBar = (t: number, chord: number[]) => {
    // Pad
    for (const n of chord) {
      for (const detune of [-6, 6]) {
        const o = c.createOscillator()
        const g = c.createGain()
        o.type = def.wave
        o.frequency.value = NOTE(n)
        o.detune.value = detune
        g.gain.setValueAtTime(0.0001, t)
        g.gain.linearRampToValueAtTime(0.018, t + barLen * 0.3)
        g.gain.linearRampToValueAtTime(0.0001, t + barLen * 1.02)
        o.connect(g).connect(bus)
        o.start(t)
        o.stop(t + barLen * 1.05)
      }
    }
    if (def.bass) {
      for (let i = 0; i < 4; i++) {
        const o = c.createOscillator()
        const g = c.createGain()
        o.type = 'triangle'
        o.frequency.value = NOTE(chord[0] - 12)
        const s = t + i * beat
        g.gain.setValueAtTime(0.0001, s)
        g.gain.exponentialRampToValueAtTime(0.09, s + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, s + beat * 0.9)
        o.connect(g).connect(bus)
        o.start(s)
        o.stop(s + beat)
      }
    }
    if (def.arp) {
      const steps = 8
      for (let i = 0; i < steps; i++) {
        const o = c.createOscillator()
        const g = c.createGain()
        o.type = 'square'
        o.frequency.value = NOTE(chord[i % chord.length] + 12)
        const s = t + (i * barLen) / steps
        g.gain.setValueAtTime(0.0001, s)
        g.gain.exponentialRampToValueAtTime(0.022, s + 0.01)
        g.gain.exponentialRampToValueAtTime(0.0001, s + barLen / steps)
        o.connect(g).connect(bus)
        o.start(s)
        o.stop(s + barLen / steps + 0.02)
      }
    }
  }

  const tick = () => {
    if (stopped) return
    while (nextTime < c.currentTime + barLen * 1.5) {
      scheduleBar(nextTime, def.chords[bar % def.chords.length])
      nextTime += barLen
      bar++
    }
  }
  tick()
  const id = window.setInterval(tick, 500)
  musicNodes = {
    stop: () => {
      stopped = true
      window.clearInterval(id)
      bus.gain.cancelScheduledValues(c.currentTime)
      bus.gain.setTargetAtTime(0.0001, c.currentTime, 0.3)
      window.setTimeout(() => bus.disconnect(), 1500)
    },
  }
}

export function getCurrentMusic() {
  return currentMusic
}

/** Continuous engine tone for the race (pitch follows speed). */
export const engineSound = (() => {
  let osc: OscillatorNode | null = null
  let osc2: OscillatorNode | null = null
  let gain: GainNode | null = null
  let filter: BiquadFilterNode | null = null
  return {
    start() {
      const c = ensure()
      if (!c || !master || osc) return
      osc = c.createOscillator()
      osc2 = c.createOscillator()
      gain = c.createGain()
      filter = c.createBiquadFilter()
      osc.type = 'sawtooth'
      osc2.type = 'square'
      filter.type = 'lowpass'
      filter.frequency.value = 600
      gain.gain.value = 0.0001
      osc.connect(filter)
      osc2.connect(filter)
      filter.connect(gain).connect(master)
      osc.start()
      osc2.start()
    },
    update(ratio: number, boosting: boolean) {
      if (!osc || !osc2 || !gain || !filter || !ctx) return
      const r = Math.max(0, Math.min(1.3, ratio))
      const f = 45 + r * 150 + (boosting ? 40 : 0)
      osc.frequency.setTargetAtTime(f, ctx.currentTime, 0.05)
      osc2.frequency.setTargetAtTime(f * 0.5, ctx.currentTime, 0.05)
      filter.frequency.setTargetAtTime(400 + r * 1600 + (boosting ? 800 : 0), ctx.currentTime, 0.05)
      gain.gain.setTargetAtTime(muted ? 0.0001 : 0.025 + r * 0.035, ctx.currentTime, 0.08)
    },
    stop() {
      try {
        osc?.stop()
        osc2?.stop()
      } catch {
        /* already stopped */
      }
      gain?.disconnect()
      osc = osc2 = null
      gain = null
      filter = null
    },
  }
})()

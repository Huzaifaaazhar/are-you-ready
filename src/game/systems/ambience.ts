import { audioGraph } from './audio'

/**
 * Procedural environmental sound beds (all synthesised — no recordings).
 * Starts only after the first user gesture has unlocked the AudioContext.
 */
export type AmbiencePreset = 'hub' | 'arcade' | 'race' | 'trial' | 'city' | 'fantasy' | 'wasteland' | 'showdown' | 'off'

let current: AmbiencePreset = 'off'
let stopFns: (() => void)[] = []

function noiseSource(ctx: AudioContext, seconds = 2) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < d.length; i++) {
    // brown-ish noise for softer beds
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    d[i] = last * 3.5
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true
  return src
}

function bed(ctx: AudioContext, out: AudioNode, opts: { type: BiquadFilterType; freq: number; q?: number; gain: number; lfo?: number }) {
  const src = noiseSource(ctx)
  const f = ctx.createBiquadFilter()
  f.type = opts.type
  f.frequency.value = opts.freq
  f.Q.value = opts.q ?? 0.7
  const g = ctx.createGain()
  g.gain.value = opts.gain
  src.connect(f).connect(g).connect(out)
  let lfo: OscillatorNode | null = null
  if (opts.lfo) {
    lfo = ctx.createOscillator()
    const lg = ctx.createGain()
    lfo.frequency.value = opts.lfo
    lg.gain.value = opts.gain * 0.6
    lfo.connect(lg).connect(g.gain)
    lfo.start()
  }
  src.start()
  return () => {
    try {
      src.stop()
      lfo?.stop()
    } catch {
      /* already stopped */
    }
  }
}

function drone(ctx: AudioContext, out: AudioNode, freq: number, gain: number, type: OscillatorType = 'sine') {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.value = gain
  o.connect(g).connect(out)
  o.start()
  return () => {
    try {
      o.stop()
    } catch {
      /* already stopped */
    }
  }
}

/** Short randomised events (horns, chimes, blips, crackles) on a timer. */
function sprinkle(ctx: AudioContext, _out: AudioNode, everyMs: [number, number], play: (t: number) => void) {
  let alive = true
  let id = 0
  const loop = () => {
    if (!alive) return
    play(ctx.currentTime)
    id = window.setTimeout(loop, everyMs[0] + Math.random() * (everyMs[1] - everyMs[0]))
  }
  id = window.setTimeout(loop, everyMs[0])
  return () => {
    alive = false
    window.clearTimeout(id)
  }
}

function blip(ctx: AudioContext, out: AudioNode, t: number, f: number, dur: number, gain: number, type: OscillatorType = 'square', slide?: number) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(f, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + dur + 0.05)
}

export const ambience = {
  play(preset: AmbiencePreset) {
    if (preset === current) return
    stopFns.forEach((f) => f())
    stopFns = []
    current = preset
    if (preset === 'off') return
    const gph = audioGraph()
    if (!gph) {
      current = 'off'
      return
    }
    const { ctx, bus } = gph
    const s = stopFns
    switch (preset) {
      case 'hub':
        s.push(bed(ctx, bus, { type: 'lowpass', freq: 400, gain: 0.05 }), drone(ctx, bus, 55, 0.012))
        s.push(sprinkle(ctx, bus, [2500, 6000], (t) => blip(ctx, bus, t, 1200 + Math.random() * 800, 0.08, 0.01, 'sine')))
        break
      case 'arcade':
        s.push(bed(ctx, bus, { type: 'bandpass', freq: 900, q: 0.5, gain: 0.05 }))
        s.push(sprinkle(ctx, bus, [300, 1200], (t) => blip(ctx, bus, t, [440, 660, 880, 990, 1320][Math.floor(Math.random() * 5)], 0.06, 0.012)))
        s.push(sprinkle(ctx, bus, [4000, 9000], (t) => [0, 1, 2].forEach((k) => blip(ctx, bus, t + k * 0.07, 523 * (1 + k * 0.25), 0.08, 0.015))))
        break
      case 'race':
        s.push(bed(ctx, bus, { type: 'highpass', freq: 600, gain: 0.04, lfo: 0.2 }))
        break
      case 'city':
        s.push(bed(ctx, bus, { type: 'lowpass', freq: 300, gain: 0.08 }), bed(ctx, bus, { type: 'highpass', freq: 3000, gain: 0.02 }))
        s.push(sprinkle(ctx, bus, [5000, 12000], (t) => blip(ctx, bus, t, 330, 0.5, 0.012, 'sawtooth', 300)))
        s.push(sprinkle(ctx, bus, [7000, 15000], (t) => blip(ctx, bus, t, 1800, 1.2, 0.006, 'sine', 600)))
        break
      case 'fantasy':
        s.push(bed(ctx, bus, { type: 'bandpass', freq: 500, q: 0.4, gain: 0.05, lfo: 0.1 }))
        s.push(sprinkle(ctx, bus, [1500, 4000], (t) => blip(ctx, bus, t, 2200 + Math.random() * 1500, 0.12, 0.008, 'sine', 3000 + Math.random() * 1000)))
        s.push(sprinkle(ctx, bus, [4000, 9000], (t) => [0, 1].forEach((k) => blip(ctx, bus, t + k * 0.18, [1047, 1319, 1568][Math.floor(Math.random() * 3)], 0.9, 0.01, 'triangle'))))
        break
      case 'wasteland':
        s.push(bed(ctx, bus, { type: 'lowpass', freq: 160, gain: 0.12, lfo: 0.07 }), drone(ctx, bus, 41, 0.02, 'sawtooth'))
        s.push(sprinkle(ctx, bus, [800, 2500], (t) => blip(ctx, bus, t, 80 + Math.random() * 4000, 0.03, 0.01, 'square')))
        break
      case 'showdown':
        s.push(bed(ctx, bus, { type: 'lowpass', freq: 220, gain: 0.08, lfo: 0.5 }), drone(ctx, bus, 49, 0.02, 'sawtooth'), drone(ctx, bus, 73.4, 0.01))
        break
      case 'trial':
        s.push(bed(ctx, bus, { type: 'lowpass', freq: 500, gain: 0.03 }))
        break
    }
  },
  current: () => current,
}

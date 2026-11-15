import { GLYPHS } from '../data/content'

/** SVG rendering of a Founder's mark (same strokes as the 3D version). */
export function GlyphIcon({ index, size = 40, color = '#ffe14d', dim = false }: { index: number; size?: number; color?: string; dim?: boolean }) {
  const g = GLYPHS.find((x) => x.index === index)!
  return (
    <svg width={size} height={size} viewBox="-1.2 -1.2 2.4 2.4" aria-label={`Mark ${index}: ${g.name}`} role="img">
      {g.paths.map((p, i) => (
        <polyline key={i} points={p.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={dim ? '#4a4066' : color} strokeWidth={0.12} strokeLinecap="round" strokeLinejoin="round" style={{ filter: dim ? undefined : `drop-shadow(0 0 0.08px ${color})` }} />
      ))}
    </svg>
  )
}

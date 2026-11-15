import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { Group } from 'three'
import { GLYPHS } from '../../../data/content'
import { glow } from './materials'

/** A Founder's mark drawn as glowing line strokes. */
export function GlyphMark({ index, size = 1, color = '#ffe14d', spin = false, opacity = 1 }: { index: number; size?: number; color?: string; spin?: boolean; opacity?: number }) {
  const g = GLYPHS.find((x) => x.index === index)!
  const ref = useRef<Group>(null)
  const c = useMemo(() => glow(color, 2.6), [color])
  useFrame((s) => {
    if (spin && ref.current) ref.current.rotation.y = s.clock.elapsedTime * 1.2
  })
  return (
    <group ref={ref} scale={size}>
      {g.paths.map((path, i) => (
        <Line key={i} points={path.map(([x, y]) => [x, -y, 0] as [number, number, number])} color={c} lineWidth={3} toneMapped={false} transparent opacity={opacity} />
      ))}
    </group>
  )
}

import { useMemo } from 'react'
import { neonMaterial, surfaceMaterial } from './materials'

export const MONUMENT_COLORS = ['#00f0ff', '#ff2bd6', '#ffe14d', '#3dff8b', '#9d4dff', '#ffffff']

/** A 5×5 voxel monument designed by the player in Trial III. */
export function MonumentModel({ monument }: { monument: { h: number[]; c: string[] } }) {
  const blocks = useMemo(() => {
    const out: { x: number; y: number; z: number; color: string }[] = []
    monument.h.forEach((h, i) => {
      const x = (i % 5) - 2
      const z = Math.floor(i / 5) - 2
      for (let y = 0; y < h; y++) out.push({ x, y, z, color: monument.c[i] ?? '#00f0ff' })
    })
    return out
  }, [monument])
  return (
    <group>
      {blocks.map((b, i) => (
        <group key={i} position={[b.x, b.y + 0.5, b.z]}>
          <mesh material={surfaceMaterial('#101020', 0.3, 0.7)}>
            <boxGeometry args={[0.96, 0.96, 0.96]} />
          </mesh>
          <mesh material={neonMaterial(b.color, 1.4)} scale={[1.0, 0.12, 1.0]} position={[0, 0.44, 0]}>
            <boxGeometry args={[0.98, 0.98, 0.98]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

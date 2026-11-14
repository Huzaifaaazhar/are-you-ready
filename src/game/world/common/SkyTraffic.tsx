import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, InstancedMesh, Object3D } from 'three'
import { neonMaterial } from './materials'

interface Props {
  count?: number
  minR?: number
  maxR?: number
  minY?: number
  maxY?: number
  color?: string
}

/** Streams of glowing flying vehicles circling the city (one instanced draw call). */
export function SkyTraffic({ count = 70, minR = 70, maxR = 150, minY = 22, maxY = 55, color = '#ff2bd6' }: Props) {
  const ref = useRef<InstancedMesh>(null)
  const lanes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        r: minR + Math.random() * (maxR - minR),
        y: minY + Math.floor(Math.random() * 4) * ((maxY - minY) / 4),
        speed: (0.03 + Math.random() * 0.05) * (i % 2 ? 1 : -1),
        offset: Math.random() * Math.PI * 2,
      })),
    [count, minR, maxR, minY, maxY],
  )
  const geo = useMemo(() => new BoxGeometry(0.6, 0.25, 2.6), [])
  const o = useMemo(() => new Object3D(), [])
  useFrame((s) => {
    const m = ref.current
    if (!m) return
    const t = s.clock.elapsedTime
    lanes.forEach((l, i) => {
      const a = l.offset + t * l.speed
      o.position.set(Math.cos(a) * l.r, l.y, Math.sin(a) * l.r)
      o.rotation.y = -a + (l.speed > 0 ? 0 : Math.PI)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, neonMaterial(color, 3), count]} frustumCulled={false} />
}

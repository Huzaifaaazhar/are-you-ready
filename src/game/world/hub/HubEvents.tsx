import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import type { Vec3 } from '../../../data/content'
import { useGame } from '../../../store/useGame'
import { playerState } from '../../systems/playerState'
import { sfx } from '../../systems/audio'
import { neonMaterial } from '../common/materials'

/** Timed world event: a shower of bonus orbs falls on the plaza. */
export const worldEvents = { nextCoinRain: 0, active: false }
if (typeof window !== 'undefined') (window as unknown as { __events: unknown }).__events = { trigger: () => (worldEvents.nextCoinRain = performance.now()) }

export function CoinRain() {
  const [orbs, setOrbs] = useState<{ id: number; pos: Vec3 }[]>([])
  const until = useRef(0)
  const group = useRef<Group>(null)
  useEffect(() => {
    if (!worldEvents.nextCoinRain) worldEvents.nextCoinRain = performance.now() + 45000
  }, [])
  useFrame((s) => {
    const now = performance.now()
    if (!worldEvents.active && now > worldEvents.nextCoinRain && !useGame.getState().transition.active) {
      worldEvents.active = true
      until.current = now + 40000
      worldEvents.nextCoinRain = now + 180000
      const list = Array.from({ length: 10 }, (_, i) => {
        const a = Math.random() * Math.PI * 2
        const r = 9 + Math.random() * 30
        return { id: i, pos: [Math.cos(a) * r, 1.1, Math.sin(a) * r] as Vec3 }
      })
      setOrbs(list)
      sfx('secret')
      useGame.getState().toast({ kind: 'secret', title: 'WORLD EVENT · Coin Rain', body: 'Golden orbs fell on the plaza — 40 seconds! (+2 coins each)' })
    }
    if (worldEvents.active && now > until.current) {
      worldEvents.active = false
      setOrbs([])
    }
    if (group.current) group.current.children.forEach((c, i) => (c.position.y = 1.1 + Math.sin(s.clock.elapsedTime * 3 + i) * 0.2))
    if (!orbs.length) return
    const p = playerState.position
    const hit = orbs.find((o) => Math.hypot(p.x - o.pos[0], p.z - o.pos[2]) < 1.3 && p.y < 3)
    if (hit) {
      setOrbs((l) => l.filter((o) => o.id !== hit.id))
      useGame.getState().addWallet(2)
      sfx('coin')
      useGame.getState().toast({ kind: 'coin', title: '+2 coins', body: 'Coin Rain bonus' })
    }
  })
  return (
    <group ref={group}>
      {orbs.map((o) => (
        <mesh key={o.id} position={o.pos} material={neonMaterial('#ffe14d', 3)}>
          <icosahedronGeometry args={[0.4, 0]} />
        </mesh>
      ))}
    </group>
  )
}

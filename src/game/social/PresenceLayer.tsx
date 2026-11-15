import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { Group } from 'three'
import type { WorldId } from '../../data/content'
import { useGame, type Progress } from '../../store/useGame'
import { QUESTS } from '../../data/quests'
import { AvatarModel, type AvatarMotion } from '../avatar/AvatarModel'
import { useInteractable } from '../systems/interaction'
import { playerState } from '../systems/playerState'
import { NeonText } from '../world/common/NeonText'
import { presence, type PresenceEntity } from './presence'

function Resident({ e }: { e: PresenceEntity }) {
  const ref = useRef<Group>(null)
  const motion = useRef<AvatarMotion>({ speed: 0, grounded: true, vy: 0 }) as MutableRefObject<AvatarMotion>
  const quest = useGame((s) => {
    // "!" for an offer, "?" for a quest ready to turn in.
    const qs = s.progress.quests
    return e.kind === 'npc' ? questMarker(e.id, qs, s.progress) : null
  })
  const it = useInteractable({
    id: `npc-${e.id}`,
    position: [e.position.x, e.position.y + 1, e.position.z],
    radius: 2.4,
    label: `Talk to ${e.name}`,
    onInteract: () => useGame.getState().openOverlay({ type: 'dialogue', npc: e.id }),
  })
  useFrame(() => {
    const g = ref.current
    if (!g) return
    g.position.copy(e.position)
    g.rotation.y = e.heading
    it.position.set(e.position.x, e.position.y + 1, e.position.z)
    motion.current.speed = e.speed
  })
  return (
    <group ref={ref} position={e.position}>
      <AvatarModel config={e.avatar} motion={motion} />
      <Billboard position={[0, 2.35, 0]}>
        <NeonText fontSize={0.2} color={e.color} intensity={2.2}>
          {e.name}
        </NeonText>
        <NeonText position={[0, -0.22, 0]} fontSize={0.1} color="#ffffff" intensity={1.2} mono>
          {`NPC · ${e.title}`}
        </NeonText>
        {quest && (
          <NeonText position={[0, 0.38, 0]} fontSize={0.42} color={quest === '?' ? '#3dff8b' : '#ffe14d'} intensity={3}>
            {quest}
          </NeonText>
        )}
      </Billboard>
    </group>
  )
}

function questMarker(npc: string, qs: Progress['quests'], p: Progress) {
  const mine = QUESTS.filter((q) => q.giver === npc)
  if (mine.some((q) => qs[q.id] === 'ready')) return '?'
  if (mine.some((q) => !qs[q.id] && (!q.available || q.available(p)))) return '!'
  return null
}

/** Renders every presence entity in the current world and keeps their simulation ticking. */
export function PresenceLayer({ world }: { world: WorldId }) {
  const [list, setList] = useState<PresenceEntity[]>([])
  const overlay = useGame((s) => s.overlay)
  useEffect(() => {
    presence.providers.forEach((p) => p.join(world))
    setList(presence.providers.flatMap((p) => p.entities()))
    return () => presence.providers.forEach((p) => p.leave())
  }, [world])
  useEffect(() => {
    const talkingTo = overlay?.type === 'dialogue' ? overlay.npc : null
    list.forEach((e) => (e.talking = e.id === talkingTo))
  }, [overlay, list])
  useFrame((_, dt) => {
    presence.providers.forEach((p) => p.tick(Math.min(dt, 0.1), playerState.position))
  })
  return (
    <>
      {list.map((e) => (
        <Resident key={e.id} e={e} />
      ))}
    </>
  )
}

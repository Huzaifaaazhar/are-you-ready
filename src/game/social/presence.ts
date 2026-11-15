import { Vector3 } from 'three'
import { DEFAULT_AVATAR, type AvatarConfig } from '../../data/avatar'
import type { WorldId } from '../../data/content'
import { NPCS } from '../../data/npcs'

/**
 * Presence layer: everything that shares a world with the player.
 *
 * This build is single-player. The only provider is LocalNpcProvider, which simulates
 * residents (NPCs) on this device. A future networked provider would implement the same
 * interface (e.g. over WebSocket), set `networked = true`, and push remote players into
 * the same entity list — the renderer, interaction and dialogue code would not change.
 */
export interface PresenceEntity {
  id: string
  kind: 'npc' | 'remote-player'
  name: string
  title: string
  color: string
  world: WorldId
  avatar: AvatarConfig
  position: Vector3
  heading: number
  speed: number
  /** Locked in conversation with the local player. */
  talking: boolean
}

export interface PresenceProvider {
  readonly id: string
  readonly networked: boolean
  join(world: WorldId): void
  leave(): void
  tick(dt: number, player: Vector3): void
  entities(): PresenceEntity[]
}

interface Brain {
  home: Vector3
  radius: number
  target: Vector3
  wait: number
}

export class LocalNpcProvider implements PresenceProvider {
  readonly id = 'local-npcs'
  readonly networked = false
  private list: PresenceEntity[] = []
  private brains = new Map<string, Brain>()

  join(world: WorldId) {
    this.list = NPCS.filter((n) => n.world === world).map((n) => ({
      id: n.id,
      kind: 'npc' as const,
      name: n.name,
      title: n.title,
      color: n.color,
      world,
      avatar: { ...DEFAULT_AVATAR, aura: 'none', armour: 'none', headGear: 'none', backGear: 'none', ...n.look, name: n.name },
      position: new Vector3(...n.pos),
      heading: Math.PI,
      speed: 0,
      talking: false,
    }))
    this.brains.clear()
    for (const n of NPCS.filter((x) => x.world === world)) {
      const home = new Vector3(...n.pos)
      this.brains.set(n.id, { home, radius: n.wander, target: home.clone(), wait: 1 + Math.random() * 3 })
    }
  }

  leave() {
    this.list = []
    this.brains.clear()
  }

  tick(dt: number, player: Vector3) {
    for (const e of this.list) {
      const b = this.brains.get(e.id)!
      if (e.talking || player.distanceTo(e.position) < 2.6) {
        // Face the player when they come close or while talking.
        const want = Math.atan2(player.x - e.position.x, player.z - e.position.z)
        e.heading = turn(e.heading, want, dt * 6)
        e.speed = 0
        continue
      }
      if (b.radius <= 0) {
        e.speed = 0
        continue
      }
      const to = new Vector3().subVectors(b.target, e.position).setY(0)
      const d = to.length()
      if (d < 0.2) {
        e.speed = 0
        b.wait -= dt
        if (b.wait <= 0) {
          const a = Math.random() * Math.PI * 2
          const r = Math.random() * b.radius
          b.target.set(b.home.x + Math.cos(a) * r, b.home.y, b.home.z + Math.sin(a) * r)
          b.wait = 2 + Math.random() * 4
        }
        continue
      }
      const sp = 1.3
      to.normalize()
      e.position.addScaledVector(to, Math.min(d, sp * dt))
      e.heading = turn(e.heading, Math.atan2(to.x, to.z), dt * 5)
      e.speed = sp
    }
  }

  entities() {
    return this.list
  }
}

function turn(a: number, b: number, t: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * Math.min(1, t)
}

export const presence = {
  providers: [new LocalNpcProvider()] as PresenceProvider[],
  /** Honest connection status shown in the UI. */
  online(): boolean {
    return this.providers.some((p) => p.networked)
  },
}

/** Debug/test handle: positions of residents in the current world. */
if (typeof window !== 'undefined') (window as unknown as { __presence: typeof presence }).__presence = presence

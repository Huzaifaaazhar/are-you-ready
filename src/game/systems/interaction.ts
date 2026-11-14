import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import type { Vec3 } from '../../data/content'

/**
 * Proximity-based interaction system. Interactables register a position and radius;
 * the player controller picks the nearest one each frame and E / the touch button triggers it.
 */
export interface Interactable {
  id: string
  position: Vector3
  radius: number
  label: string
  enabled: boolean
  onInteract: () => void
}

const registry = new Map<string, Interactable>()
let current: Interactable | null = null

export function getInteractables() {
  return registry
}

export function findNearest(pos: Vector3): Interactable | null {
  let best: Interactable | null = null
  let bestD = Infinity
  for (const it of registry.values()) {
    if (!it.enabled) continue
    const dy = Math.abs(pos.y - it.position.y)
    if (dy > 3) continue
    const dx = pos.x - it.position.x
    const dz = pos.z - it.position.z
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d < it.radius && d < bestD) {
      best = it
      bestD = d
    }
  }
  current = best
  return best
}

export function triggerInteract() {
  if (current && current.enabled && registry.has(current.id)) current.onInteract()
}

export interface UseInteractableOptions {
  id: string
  position: Vec3
  radius?: number
  label: string
  enabled?: boolean
  onInteract: () => void
}

/** Register an interactable for the lifetime of the component. Options are kept fresh every render. */
export function useInteractable(opts: UseInteractableOptions) {
  const ref = useRef<Interactable | null>(null)
  if (!ref.current) {
    ref.current = {
      id: opts.id,
      position: new Vector3(...opts.position),
      radius: opts.radius ?? 2.5,
      label: opts.label,
      enabled: opts.enabled ?? true,
      onInteract: opts.onInteract,
    }
  }
  const it = ref.current
  it.position.set(...opts.position)
  it.radius = opts.radius ?? 2.5
  it.label = opts.label
  it.enabled = opts.enabled ?? true
  it.onInteract = opts.onInteract

  useEffect(() => {
    registry.set(it.id, it)
    return () => {
      registry.delete(it.id)
      if (current === it) current = null
    }
  }, [it])
  return it
}

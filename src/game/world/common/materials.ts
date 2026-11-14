import { Color, MeshBasicMaterial, MeshStandardMaterial } from 'three'

export const FONT_DISPLAY = `${import.meta.env.BASE_URL}fonts/orbitron-700.woff`
export const FONT_MONO = `${import.meta.env.BASE_URL}fonts/sharetech-400.woff`

/** HDR colour (>1) so bloom picks it up. */
export function glow(hex: string, k = 2.5) {
  return new Color(hex).multiplyScalar(k)
}

const basicCache = new Map<string, MeshBasicMaterial>()
/** Shared unlit neon material, cached by colour + intensity. */
export function neonMaterial(hex: string, k = 2.5) {
  const key = `${hex}:${k}`
  let m = basicCache.get(key)
  if (!m) {
    m = new MeshBasicMaterial({ color: glow(hex, k), toneMapped: false })
    basicCache.set(key, m)
  }
  return m
}

const stdCache = new Map<string, MeshStandardMaterial>()
export function surfaceMaterial(hex: string, roughness = 0.6, metalness = 0.3) {
  const key = `${hex}:${roughness}:${metalness}`
  let m = stdCache.get(key)
  if (!m) {
    m = new MeshStandardMaterial({ color: hex, roughness, metalness })
    stdCache.set(key, m)
  }
  return m
}

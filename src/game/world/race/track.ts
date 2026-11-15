import { CatmullRomCurve3, Vector3 } from 'three'
import type { RoadPath } from './layout'

export interface Segment {
  pos: [number, number, number]
  /** Euler YXZ: yaw, pitch. */
  yaw: number
  pitch: number
  length: number
  width: number
}

/** Sample a road path into short straight segments (each becomes a road box + two walls). */
export function buildSegments(path: RoadPath, step = 5): Segment[] {
  const curve = new CatmullRomCurve3(path.points.map((p) => new Vector3(...p)), false, 'centripetal')
  const len = curve.getLength()
  const n = Math.max(2, Math.ceil(len / step))
  const pts = curve.getSpacedPoints(n)
  const segs: Segment[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const d = new Vector3().subVectors(b, a)
    const l = d.length()
    const yaw = Math.atan2(d.x, d.z)
    const pitch = -Math.asin(d.y / l)
    segs.push({ pos: [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2], yaw, pitch, length: l + 0.8, width: path.width })
  }
  return segs
}

/** Points along a path's centre line (used by the autopilot and the minimap). */
export function samplePath(path: RoadPath, step = 6) {
  const curve = new CatmullRomCurve3(path.points.map((p) => new Vector3(...p)), false, 'centripetal')
  return curve.getSpacedPoints(Math.ceil(curve.getLength() / step))
}

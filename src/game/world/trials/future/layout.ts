import type { WorldLayout } from '../../../../data/content'

export const GRID = { cols: 9, rows: 7, cell: 3 }
export const BOARD = {
  emitterRow: 3,
  receivers: [[7, 0], [1, 6], [8, 5]] as [number, number][],
  blocks: [[3, 1], [5, 4], [6, 2], [2, 4]] as [number, number][],
  corruption: [[5, 3], [4, 6]] as [number, number][],
  mirrors: 4,
  splitters: 1,
}
export const cellX = (c: number) => (c - (GRID.cols - 1) / 2) * GRID.cell
export const cellZ = (r: number) => (r - (GRID.rows - 1) / 2) * GRID.cell

export type Piece = '/' | '\\' | 'S'

/** Trace the light through the board. Mirrors: '/' and '\\'; 'S' splits (passes and reflects like '/'). */
export function traceBeam(pieces: Record<string, Piece>) {
  const lit = new Set<string>()
  let corrupt = false
  const seen = new Set<string>()
  /** Segments in grid coordinates [c0, r0, c1, r1]. */
  const segments: [number, number, number, number][] = []
  // [col, row, dx, dz, startCol, startRow]
  const stack: [number, number, number, number, number, number][] = [[0, BOARD.emitterRow, 1, 0, -1, BOARD.emitterRow]]
  const isAt = (list: [number, number][], c: number, r: number) => list.some(([a, b]) => a === c && b === r)
  let guard = 0
  while (stack.length && guard++ < 64) {
    let [c, r, dx, dz, sc, sr] = stack.pop()!
    while (true) {
      if (c < 0 || c >= GRID.cols || r < 0 || r >= GRID.rows) {
        segments.push([sc, sr, c - dx * 0.4, r - dz * 0.4])
        break
      }
      const s = `${c},${r},${dx},${dz}`
      if (seen.has(s)) {
        segments.push([sc, sr, c, r])
        break
      }
      seen.add(s)
      const k = `${c},${r}`
      if (isAt(BOARD.blocks, c, r)) {
        segments.push([sc, sr, c - dx * 0.45, r - dz * 0.45])
        break
      }
      if (isAt(BOARD.corruption, c, r)) {
        corrupt = true
        segments.push([sc, sr, c, r])
        break
      }
      if (isAt(BOARD.receivers, c, r)) lit.add(k)
      const p = pieces[k]
      if (p) {
        segments.push([sc, sr, c, r])
        sc = c
        sr = r
        if (p === 'S') stack.push([c - dz, r - dx, -dz, -dx, c, r])
        else if (p === '/') [dx, dz] = [-dz, -dx]
        else [dx, dz] = [dz, dx]
      }
      c += dx
      r += dz
    }
  }
  return { lit, corrupt, segments }
}

export const FUTURE_LAYOUT: WorldLayout = {
  id: 'future',
  name: 'The Future',
  subtitle: 'Trial III · The Blueprint',
  bounds: [-20, -28, 20, 22],
  spawns: { default: { pos: [0, 1.2, 15], yaw: 0 } },
  pois: [
    { id: 'emitter', label: 'Emitter', x: -15, z: 0, kind: 'challenge' },
    { id: 'forge', label: 'Monument Forge', x: 0, z: -20, kind: 'challenge' },
    { id: 'exit', label: 'Exit portal', x: 0, z: 19, kind: 'portal' },
  ],
  coins: [],
  mapShapes: [{ type: 'rect', x: -15, z: -12, w: 30, h: 24 }, { type: 'rect', x: -5, z: -26, w: 10, h: 12 }],
}

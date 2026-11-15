import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { Color, DoubleSide, Group, MeshBasicMaterial, MeshStandardMaterial, type Mesh } from 'three'
import type { AvatarConfig } from '../../data/avatar'

export interface AvatarMotion {
  speed: number
  grounded: boolean
  vy: number
}

interface Props {
  config: AvatarConfig
  motion?: MutableRefObject<AvatarMotion>
  /** Idle animation when no motion ref is passed. */
  showcase?: boolean
}

const BODY_W = { slim: 0.88, standard: 1, bulky: 1.22 } as const
const LIMB_W = { slim: 0.9, standard: 1, bulky: 1.25 } as const
const FACE_Z = { round: 0.158, oval: 0.15, angular: 0.153, bot: 0.153 } as const

function useMaterials(c: AvatarConfig) {
  const mats = useMemo(() => {
    const std = (color: string, rough = 0.6, metal = 0.1) => new MeshStandardMaterial({ color, roughness: rough, metalness: metal })
    const glow = (color: string, k = 2.2) => new MeshBasicMaterial({ color: new Color(color).multiplyScalar(k), toneMapped: false })
    return {
      skin: std(c.skin, 0.55, 0),
      hair: std(c.hairColor, 0.7, 0.05),
      primary: std(c.primary, 0.5, 0.25),
      secondary: std(c.secondary, 0.45, 0.35),
      dark: std('#0b0b14', 0.6, 0.3),
      metal: std('#9aa3b8', 0.3, 0.85),
      accent: glow(c.accent),
      accentSoft: new MeshBasicMaterial({ color: new Color(c.accent).multiplyScalar(1.4), toneMapped: false, transparent: true, opacity: 0.45, side: DoubleSide, depthWrite: false }),
      eyes: glow(c.eyes, 2.6),
      mouth: std('#2a1018', 0.8, 0),
    }
  }, [c.skin, c.hairColor, c.primary, c.secondary, c.accent, c.eyes])
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats])
  return mats
}

export function AvatarModel({ config: c, motion, showcase }: Props) {
  const m = useMaterials(c)
  const bw = BODY_W[c.body]
  const lw = LIMB_W[c.body]
  const root = useRef<Group>(null)
  const torso = useRef<Group>(null)
  const legL = useRef<Group>(null)
  const legR = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const armR = useRef<Group>(null)
  const head = useRef<Group>(null)
  const halo = useRef<Mesh>(null)
  const flameL = useRef<Mesh>(null)
  const flameR = useRef<Mesh>(null)
  const wingL = useRef<Group>(null)
  const wingR = useRef<Group>(null)
  const cape = useRef<Group>(null)
  const crown = useRef<Group>(null)
  const drones = useRef<Group>(null)
  const phase = useRef(0)

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const mo = motion?.current
    const speed = mo ? mo.speed : 0
    const grounded = mo ? mo.grounded : true
    const k = Math.min(1, speed / 6)
    phase.current += dt * (4 + speed * 1.6)
    const swing = Math.sin(phase.current)
    const lerp = 1 - Math.exp(-dt * 14)
    let lL = swing * 0.8 * k
    let lR = -swing * 0.8 * k
    let aL = -swing * 0.7 * k
    let aR = swing * 0.7 * k
    let armSpread = 0.08
    if (!grounded) {
      lL = -0.5
      lR = 0.25
      aL = -0.9
      aR = -0.9
      armSpread = 0.35
    } else if (showcase && speed < 0.1) {
      aR = Math.sin(t * 1.3) * 0.08
      aL = -Math.sin(t * 1.3) * 0.08
    }
    if (legL.current) legL.current.rotation.x += (lL - legL.current.rotation.x) * lerp
    if (legR.current) legR.current.rotation.x += (lR - legR.current.rotation.x) * lerp
    if (armL.current) {
      armL.current.rotation.x += (aL - armL.current.rotation.x) * lerp
      armL.current.rotation.z += (armSpread - armL.current.rotation.z) * lerp
    }
    if (armR.current) {
      armR.current.rotation.x += (aR - armR.current.rotation.x) * lerp
      armR.current.rotation.z += (-armSpread - armR.current.rotation.z) * lerp
    }
    if (torso.current) {
      const bob = grounded ? Math.abs(Math.sin(phase.current)) * 0.05 * k + Math.sin(t * 2) * 0.006 : 0
      torso.current.position.y = bob
      torso.current.rotation.x = 0.12 * k
    }
    if (head.current) head.current.rotation.y = showcase ? Math.sin(t * 0.7) * 0.15 : 0
    if (halo.current) halo.current.rotation.z = t * 1.5
    if (crown.current) crown.current.rotation.y = t * 0.8
    if (drones.current) drones.current.rotation.y = t * 2.2
    const flicker = 0.8 + Math.sin(t * 40) * 0.2 + (grounded ? 0 : 0.6)
    if (flameL.current) flameL.current.scale.y = flicker
    if (flameR.current) flameR.current.scale.y = flicker
    const flap = Math.sin(t * (grounded ? 2 : 9)) * (grounded ? 0.12 : 0.4)
    if (wingL.current) wingL.current.rotation.y = 0.5 + flap
    if (wingR.current) wingR.current.rotation.y = -0.5 - flap
    if (cape.current) {
      cape.current.rotation.x = 0.08 + k * 0.5 + Math.sin(t * 3) * 0.04 + (grounded ? 0 : 0.4)
    }
  })

  const hipY = 0.92
  const shoulderX = 0.22 * bw + 0.08
  const torsoMat = c.outfit === 'jacket' || c.outfit === 'archivist' ? m.secondary : m.primary
  const shoulders = c.armour === 'pauldrons' || c.armour === 'full' || c.armour === 'vanguard'
  const chest = c.armour === 'chestplate' || c.armour === 'full' || c.armour === 'vanguard'
  const helmet = c.headGear === 'racer-helmet'
  const pantsMat = c.outfit === 'jacket' || c.outfit === 'hoodie' ? m.secondary : m.primary
  const handMat = c.outfit === 'racer' || c.outfit === 'jumpsuit' ? m.dark : m.skin
  const faceZ = FACE_Z[c.head]
  const boxHead = c.head === 'angular' || c.head === 'bot'

  const leg = (side: 1 | -1, ref: MutableRefObject<Group | null>) => (
    <group ref={ref} position={[0.12 * side * bw, hipY, 0]}>
      <mesh position={[0, -0.42, 0]} material={pantsMat} castShadow>
        <capsuleGeometry args={[0.1 * lw, 0.62, 6, 12]} />
      </mesh>
      {(c.outfit === 'jumpsuit' || c.outfit === 'racer') && (
        <mesh position={[0.1 * lw * side, -0.4, 0]} material={m.accent}>
          <boxGeometry args={[0.012, 0.5, 0.03]} />
        </mesh>
      )}
      <mesh position={[0, -0.84, 0.035]} material={m.dark}>
        <boxGeometry args={[0.19 * lw, 0.14, 0.3]} />
      </mesh>
      <mesh position={[0, -0.9, 0.035]} material={m.accent}>
        <boxGeometry args={[0.2 * lw, 0.02, 0.31]} />
      </mesh>
      {c.armour === 'full' && (
        <RoundedBox args={[0.2 * lw, 0.26, 0.08]} radius={0.03} position={[0, -0.58, 0.09]} material={m.secondary}>
          <mesh position={[0, 0, 0.045]} material={m.accent}>
            <boxGeometry args={[0.1, 0.015, 0.01]} />
          </mesh>
        </RoundedBox>
      )}
    </group>
  )

  const arm = (side: 1 | -1, ref: MutableRefObject<Group | null>) => (
    <group ref={ref} position={[shoulderX * side, 1.46, 0]}>
      <mesh position={[0, -0.28, 0]} material={torsoMat}>
        <capsuleGeometry args={[0.072 * lw, 0.42, 6, 12]} />
      </mesh>
      <mesh position={[0, -0.6, 0]} material={handMat}>
        <sphereGeometry args={[0.075 * lw, 12, 10]} />
      </mesh>
      {c.outfit === 'racer' && (
        <mesh position={[0, -0.28, 0.07 * lw]} material={m.accent}>
          <boxGeometry args={[0.02, 0.36, 0.01]} />
        </mesh>
      )}
      {c.armour === 'full' && (
        <RoundedBox args={[0.17 * lw, 0.2, 0.17 * lw]} radius={0.03} position={[0, -0.44, 0]} material={m.secondary}>
          <mesh position={[0, 0.0, 0.09 * lw]} material={m.accent}>
            <boxGeometry args={[0.06, 0.06, 0.01]} />
          </mesh>
        </RoundedBox>
      )}
      {(shoulders || (c.armour === 'gladiator' && side === 1)) && (
        <group position={[0.03 * side, 0.02, 0]} rotation={[0, 0, -0.35 * side]}>
          <RoundedBox args={[(c.armour === 'gladiator' ? 0.3 : 0.22) * lw, c.armour === 'gladiator' ? 0.16 : 0.12, (c.armour === 'gladiator' ? 0.3 : 0.24) * lw]} radius={0.04} material={c.armour === 'gladiator' ? m.metal : m.secondary} />
          {c.armour === 'gladiator' && (
            <mesh position={[0.02, 0.14, 0]} material={m.accent}>
              <coneGeometry args={[0.04, 0.16, 6]} />
            </mesh>
          )}
          <mesh position={[0, -0.065, 0]} material={m.accent}>
            <boxGeometry args={[0.23 * lw, 0.014, 0.25 * lw]} />
          </mesh>
        </group>
      )}
    </group>
  )

  return (
    <group ref={root} scale={c.height}>
      {leg(1, legL)}
      {leg(-1, legR)}
      <group ref={torso}>
        {/* pelvis */}
        <mesh position={[0, hipY + 0.03, 0]} material={pantsMat}>
          <boxGeometry args={[0.38 * bw, 0.18, 0.23]} />
        </mesh>
        <mesh position={[0, hipY + 0.12, 0]} material={c.armour === 'full' ? m.metal : m.dark}>
          <boxGeometry args={[0.4 * bw, 0.05, 0.25]} />
        </mesh>
        <mesh position={[0, hipY + 0.12, 0.128]} material={m.accent}>
          <boxGeometry args={[0.07, 0.035, 0.01]} />
        </mesh>
        {/* torso */}
        <RoundedBox args={[0.44 * bw, 0.5, 0.26]} radius={0.06} position={[0, hipY + 0.4, 0]} material={torsoMat} />
        {c.outfit === 'jumpsuit' && (
          <>
            <mesh position={[0.2 * bw, hipY + 0.4, 0.06]} material={m.accent}>
              <boxGeometry args={[0.015, 0.44, 0.1]} />
            </mesh>
            <mesh position={[-0.2 * bw, hipY + 0.4, 0.06]} material={m.accent}>
              <boxGeometry args={[0.015, 0.44, 0.1]} />
            </mesh>
            <mesh position={[0.08, hipY + 0.53, 0.132]} material={m.secondary}>
              <boxGeometry args={[0.1, 0.06, 0.01]} />
            </mesh>
          </>
        )}
        {c.outfit === 'jacket' && (
          <>
            <mesh position={[0, hipY + 0.4, 0.125]} material={m.primary}>
              <boxGeometry args={[0.12 * bw, 0.48, 0.02]} />
            </mesh>
            <mesh position={[0.07 * bw, hipY + 0.6, 0.12]} rotation={[0, 0, 0.5]} material={m.secondary}>
              <boxGeometry args={[0.06, 0.16, 0.04]} />
            </mesh>
            <mesh position={[-0.07 * bw, hipY + 0.6, 0.12]} rotation={[0, 0, -0.5]} material={m.secondary}>
              <boxGeometry args={[0.06, 0.16, 0.04]} />
            </mesh>
            <mesh position={[0.065 * bw, hipY + 0.4, 0.138]} material={m.accent}>
              <boxGeometry args={[0.01, 0.46, 0.006]} />
            </mesh>
            <mesh position={[-0.065 * bw, hipY + 0.4, 0.138]} material={m.accent}>
              <boxGeometry args={[0.01, 0.46, 0.006]} />
            </mesh>
          </>
        )}
        {c.outfit === 'hoodie' && (
          <>
            <mesh position={[0, hipY + 0.62, -0.1]} rotation={[1.25, 0, 0]} material={m.primary}>
              <torusGeometry args={[0.13, 0.05, 8, 16]} />
            </mesh>
            <mesh position={[0, hipY + 0.27, 0.13]} material={m.secondary}>
              <boxGeometry args={[0.26 * bw, 0.14, 0.02]} />
            </mesh>
            <mesh position={[0.04, hipY + 0.52, 0.135]} material={m.accent}>
              <boxGeometry args={[0.008, 0.12, 0.008]} />
            </mesh>
            <mesh position={[-0.04, hipY + 0.52, 0.135]} material={m.accent}>
              <boxGeometry args={[0.008, 0.12, 0.008]} />
            </mesh>
          </>
        )}
        {c.outfit === 'racer' && (
          <>
            <mesh position={[0, hipY + 0.4, 0.132]} rotation={[0, 0, 0.75]} material={m.accent}>
              <boxGeometry args={[0.04, 0.62 * bw, 0.01]} />
            </mesh>
            <mesh position={[0, hipY + 0.6, 0]} material={m.secondary}>
              <boxGeometry args={[0.46 * bw, 0.1, 0.27]} />
            </mesh>
          </>
        )}
        {c.outfit === 'archivist' && (
          <>
            <mesh position={[0, hipY - 0.12, -0.01]} material={m.secondary}>
              <cylinderGeometry args={[0.24 * bw, 0.3 * bw, 0.5, 12, 1, true]} />
            </mesh>
            <mesh position={[0, hipY + 0.62, -0.02]} material={m.secondary}>
              <cylinderGeometry args={[0.13, 0.17, 0.12, 12, 1, true]} />
            </mesh>
            <mesh position={[0, hipY + 0.4, 0.133]} material={m.primary}>
              <boxGeometry args={[0.08 * bw, 0.5, 0.01]} />
            </mesh>
            {[0.3, 0.42, 0.54].map((y) => (
              <mesh key={y} position={[0.06 * bw, hipY + y, 0.14]} material={m.accent}>
                <sphereGeometry args={[0.012, 6, 4]} />
              </mesh>
            ))}
          </>
        )}
        {c.outfit === 'pixel-suit' &&
          [0, 1, 2].flatMap((r) =>
            [0, 1, 2].map((col) =>
              (r + col) % 2 === 0 ? (
                <mesh key={`${r}${col}`} position={[(col - 1) * 0.1 * bw, hipY + 0.56 - r * 0.13, 0.132]} material={m.accent}>
                  <boxGeometry args={[0.09 * bw, 0.11, 0.01]} />
                </mesh>
              ) : null,
            ),
          )}
        {c.armour === 'gladiator' && (
          <>
            {[1, -1].map((s) => (
              <mesh key={s} position={[0, hipY + 0.42, 0.135]} rotation={[0, 0, 0.7 * s]} material={m.dark}>
                <boxGeometry args={[0.05, 0.62 * bw, 0.015]} />
              </mesh>
            ))}
            <mesh position={[0, hipY + 0.42, 0.145]} material={m.accent}>
              <circleGeometry args={[0.035, 12]} />
            </mesh>
          </>
        )}
        {chest && (
          <group position={[0, hipY + 0.45, 0.14]}>
            <RoundedBox args={[0.36 * bw, 0.3, 0.06]} radius={0.025} material={m.secondary} />
            {c.armour === 'vanguard' ? (
              <>
                <mesh position={[-0.045, 0.01, 0.033]} rotation={[0, 0, 0.45]} material={m.accent}>
                  <boxGeometry args={[0.025, 0.16, 0.01]} />
                </mesh>
                <mesh position={[0.045, 0.01, 0.033]} rotation={[0, 0, -0.45]} material={m.accent}>
                  <boxGeometry args={[0.025, 0.16, 0.01]} />
                </mesh>
              </>
            ) : (
              <mesh position={[0, 0, 0.032]} material={m.accent}>
                <circleGeometry args={[0.045, 20]} />
              </mesh>
            )}
            <mesh position={[0, 0, 0.031]} material={m.metal}>
              <ringGeometry args={[0.05, 0.065, 20]} />
            </mesh>
          </group>
        )}
        {/* back gear */}
        {c.backGear === 'jetpack' && (
          <group position={[0, hipY + 0.42, -0.2]}>
            {[-1, 1].map((s) => (
              <group key={s} position={[0.08 * s, 0, 0]}>
                <mesh material={m.metal}>
                  <cylinderGeometry args={[0.065, 0.065, 0.38, 12]} />
                </mesh>
                <mesh position={[0, 0.2, 0]} material={m.secondary}>
                  <sphereGeometry args={[0.065, 12, 8]} />
                </mesh>
                <mesh ref={s === -1 ? flameL : flameR} position={[0, -0.27, 0]} material={m.accent}>
                  <coneGeometry args={[0.045, 0.16, 10]} />
                </mesh>
              </group>
            ))}
          </group>
        )}
        {c.backGear === 'blade' && (
          <group position={[0, hipY + 0.45, -0.16]} rotation={[0, 0, 0.7]}>
            <mesh position={[0, -0.32, 0]} material={m.dark}>
              <cylinderGeometry args={[0.025, 0.025, 0.22, 8]} />
            </mesh>
            <mesh position={[0, -0.2, 0]} material={m.metal}>
              <boxGeometry args={[0.12, 0.02, 0.04]} />
            </mesh>
            <mesh position={[0, 0.2, 0]} material={m.accent}>
              <boxGeometry args={[0.035, 0.78, 0.012]} />
            </mesh>
          </group>
        )}
        {c.backGear === 'wings' && (
          <group position={[0, hipY + 0.48, -0.15]}>
            {[-1, 1].map((s) => (
              <group key={s} ref={s === -1 ? wingL : wingR} rotation={[0, 0.5 * s, 0]}>
                <mesh position={[0.32 * s, 0.08, 0]} rotation={[0, 0, -0.35 * s]} material={m.accentSoft}>
                  <planeGeometry args={[0.6, 0.32]} />
                </mesh>
                <mesh position={[0.28 * s, -0.1, 0]} rotation={[0, 0, -0.15 * s]} material={m.accentSoft}>
                  <planeGeometry args={[0.48, 0.18]} />
                </mesh>
              </group>
            ))}
          </group>
        )}
        {c.backGear === 'pixel-cape' && (
          <group ref={cape} position={[0, hipY + 0.64, -0.15]}>
            {Array.from({ length: 6 }, (_, row) =>
              Array.from({ length: 5 }, (_, col) => (
                <mesh
                  key={`${row}-${col}`}
                  position={[(col - 2) * 0.09 * bw, -row * 0.11 - 0.05, -row * 0.012]}
                  material={(row + col) % 2 === 0 ? m.accent : m.secondary}
                >
                  <boxGeometry args={[0.085 * bw, 0.1, 0.015]} />
                </mesh>
              )),
            )}
          </group>
        )}
        {c.backGear === 'drones' && (
          <group ref={drones} position={[0, hipY + 0.75, 0]}>
            {[0, Math.PI].map((a) => (
              <group key={a} position={[Math.cos(a) * 0.55, 0.1, Math.sin(a) * 0.55]}>
                <mesh material={m.metal}>
                  <boxGeometry args={[0.1, 0.1, 0.1]} />
                </mesh>
                <mesh position={[0, 0, 0.051]} material={m.accent}>
                  <planeGeometry args={[0.06, 0.03]} />
                </mesh>
              </group>
            ))}
          </group>
        )}
        {arm(1, armL)}
        {arm(-1, armR)}
        {/* neck */}
        <mesh position={[0, 1.56, 0]} material={c.head === 'bot' ? m.metal : m.skin}>
          <cylinderGeometry args={[0.06, 0.07, 0.12, 10]} />
        </mesh>
        <group ref={head} position={[0, 1.74, 0]}>
          {c.head === 'round' && (
            <mesh material={m.skin}>
              <sphereGeometry args={[0.165, 24, 18]} />
            </mesh>
          )}
          {c.head === 'oval' && (
            <mesh material={m.skin} scale={[0.93, 1.16, 1]}>
              <sphereGeometry args={[0.155, 24, 18]} />
            </mesh>
          )}
          {c.head === 'angular' && <RoundedBox args={[0.29, 0.32, 0.3]} radius={0.05} material={m.skin} />}
          {c.head === 'bot' && (
            <>
              <RoundedBox args={[0.31, 0.3, 0.3]} radius={0.08} material={m.primary} />
              <RoundedBox args={[0.25, 0.18, 0.02]} radius={0.01} position={[0, 0, 0.145]} material={m.dark} />
              {[-1, 1].map((s) => (
                <mesh key={s} position={[0.165 * s, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={m.secondary}>
                  <cylinderGeometry args={[0.06, 0.06, 0.04, 14]} />
                </mesh>
              ))}
            </>
          )}
          {/* face */}
          {c.face === 'bright' &&
            [-1, 1].map((s) => (
              <mesh key={s} position={[0.06 * s, 0.015, faceZ]} scale={[1, 1.25, 0.4]} material={m.eyes}>
                <sphereGeometry args={[0.026, 10, 8]} />
              </mesh>
            ))}
          {c.face === 'narrow' &&
            [-1, 1].map((s) => (
              <mesh key={s} position={[0.062 * s, 0.015, faceZ]} rotation={[0, 0, 0.12 * s]} material={m.eyes}>
                <boxGeometry args={[0.07, 0.016, 0.012]} />
              </mesh>
            ))}
          {c.face === 'pixel' &&
            [-1, 1].map((s) => (
              <mesh key={s} position={[0.06 * s, 0.015, faceZ]} material={m.eyes}>
                <boxGeometry args={[0.045, 0.045, 0.012]} />
              </mesh>
            ))}
          {c.face === 'visor' && (
            <mesh position={[0, 0.02, faceZ - 0.005]} material={m.eyes}>
              <boxGeometry args={[0.26, 0.055, 0.02]} />
            </mesh>
          )}
          {c.head !== 'bot' && (
            <mesh position={[0, -0.075, faceZ - 0.004]} material={m.mouth}>
              <boxGeometry args={[0.05, 0.012, 0.01]} />
            </mesh>
          )}
          {/* hair */}
          {c.hair !== 'none' && !helmet &&
            (boxHead ? (
              <RoundedBox args={[0.32, 0.09, 0.32]} radius={0.03} position={[0, 0.16, -0.005]} material={m.hair} />
            ) : (
              <mesh position={[0, 0.012, -0.004]} scale={c.head === 'oval' ? [0.97, 1.2, 1.05] : [1.04, 1.05, 1.06]} material={m.hair}>
                <sphereGeometry args={[0.17, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              </mesh>
            ))}
          {!helmet && c.hair === 'spikes' &&
            Array.from({ length: 7 }, (_, i) => {
              const a = (i / 7) * Math.PI * 2
              return (
                <mesh key={i} position={[Math.cos(a) * 0.09, 0.17, Math.sin(a) * 0.09 - 0.01]} rotation={[Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6]} material={m.hair}>
                  <coneGeometry args={[0.045, 0.14, 6]} />
                </mesh>
              )
            })}
          {!helmet && c.hair === 'mohawk' &&
            Array.from({ length: 5 }, (_, i) => (
              <mesh key={i} position={[0, 0.2 + Math.sin((i / 4) * Math.PI) * 0.04, 0.12 - i * 0.065]} material={m.hair}>
                <boxGeometry args={[0.04, 0.12 + Math.sin((i / 4) * Math.PI) * 0.06, 0.06]} />
              </mesh>
            ))}
          {c.hair === 'long' && (
            <RoundedBox args={[0.32, 0.44, 0.1]} radius={0.04} position={[0, -0.13, -0.12]} material={m.hair} />
          )}
          {!helmet && c.hair === 'bun' && (
            <mesh position={[0, 0.15, -0.13]} material={m.hair}>
              <sphereGeometry args={[0.08, 14, 10]} />
            </mesh>
          )}
          {!helmet && c.hair === 'swoop' && (
            <mesh position={[0.05, 0.13, 0.12]} rotation={[0.5, 0, -0.5]} material={m.hair}>
              <boxGeometry args={[0.24, 0.06, 0.12]} />
            </mesh>
          )}
          {/* head gear */}
          {c.headGear === 'headphones' && (
            <>
              <mesh position={[0, 0.03, 0]} material={m.dark}>
                <torusGeometry args={[0.19, 0.018, 8, 24, Math.PI]} />
              </mesh>
              {[-1, 1].map((s) => (
                <group key={s} position={[0.18 * s, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <mesh material={m.dark}>
                    <cylinderGeometry args={[0.065, 0.065, 0.06, 16]} />
                  </mesh>
                  <mesh position={[0, 0.032 * s, 0]} material={m.accent}>
                    <cylinderGeometry args={[0.045, 0.045, 0.005, 16]} />
                  </mesh>
                </group>
              ))}
            </>
          )}
          {c.headGear === 'goggles' && (
            <group position={[0, 0.1, 0]}>
              <mesh material={m.dark} rotation={[0.15, 0, 0]}>
                <cylinderGeometry args={[0.178, 0.178, 0.035, 24, 1, true]} />
              </mesh>
              {[-1, 1].map((s) => (
                <group key={s} position={[0.06 * s, 0.01, 0.165]} rotation={[Math.PI / 2 - 0.2, 0, 0]}>
                  <mesh material={m.metal}>
                    <cylinderGeometry args={[0.045, 0.045, 0.04, 16]} />
                  </mesh>
                  <mesh position={[0, 0.021, 0]} material={m.accent}>
                    <cylinderGeometry args={[0.035, 0.035, 0.005, 16]} />
                  </mesh>
                </group>
              ))}
            </group>
          )}
          {c.headGear === 'antenna' && (
            <group position={[0.08, 0.15, 0]}>
              <mesh position={[0, 0.12, 0]} material={m.metal}>
                <cylinderGeometry args={[0.008, 0.008, 0.24, 6]} />
              </mesh>
              <mesh position={[0, 0.25, 0]} material={m.accent}>
                <sphereGeometry args={[0.03, 10, 8]} />
              </mesh>
            </group>
          )}
          {c.headGear === 'halo' && (
            <mesh ref={halo} position={[0, 0.29, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.accent}>
              <torusGeometry args={[0.14, 0.012, 8, 32]} />
            </mesh>
          )}
          {helmet && (
            <group>
              <mesh scale={[1, 1.05, 1.05]} material={m.primary}>
                <sphereGeometry args={[0.2, 24, 18]} />
              </mesh>
              <mesh position={[0, 0.0, 0.035]} material={m.accentSoft}>
                <sphereGeometry args={[0.185, 24, 12, -1.0, 2.0, 1.1, 0.9]} />
              </mesh>
              <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.accent}>
                <torusGeometry args={[0.2, 0.012, 6, 24, Math.PI]} />
              </mesh>
            </group>
          )}
          {c.headGear === 'crown' && (
            <group ref={crown} position={[0, 0.3, 0]}>
              {Array.from({ length: 5 }, (_, i) => {
                const a = (i / 5) * Math.PI * 2
                return (
                  <mesh key={i} position={[Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15]} material={m.accent}>
                    <coneGeometry args={[0.03, 0.1, 4]} />
                  </mesh>
                )
              })}
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} material={m.accent}>
                <torusGeometry args={[0.15, 0.01, 6, 30]} />
              </mesh>
            </group>
          )}
          {c.headGear === 'neon-visor' && (
            <group position={[0, 0.02, 0]}>
              <mesh material={m.accentSoft}>
                <cylinderGeometry args={[0.185, 0.185, 0.09, 24, 1, true, -1.1, 2.2]} />
              </mesh>
              <mesh position={[0, 0.048, 0]} material={m.accent}>
                <cylinderGeometry args={[0.186, 0.186, 0.01, 24, 1, true, -1.1, 2.2]} />
              </mesh>
              <mesh position={[0, -0.048, 0]} material={m.accent}>
                <cylinderGeometry args={[0.186, 0.186, 0.01, 24, 1, true, -1.1, 2.2]} />
              </mesh>
            </group>
          )}
        </group>
      </group>
    </group>
  )
}

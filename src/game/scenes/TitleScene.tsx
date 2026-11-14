import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, PerspectiveCamera } from 'three'
import { GridFloor } from '../world/common/GridFloor'
import { Particles } from '../world/common/Particles'
import { Skyline } from '../world/common/Skyline'
import { SkyDome } from '../world/common/SkyDome'
import { neonMaterial } from '../world/common/materials'

export const titleWarp = { active: false, startedAt: 0 }

/** Cinematic backdrop for the title: a camera drifting over the grid toward a giant portal. Warps on start. */
export function TitleScene() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const rings = useRef<Group>(null)
  const t0 = useRef<number | null>(null)
  useFrame((s, dt) => {
    if (t0.current === null) t0.current = s.clock.elapsedTime
    const t = s.clock.elapsedTime - t0.current
    let z = 60 - Math.min(t, 12) * 1.5
    let fov = 60
    if (titleWarp.active) {
      const w = (performance.now() - titleWarp.startedAt) / 1000
      z -= w * w * 60
      fov = 60 + Math.min(1, w) * 45
    }
    camera.position.set(Math.sin(t * 0.15) * 3, 4 + Math.sin(t * 0.3) * 0.5, z)
    camera.lookAt(0, 9, -120)
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    if (rings.current) rings.current.children.forEach((c, i) => (c.rotation.z += dt * (0.3 + i * 0.1) * (i % 2 ? 1 : -1)))
  })
  return (
    <>
      <color attach="background" args={['#05010f']} />
      <fog attach="fog" args={['#0a0420', 60, 320]} />
      <SkyDome top="#03000a" horizon="#4a0f80" bottom="#05010f" />
      <GridFloor size={800} fade={320} scroll={6} />
      <Skyline count={200} inner={60} outer={260} seed={3} fogFar={320} />
      <Particles count={600} area={[160, 40, 260]} center={[0, 0, -40]} />
      <group ref={rings} position={[0, 18, -120]}>
        {[16, 20, 25].map((r, i) => (
          <mesh key={r} material={neonMaterial(['#00f0ff', '#ff2bd6', '#9d4dff'][i], 3)}>
            <torusGeometry args={[r, 0.25, 8, 96, Math.PI * (1.4 + i * 0.2)]} />
          </mesh>
        ))}
        <mesh position={[0, 0, -2]} material={neonMaterial('#ffffff', 1.5)}>
          <circleGeometry args={[4, 48]} />
        </mesh>
      </group>
    </>
  )
}

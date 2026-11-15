import { Color, ShaderMaterial } from 'three'

const cache = new Map<string, ShaderMaterial>()

/** World-space window grid for hero buildings (one shader per tint, shared). */
export function towerMaterial(tint: string, lit = 0.6) {
  const key = `${tint}:${lit}`
  let m = cache.get(key)
  if (!m) {
    m = new ShaderMaterial({
      uniforms: { uTint: { value: new Color(tint) }, uLit: { value: lit }, uTime: { value: 0 } },
      vertexShader: /* glsl */ `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTint; uniform float uLit; varying vec3 vW; varying vec3 vN;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){
          vec3 c = vec3(0.025, 0.02, 0.05) + uTint * 0.04;
          if (abs(vN.y) < 0.5) {
            float u = abs(vN.x) > 0.5 ? vW.z : vW.x;
            vec2 cell = floor(vec2(u / 1.6, vW.y / 2.0));
            vec2 f = fract(vec2(u / 1.6, vW.y / 2.0));
            float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.25, f.y) * step(f.y, 0.8);
            float on = step(1.0 - uLit, hash(cell + floor(vW.xz * 0.01)));
            c += win * on * mix(vec3(1.0, 0.82, 0.55), uTint, 0.5) * 0.85;
          } else c += uTint * 0.08;
          gl_FragColor = vec4(c, 1.0);
        }`,
    })
    cache.set(key, m)
  }
  return m
}

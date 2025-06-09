import * as THREE from 'three'
import { extend, ReactThreeFiber } from '@react-three/fiber'

interface DofPointsMaterialUniforms {
  positions: { value: THREE.Texture | null }
  uTime: { value: number }
  uFocus: { value: number }
  uFov: { value: number }
  uBlur: { value: number }
}

class DofPointsMaterial extends THREE.ShaderMaterial {
  uniforms: DofPointsMaterialUniforms

  constructor() {
    const uniforms: DofPointsMaterialUniforms = {
      positions: { value: null },
      uTime: { value: 0 },
      uFocus: { value: 5.1 },
      uFov: { value: 50 },
      uBlur: { value: 30 }
    }

    super({
      vertexShader: `
        uniform sampler2D positions;
        uniform float uTime;
        uniform float uFocus;
        uniform float uFov;
        uniform float uBlur;
        varying float vDistance;
        void main() { 
          vec3 pos = texture2D(positions, position.xy).xyz;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          vDistance = abs(uFocus - -mvPosition.z);
          gl_PointSize = (step(1.0 - (1.0 / uFov), position.x)) * vDistance * uBlur * 2.0;
        }`,
      fragmentShader: `
        varying float vDistance;
        void main() {
          vec2 cxy = 2.0 * gl_PointCoord - 1.0;
          if (dot(cxy, cxy) > 1.0) discard;
          gl_FragColor = vec4(vec3(1.0), (1.04 - clamp(vDistance * 1.5, 0.0, 1.0)));
        }`,
      uniforms,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    })

    this.uniforms = uniforms
  }
}

extend({ DofPointsMaterial })

declare global {
  namespace JSX {
    interface IntrinsicElements {
      dofPointsMaterial: ReactThreeFiber.Node<DofPointsMaterial, typeof DofPointsMaterial>
    }
  }
}

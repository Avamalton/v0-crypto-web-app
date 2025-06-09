// File: components/Particles.tsx
import * as THREE from 'three'
import { useMemo, useRef, useState } from 'react'
import { useFrame, createPortal, extend } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import simulationVertex from '../shaders/simulationVertex.glsl'
import simulationFragment from '../shaders/simulationFragment.glsl'
import dofVertex from '../shaders/dofVertex.glsl'
import dofFragment from '../shaders/dofFragment.glsl'

class SimulationMaterial extends THREE.ShaderMaterial {
  constructor() {
    const positionsTexture = new THREE.DataTexture(
      getSphere(512 * 512, 128),
      512,
      512,
      THREE.RGBAFormat,
      THREE.FloatType
    )
    positionsTexture.needsUpdate = true

    super({
      vertexShader: simulationVertex,
      fragmentShader: simulationFragment,
      uniforms: {
        positions: { value: positionsTexture },
        uTime: { value: 0 },
        uCurlFreq: { value: 0.25 }
      }
    })
  }
}

class DofPointsMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      vertexShader: dofVertex,
      fragmentShader: dofFragment,
      uniforms: {
        positions: { value: null },
        uTime: { value: 0 },
        uFocus: { value: 5.1 },
        uFov: { value: 50 },
        uBlur: { value: 30 }
      },
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    })
  }
}

extend({ SimulationMaterial, DofPointsMaterial })

function getPoint(v: THREE.Vector3, size: number, data: Float32Array, offset: number) {
  v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
  if (v.length() > 1) return getPoint(v, size, data, offset)
  return v.normalize().multiplyScalar(size).toArray(data, offset)
}

function getSphere(count: number, size: number, p = new THREE.Vector3()) {
  const data = new Float32Array(count * 4)
  for (let i = 0; i < count * 4; i += 4) getPoint(p, size, data, i)
  return data
}

export function Particles({ speed, fov, aperture, focus, curl, size = 512, ...props }) {
  const simRef = useRef<any>()
  const renderRef = useRef<any>()
  const [scene] = useState(() => new THREE.Scene())
  const [camera] = useState(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1))
  const [positions] = useState(() => new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]))
  const [uvs] = useState(() => new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]))
  const target = useFBO(size, size, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType
  })

  const particles = useMemo(() => {
    const length = size * size
    const particles = new Float32Array(length * 3)
    for (let i = 0; i < length; i++) {
      let i3 = i * 3
      particles[i3 + 0] = (i % size) / size
      particles[i3 + 1] = i / size / size
    }
    return particles
  }, [size])

  useFrame((state) => {
    state.gl.setRenderTarget(target)
    state.gl.clear()
    state.gl.render(scene, camera)
    state.gl.setRenderTarget(null)

    if (renderRef.current?.uniforms) {
      renderRef.current.uniforms.positions.value = target.texture
      renderRef.current.uniforms.uTime.value = state.clock.elapsedTime
      renderRef.current.uniforms.uFocus.value = THREE.MathUtils.lerp(renderRef.current.uniforms.uFocus.value, focus, 0.1)
      renderRef.current.uniforms.uFov.value = THREE.MathUtils.lerp(renderRef.current.uniforms.uFov.value, fov, 0.1)
      renderRef.current.uniforms.uBlur.value = THREE.MathUtils.lerp(renderRef.current.uniforms.uBlur.value, (5.6 - aperture) * 9, 0.1)
    }

    if (simRef.current?.uniforms) {
      simRef.current.uniforms.uTime.value = state.clock.elapsedTime * speed
      simRef.current.uniforms.uCurlFreq.value = THREE.MathUtils.lerp(simRef.current.uniforms.uCurlFreq.value, curl, 0.1)
    }
  })

  return (
    <>
      {createPortal(
        <mesh>
          <simulationMaterial ref={simRef} />
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
            <bufferAttribute attach="attributes-uv" count={uvs.length / 2} array={uvs} itemSize={2} />
          </bufferGeometry>
        </mesh>,
        scene
      )}

      <points {...props}>
        <dofPointsMaterial ref={renderRef} />
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={particles.length / 3} array={particles} itemSize={3} />
        </bufferGeometry>
      </points>
    </>
  )
}

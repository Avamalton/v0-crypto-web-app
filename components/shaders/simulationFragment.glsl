// File: components/shaders/simulationFragment.glsl
uniform sampler2D positions;
uniform float uTime;
uniform float uCurlFreq;
varying vec2 vUv;

// Replace with your own curl + noise if needed
vec3 curl(vec3 p) {
  return vec3(
    sin(p.y + uTime),
    cos(p.z + uTime),
    sin(p.x + uTime)
  );
}

float noise(vec3 p) {
  return fract(sin(dot(p.xyz, vec3(12.9898, 78.233, 54.53))) * 43758.5453);
}

void main() {
  float t = uTime * 0.015;
  vec3 pos = texture2D(positions, vUv).rgb;
  vec3 curlPos = pos;

  curlPos += curl(curlPos * uCurlFreq + t) * 0.5;
  curlPos += curl(curlPos * uCurlFreq * 2.0) * 0.25;
  curlPos += curl(curlPos * uCurlFreq * 4.0) * 0.125;
  curlPos += curl(pos * uCurlFreq * 8.0) * 0.0625;

  gl_FragColor = vec4(mix(pos, curlPos, noise(pos + t)), 1.0);
}

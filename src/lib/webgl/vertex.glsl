attribute vec2 uv;
attribute vec3 position;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uDistortion;
uniform float uAspect;

varying vec2 vUv;

void main() {
  vUv = uv;

  // Kissenverzeichnung auf dem Raster als Ganzes: jeder Vertex wird nach seiner
  // Lage im Bildraum verschoben, nicht nach seiner Lage in der Kachel.
  // d ist auf 1.0 in der Bildecke normiert, damit der Effekt vom Seitenverhältnis
  // unabhängig bleibt. Die Umkehrung dieser Formel steckt in screenToWorld().
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec2 ndc = clip.xy / clip.w;
  float d = length(ndc * vec2(uAspect, 1.0)) / length(vec2(uAspect, 1.0));
  clip.xy = ndc * (1.0 + uDistortion * d * d) * clip.w;

  gl_Position = clip;
}

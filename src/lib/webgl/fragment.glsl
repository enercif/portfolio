precision highp float;

uniform sampler2D tMap;

varying vec2 vUv;

/** Eckenradius als Anteil der Kachelkante – wächst also mit der Kachel mit. */
const float RADIUS = 0.05;
/** Weichzeichnung der Kante, ebenfalls in UV. Ersetzt fwidth(). */
const float EDGE = 0.004;

void main() {
  // Signierte Distanz zur abgerundeten Kachelkante, negativ innerhalb.
  vec2 q = abs(vUv - 0.5) - 0.5 + RADIUS;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - RADIUS;

  gl_FragColor = vec4(texture2D(tMap, vUv).rgb, 1.0 - smoothstep(-EDGE, EDGE, d));
}

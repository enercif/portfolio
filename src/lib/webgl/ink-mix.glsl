uniform sampler2D tInk;
uniform sampler2D tOver;
uniform sampler2D tUnder;
uniform vec2 uCoverOver;
uniform vec2 uCoverUnder;
uniform float uAspect;

varying vec2 vUv;

/** Videoformat auf das Canvas zuschneiden – das object-cover des Shaders. */
vec2 cover(vec2 uv, vec2 scale) {
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  float ink = texture2D(tInk, vUv).r;

  // Kante aufrauen, bevor geschnitten wird: die Grenze franst in Fasern aus.
  // Zwei Frequenzen, damit sie weder wie ein Raster noch wie Rauschen wirkt.
  vec2 p = vUv * vec2(uAspect, 1.0);
  ink += (noise(p * 22.0) - 0.5) * 0.17 + (noise(p * 70.0) - 0.5) * 0.06;

  // Schmaler Uebergang: Tinte hat eine Kante, keinen Verlauf.
  float m = smoothstep(0.3, 0.38, ink);

  vec3 over = texture2D(tOver, cover(vUv, uCoverOver)).rgb;
  vec3 under = texture2D(tUnder, cover(vUv, uCoverUnder)).rgb;

  gl_FragColor = vec4(mix(over, under, m), 1.0);
}

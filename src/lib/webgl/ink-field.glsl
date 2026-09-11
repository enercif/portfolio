uniform sampler2D tPrev;
uniform vec2 uTexel;
uniform float uAspect;
/** xy = Position in UV, z = Radius, w = Menge. */
uniform vec4 uSplats[MAX_SPLATS];
uniform int uCount;
uniform float uDecay;

varying vec2 vUv;

void main() {
  float c = texture2D(tPrev, vUv).r;

  // Saugen statt Verwischen: pro Pixel zieht die Faser in eine andere Richtung,
  // und der Nachbarwert wird uebernommen, wenn er groesser ist. Dadurch frisst
  // sich die Kante in Auslaeufern weiter, statt rund zu verlaufen.
  float angle = noise(vUv * vec2(uAspect, 1.0) * 14.0) * 6.2831853;
  vec2 fibre = vec2(cos(angle), sin(angle)) * uTexel * 1.7;
  vec2 across = vec2(fibre.y, -fibre.x);

  float bleed = max(
    max(texture2D(tPrev, vUv + fibre).r, texture2D(tPrev, vUv - fibre).r),
    max(texture2D(tPrev, vUv + across).r, texture2D(tPrev, vUv - across).r)
  );

  // Knapp unter dem Nachbarwert: die Tinte kriecht pro Frame ein Stueck weiter
  // und kommt von selbst zum Stehen, sobald sie unter die Schwelle faellt.
  float v = max(c, bleed * (0.93 + noise(vUv * 55.0) * 0.055)) * uDecay;

  vec2 p = vUv * vec2(uAspect, 1.0);
  for (int i = 0; i < MAX_SPLATS; i++) {
    if (i >= uCount) break;
    vec4 s = uSplats[i];
    float d = distance(p, s.xy * vec2(uAspect, 1.0));
    // Rauschen im Klecks selbst: kein Kreis, sondern ein Spritzer.
    v += s.w * smoothstep(s.z, 0.0, d) * (0.6 + noise(p * 26.0) * 0.8);
  }

  gl_FragColor = vec4(min(v, 1.0), 0.0, 0.0, 1.0);
}

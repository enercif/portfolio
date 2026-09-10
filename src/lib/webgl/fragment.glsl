precision highp float;

uniform sampler2D tMap;
uniform float uHover;

varying vec2 vUv;

void main() {
  vec3 color = texture2D(tMap, vUv).rgb;
  float grey = dot(color, vec3(0.2126, 0.7152, 0.0722));

  // Grau ist der Ruhezustand, Farbe gibt es nur am Fokuspunkt.
  gl_FragColor = vec4(mix(vec3(grey) * 0.55, color, uHover), 1.0);
}

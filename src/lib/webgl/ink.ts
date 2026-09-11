import field from '$lib/webgl/ink-field.glsl?raw';
import mix from '$lib/webgl/ink-mix.glsl?raw';
import noise from '$lib/webgl/ink-noise.glsl?raw';
import quad from '$lib/webgl/ink-quad.glsl?raw';
import gsap from 'gsap';
import { Mesh, Program, RenderTarget, Renderer, Texture, Triangle } from 'ogl';

/** Obergrenze der Kleckse pro Frame, wird als #define in den Shader gereicht. */
const MAX_SPLATS = 12;
/** Anteil, der pro 60stel Sekunde stehen bleibt – bestimmt die Verweildauer. */
const DECAY = 0.9915;
/** Simulation läuft auf halber Auflösung: billiger und von Haus aus weicher. */
const SIM_SCALE = 0.33;
/** Radius des Klecks unter dem Zeiger, in Bildhöhen. */
const RADIUS = 0.1;
const AMOUNT = 0.42;
/** Um wie viele Frames der Zeiger vorausgerechnet wird. */
const LEAD = 1.5;
/** Wie stark ein Tropfen pro Frame abgebremst wird. */
const DRAG = 0.93;
/** Ruhe in ms, nach der die Tinte von selbst weiterzeichnet. */
const IDLE = 4000;

/** Haelt einen Strich vom Rand weg, sonst zeichnet die Automatik ins Nichts. */
const inside = gsap.utils.clamp(0.12, 0.88);

type Drop = { x: number; y: number; vx: number; vy: number; radius: number; life: number };
/** Ein automatischer Strich als quadratische Bezierkurve a -> c -> b. */
type Stroke = {
	ax: number;
	ay: number;
	bx: number;
	by: number;
	cx: number;
	cy: number;
	t: number;
	speed: number;
};

export function newStroke(random = Math.random): Stroke {
	const ax = inside(random());
	const ay = inside(random());
	const angle = random() * Math.PI * 2;
	const length = 0.3 + random() * 0.4;
	const bx = inside(ax + Math.cos(angle) * length);
	const by = inside(ay + Math.sin(angle) * length);
	// Kontrollpunkt quer zur Strecke versetzt: aus der Geraden wird ein Schwung.
	const bend = (random() - 0.5) * 0.5;
	return {
		ax,
		ay,
		bx,
		by,
		cx: (ax + bx) / 2 - (by - ay) * bend,
		cy: (ay + by) / 2 + (bx - ax) * bend,
		t: 0,
		speed: 0.012 + random() * 0.01
	};
}

/** Punkt auf dem Strich, weich an- und abschwellend statt mit voller Fahrt. */
export function strokeAt(s: Stroke, t: number) {
	const e = t * t * (3 - 2 * t);
	const u = 1 - e;
	return {
		x: u * u * s.ax + 2 * u * e * s.cx + e * e * s.bx,
		y: u * u * s.ay + 2 * u * e * s.cy + e * e * s.by
	};
}

/** Sichtfeld der Videotextur, damit sie das Canvas füllt statt zu verzerren. */
function cover(video: HTMLVideoElement, aspect: number) {
	const ratio = aspect / (video.videoWidth / video.videoHeight || 1);
	return ratio > 1 ? [1, 1 / ratio] : [ratio, 1];
}

/**
 * Blendet `under` dort ein, wo der Zeiger Tinte hinterlassen hat: ein Feld, das
 * jeden Frame ein Stück weiter ins Papier zieht und langsam abklingt. Gibt die
 * Aufräumfunktion zurück.
 */
export function createInk(
	canvas: HTMLCanvasElement,
	container: HTMLElement,
	over: HTMLVideoElement,
	under: HTMLVideoElement
) {
	const renderer = new Renderer({ canvas, dpr: Math.min(window.devicePixelRatio, 2) });
	const gl = renderer.gl;
	const geometry = new Triangle(gl);

	const tOver = new Texture(gl, { generateMipmaps: false });
	const tUnder = new Texture(gl, { generateMipmaps: false });

	// Bewusst ein echtes Array: ogl erkennt Array-Uniforms über Array.isArray
	// und lädt eine Float32Array hier stillschweigend nicht hoch.
	const uSplats = { value: new Array(MAX_SPLATS * 4).fill(0) as number[] };
	const uCount = { value: 0 };
	const uDecay = { value: DECAY };
	const uAspect = { value: 1 };
	const uTexel = { value: new Float32Array([0, 0]) };
	const uCoverOver = { value: new Float32Array([1, 1]) };
	const uCoverUnder = { value: new Float32Array([1, 1]) };

	const fieldPass = new Mesh(gl, {
		geometry,
		program: new Program(gl, {
			vertex: quad,
			fragment: `#define MAX_SPLATS ${MAX_SPLATS}\n` + noise + field,
			depthTest: false,
			uniforms: { tPrev: { value: null }, uTexel, uAspect, uSplats, uCount, uDecay }
		})
	});

	const mixPass = new Mesh(gl, {
		geometry,
		program: new Program(gl, {
			vertex: quad,
			fragment: noise + mix,
			depthTest: false,
			uniforms: {
				tInk: { value: null },
				tOver: { value: tOver },
				tUnder: { value: tUnder },
				uCoverOver,
				uCoverUnder,
				uAspect
			}
		})
	});

	// Video, Textur und Sichtfeld-Uniform gehören zusammen - frame() läuft nur durch.
	const sources = [
		{ video: over, texture: tOver, uCover: uCoverOver },
		{ video: under, texture: tUnder, uCover: uCoverUnder }
	];

	// Ping-Pong: ein Ziel hält den letzten Zustand, ins andere wird geschrieben.
	let ink: RenderTarget[] = [];

	function resize() {
		const width = container.clientWidth;
		const height = container.clientHeight;
		if (!width || !height) return;

		renderer.setSize(width, height);
		uAspect.value = width / height;

		const w = Math.max(64, Math.round(width * SIM_SCALE));
		const h = Math.max(64, Math.round(height * SIM_SCALE));
		// Neue Ziele heissen: die Tinte ist weg. Darum nur, wenn die Simulation
		// wirklich anders groß wird - der Observer feuert beim Ziehen am
		// Fensterrand pro Frame und würde die Tinte sonst dauernd löschen.
		if (ink[0]?.width === w && ink[0]?.height === h) return;

		for (const target of ink) {
			gl.deleteFramebuffer(target.buffer);
			gl.deleteTexture(target.texture.texture); // ogl räumt die Textur nicht mit ab
		}
		ink = [0, 1].map(() => new RenderTarget(gl, { width: w, height: h, depth: false }));
		uTexel.value.set([1 / w, 1 / h]);
	}

	let pending = 0;

	function splat(x: number, y: number, radius: number, amount: number) {
		if (pending >= MAX_SPLATS) return;
		const i = pending++ * 4;
		uSplats.value[i] = x;
		uSplats.value[i + 1] = y;
		uSplats.value[i + 2] = radius;
		uSplats.value[i + 3] = amount;
	}

	// Zeiger in UV, dazu die geglättete Geschwindigkeit in UV pro Frame.
	const pointer = { x: 0, y: 0, vx: 0, vy: 0 };
	let previous: { x: number; y: number; t: number } | null = null;
	let moved = false;
	const drops: Drop[] = [];

	function at(e: PointerEvent) {
		const rect = container.getBoundingClientRect();
		return {
			x: (e.clientX - rect.left) / rect.width,
			y: 1 - (e.clientY - rect.top) / rect.height
		};
	}

	/** Neuer Kontakt: ohne das rechnet der erste Move nach einem Fingerwechsel
	 *  die Strecke zwischen zwei Tippern als Geschwindigkeit. */
	function onDown(e: PointerEvent) {
		const { x, y } = at(e);
		previous = { x, y, t: e.timeStamp };
		pointer.x = x;
		pointer.y = y;
		pointer.vx = 0;
		pointer.vy = 0;
		moved = true;
	}

	function onLift() {
		previous = null;
		pointer.vx = 0;
		pointer.vy = 0;
	}

	function onMove(e: PointerEvent) {
		const { x, y } = at(e);
		if (x < 0 || x > 1 || y < 0 || y > 1) return onLift();

		const now = e.timeStamp;
		if (previous) {
			const step = Math.max(1, now - previous.t);
			// Geglättet, sonst schleudert ein einzelner Ruck alles quer über das Bild.
			pointer.vx += ((x - previous.x) * (16.667 / step) - pointer.vx) * 0.4;
			pointer.vy += ((y - previous.y) * (16.667 / step) - pointer.vy) * 0.4;
		}
		previous = { x, y, t: now };
		pointer.x = x;
		pointer.y = y;
		moved = true;
	}

	let idle = 0;
	let stroke: Stroke | null = null;
	let gap = 0;

	/** Zeichnet ohne Zeiger weiter, damit das Bild in Ruhe nicht tot daliegt. */
	function autoDraw(step: number) {
		if (!stroke) {
			gap -= step;
			if (gap > 0) return;
			stroke = newStroke();
			// Am Anfang aufsetzen statt vom letzten Zeigerpunkt herzuschleudern.
			pointer.x = stroke.ax;
			pointer.y = stroke.ay;
			pointer.vx = 0;
			pointer.vy = 0;
		}

		stroke.t += stroke.speed * step;
		if (stroke.t >= 1) {
			stroke = null;
			gap = 100 + Math.random() * 100; // Frames Pause bis zum naechsten Strich
			return onLift();
		}

		const { x, y } = strokeAt(stroke, stroke.t);
		pointer.vx = x - pointer.x;
		pointer.vy = y - pointer.y;
		pointer.x = x;
		pointer.y = y;
		moved = true;
	}

	function emit() {
		const speed = Math.hypot(pointer.vx, pointer.vy);

		// Vorhalten: der Klecks sitzt dort, wo der Zeiger gleich sein wird, nicht
		// wo er war. Das ist der Grund, warum die Tinte der Bewegung vorausläuft.
		const x = pointer.x + pointer.vx * LEAD;
		const y = pointer.y + pointer.vy * LEAD;
		splat(x, y, RADIUS + speed * 0.6, AMOUNT);
		// Zwischenschritt, damit bei schnellen Strichen keine Lücke entsteht.
		splat(pointer.x + pointer.vx * LEAD * 0.5, pointer.y + pointer.vy * LEAD * 0.5, RADIUS, AMOUNT);

		// Abgeschleudert: schnelle Bewegung wirft Tropfen mit eigenem Impuls nach
		// vorn, die noch fliegen, wenn der Zeiger längst steht.
		const count = Math.min(3, Math.floor(speed * 24));
		for (let i = 0; i < count; i++) {
			const spread = (Math.random() - 0.5) * 0.7;
			drops.push({
				x,
				y,
				vx: pointer.vx * (1.1 + Math.random()) + pointer.vy * spread,
				vy: pointer.vy * (1.1 + Math.random()) - pointer.vx * spread,
				radius: RADIUS * (0.3 + Math.random() * 0.5),
				life: 1
			});
		}
	}

	function frame(_time: number, delta: number) {
		if (!ink.length) return;
		const step = delta / 16.667;

		for (const { video, texture, uCover } of sources) {
			if (video.readyState >= 2) {
				texture.image = video;
				texture.needsUpdate = true;
			}
			// Jeden Frame: videoWidth steht erst nach den Metadaten, und das Format
			// kann beim Loop-Wechsel wechseln.
			uCover.value.set(cover(video, uAspect.value));
		}

		if (moved) {
			// Echte Eingabe schlaegt die Automatik und bricht den laufenden Strich ab.
			idle = 0;
			stroke = null;
		} else {
			idle += delta;
			if (idle > IDLE) autoDraw(step);
		}

		if (moved) emit();
		moved = false;

		for (let i = drops.length - 1; i >= 0; i--) {
			const drop = drops[i];
			drop.x += drop.vx * step;
			drop.y += drop.vy * step;
			drop.vx *= DRAG ** step;
			drop.vy *= DRAG ** step;
			drop.life -= 0.035 * step;
			if (drop.life <= 0) {
				drops.splice(i, 1);
				continue;
			}
			splat(drop.x, drop.y, drop.radius * drop.life, AMOUNT * 0.9);
		}

		// Abklingen an die echte Bildrate koppeln, sonst verschwindet die Tinte
		// auf einem 120-Hz-Schirm doppelt so schnell.
		uDecay.value = DECAY ** step;
		uCount.value = pending;

		fieldPass.program.uniforms.tPrev.value = ink[0].texture;
		renderer.render({ scene: fieldPass, target: ink[1] });
		ink.reverse();

		mixPass.program.uniforms.tInk.value = ink[0].texture;
		renderer.render({ scene: mixPass });

		pending = 0;
	}

	const observer = new ResizeObserver(resize);
	observer.observe(container);

	const pointers = new AbortController();
	const { signal } = pointers;
	container.addEventListener('pointermove', onMove, { signal });
	container.addEventListener('pointerdown', onDown, { signal });
	container.addEventListener('pointerup', onLift, { signal });
	container.addEventListener('pointercancel', onLift, { signal });
	container.addEventListener('pointerleave', onLift, { signal });
	gsap.ticker.add(frame);

	return () => {
		gsap.ticker.remove(frame);
		pointers.abort();
		observer.disconnect();
		gl.getExtension('WEBGL_lose_context')?.loseContext();
	};
}

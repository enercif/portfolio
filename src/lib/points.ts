type Dot = { ox: number; oy: number; x: number; y: number; sx: number; sy: number; delay: number };

const GAP = 6; // Abtastraster in CSS-Pixeln
const FONT = 'ui-sans-serif, system-ui, sans-serif';

/** Zeichnet `text` als Punktwolke: baut sich auf, pulst, weicht dem Zeiger im Kreis aus. */
export function createPoints(canvas: HTMLCanvasElement, text: string) {
	const ctx = canvas.getContext('2d')!;
	const buf = document.createElement('canvas');
	const bctx = buf.getContext('2d', { willReadFrequently: true })!;
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

	const pointer = { x: -1e4, y: -1e4 };
	let dots: Dot[] = [];
	let w = 0;
	let h = 0;
	let repel = 0;
	let t0 = performance.now();
	let raf = 0;

	function build() {
		const settled = dots.length > 0; // nach dem Intro nicht neu einfliegen lassen
		w = canvas.clientWidth;
		h = canvas.clientHeight;
		const dpr = Math.min(devicePixelRatio || 1, 2);
		canvas.width = w * dpr;
		canvas.height = h * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		repel = Math.min(110, w * 0.16); // am Handy deutlich kleiner als der Mauszeiger-Kreis
		buf.width = w;
		buf.height = h;
		bctx.textAlign = 'center';
		bctx.textBaseline = 'middle';
		bctx.fillStyle = '#fff';
		bctx.font = `700 100px ${FONT}`;
		const size = Math.min(((w * 0.82) / bctx.measureText(text).width) * 100, h * 0.26);
		bctx.font = `700 ${size}px ${FONT}`;
		bctx.fillText(text, w / 2, h / 2);

		const px = bctx.getImageData(0, 0, w, h).data;
		const a = Math.max(w, h) * 0.7;
		dots = [];
		for (let y = 0; y < h; y += GAP)
			for (let x = 0; x < w; x += GAP) {
				if (px[(y * w + x) * 4 + 3] < 128) continue;
				const angle = Math.random() * Math.PI * 2;
				const sx = settled || reduce ? x : w / 2 + Math.cos(angle) * a;
				const sy = settled || reduce ? y : h / 2 + Math.sin(angle) * a;
				dots.push({ ox: x, oy: y, x: sx, y: sy, sx, sy, delay: settled ? 0 : Math.random() * 0.6 });
			}
	}

	function frame(now: number) {
		const t = (now - t0) / 1000;
		const cx = w / 2;
		const cy = h / 2;
		ctx.clearRect(0, 0, w, h);
		// billiger als getComputedStyle pro Frame
		ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#fff' : '#000';

		for (const p of dots) {
			const dx0 = p.ox - cx;
			const dy0 = p.oy - cy;
			// Puls laeuft als Welle von der Mitte nach aussen
			const pulse = reduce ? 1 : 1 + Math.sin(t * 1.8 - Math.hypot(dx0, dy0) * 0.012) * 0.02;
			let tx = cx + dx0 * pulse;
			let ty = cy + dy0 * pulse;

			const e = reduce ? 1 : 1 - Math.pow(1 - Math.min(Math.max((t - p.delay) / 1.2, 0), 1), 3);
			tx = p.sx + (tx - p.sx) * e;
			ty = p.sy + (ty - p.sy) * e;

			const dx = tx - pointer.x;
			const dy = ty - pointer.y;
			const d = Math.hypot(dx, dy);
			if (d < repel) {
				const f = ((repel - d) / repel) * repel;
				tx += (dx / (d || 1)) * f;
				ty += (dy / (d || 1)) * f;
			}

			p.x += (tx - p.x) * 0.18;
			p.y += (ty - p.y) * 0.18;
			ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
		}
		raf = requestAnimationFrame(frame);
	}

	const onmove = (e: PointerEvent) => {
		const r = canvas.getBoundingClientRect();
		pointer.x = e.clientX - r.left;
		pointer.y = e.clientY - r.top;
	};
	const onleave = () => {
		pointer.x = pointer.y = -1e4;
	};
	// Touch feuert kein pointerleave: ohne up/cancel bliebe das Loch stehen, wo der Finger war.
	// Die Maus bleibt nach einem Klick liegen, die darf das Loch behalten.
	const onup = (e: PointerEvent) => e.pointerType !== 'mouse' && onleave();

	const ro = new ResizeObserver(build);
	ro.observe(canvas);
	window.addEventListener('pointermove', onmove);
	window.addEventListener('pointerleave', onleave);
	window.addEventListener('pointerup', onup);
	window.addEventListener('pointercancel', onup);
	raf = requestAnimationFrame(frame);

	return () => {
		cancelAnimationFrame(raf);
		ro.disconnect();
		window.removeEventListener('pointermove', onmove);
		window.removeEventListener('pointerleave', onleave);
		window.removeEventListener('pointerup', onup);
		window.removeEventListener('pointercancel', onup);
	};
}

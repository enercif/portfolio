/**
 * Selbsttest der Rastermathematik, läuft in `npm run check`.
 *
 * Kernaussage: jede sichtbare Kachelmitte muss durch die Linsenverzerrung hin
 * und über screenToWorld() wieder zurück auf ihre eigene Kachel zeigen. Bricht
 * das, klickt man auf dem Raster daneben – und zwar erst am Bildrand, wo es
 * beim Ausprobieren niemand merkt.
 */
import assert from 'node:assert/strict';
import {
	COLS,
	fitCount,
	gapSize,
	projectAt,
	projectRows,
	tileAt,
	tilePosition,
	tileSize,
	type GridView
} from './grid-math.ts';

/** Projektzahl wie in Directus – die Naht muss für jede aufgehen, auch krumme. */
const COUNT = 12;
const ROWS = projectRows(COUNT);

/** Der Vertex-Shader in JS: Weltpixel -> Pixel im Container. */
function worldToScreen(view: GridView, x: number, y: number) {
	const sx = x / (view.width / 2);
	const sy = y / (view.height / 2);
	const aspect = view.width / view.height;
	const d = Math.hypot(sx * aspect, sy) / Math.hypot(aspect, 1);
	const f = 1 + view.distortion * d * d;
	return { px: ((sx * f + 1) / 2) * view.width, py: ((1 - sy * f) / 2) * view.height };
}

function check(width: number, height: number) {
	const tile = tileSize(width);
	const spacing = tile + gapSize(tile);
	const view: GridView = {
		count: COUNT,
		width,
		height,
		tile,
		spacing,
		cols: fitCount(width, spacing, COLS),
		rows: fitCount(height, spacing, ROWS),
		dragX: 0,
		dragY: 0,
		distortion: 0.2
	};

	assert.ok(view.cols * spacing > width && view.rows * spacing > height, 'Raster deckt nicht');

	// Ein Schritt um genau ein Projektraster muss dasselbe Projekt zeigen – auch
	// über die Modulo-Kante hinweg, sonst bricht das Muster beim Umbrechen ab.
	for (let row = 0; row < view.rows; row++) {
		for (let col = 0; col < view.cols; col++) {
			const here = projectAt(view, row * view.cols + col);
			const right = projectAt(view, row * view.cols + ((col + COLS) % view.cols));
			const below = projectAt(view, ((row + ROWS) % view.rows) * view.cols + col);
			assert.equal(right, here, `Naht in Spalte ${col} bei ${width}x${height}`);
			assert.equal(below, here, `Naht in Zeile ${row} bei ${width}x${height}`);
		}
	}

	let hits = 0;
	for (const distortion of [0, 0.2, 0.45]) {
		for (const [dragX, dragY] of [
			[0, 0],
			[137, -412],
			[-9999, 7777]
		]) {
			Object.assign(view, { distortion, dragX, dragY });

			for (let i = 0; i < view.cols * view.rows; i++) {
				const { x, y } = tilePosition(view, i);
				const where = `${width}x${height}, k=${distortion}, drag ${dragX}/${dragY}, Kachel ${i}`;

				const center = worldToScreen(view, x, y);
				if (!onScreen(view, center)) continue; // Kachel liegt außerhalb des Bildes
				assert.equal(tileAt(view, center.px, center.py), i, `Mitte trifft daneben: ${where}`);
				hits++;

				// Und die Lücke rechts daneben darf gar nichts treffen.
				const gap = worldToScreen(view, x + spacing / 2, y);
				if (onScreen(view, gap)) {
					assert.equal(tileAt(view, gap.px, gap.py), -1, `Gap trifft eine Kachel: ${where}`);
				}
			}
		}
	}

	assert.ok(hits > 2, `zu wenig sichtbare Kacheln geprüft: ${hits}`);
	console.log(
		`${width}x${height}: ${view.cols}x${view.rows} Kacheln à ${tile}px, ${hits} Treffer ok`
	);
}

const onScreen = (view: GridView, p: { px: number; py: number }) =>
	p.px >= 0 && p.px <= view.width && p.py >= 0 && p.py <= view.height;

check(1920, 1080);
check(375, 812);

// Breite 0 (verstecktes Layout) darf keine Division durch 0 und damit kein
// `new Array(NaN)` im Aufbau erzeugen.
assert.ok(tileSize(0) > 0);

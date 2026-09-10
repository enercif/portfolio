/**
 * Die Mathematik des Rasters: Kachelpositionen, die Linsenverzerrung und ihre
 * Umkehrung für den Hit-Test. Bewusst frei von WebGL, DOM und gsap, damit
 * grid-math.check.ts sie ohne Browser durchrechnen kann.
 */

/** Spalten des Projektrasters; die Zeilen ergeben sich aus der Projektzahl. */
export const COLS = 4;
export const projectRows = (count: number) => Math.ceil(count / COLS);

export type GridView = {
	/** Anzahl Projekte, die sich im Raster wiederholen. */
	count: number;
	/** Sichtbare Fläche in CSS-Pixeln. */
	width: number;
	height: number;
	/** Kantenlänge einer Kachel und Abstand von Kachelmitte zu Kachelmitte. */
	tile: number;
	spacing: number;
	/** Instanzraster: ein ganzes Vielfaches von COLS x ROWS. */
	cols: number;
	rows: number;
	/** Verschiebung durch Draggable, in Pixeln. */
	dragX: number;
	dragY: number;
	/** Stärke der Kissenverzeichnung, identisch zu uDistortion im Vertex-Shader. */
	distortion: number;
};

export const mod = (v: number, m: number) => ((v % m) + m) % m;

/**
 * Kachelgröße folgt der Viewport-Breite – auf dem Handy passen bei 300px sonst
 * nur anderthalb Kacheln ins Bild.
 */
export const tileSize = (width: number) => Math.round(Math.max(60, Math.min(300, width / 2.4)));
export const gapSize = (tile: number) => Math.round(tile * 0.13);

/**
 * Anzahl Kacheln, die `px` füllen: eine über den Rand hinaus und aufgerundet auf
 * ein ganzes Vielfaches von `per`, damit sich das Projektraster beim Umbrechen
 * nahtlos fortsetzt.
 */
export const fitCount = (px: number, spacing: number, per: number) =>
	per * Math.ceil((Math.ceil(px / spacing) + 1) / per);

/** Welches Projekt auf der Instanz `tile` liegt. Das Raster wiederholt sich. */
export function projectAt(view: GridView, tile: number) {
	const col = mod(tile, view.cols);
	const row = Math.floor(tile / view.cols);
	return ((row % projectRows(view.count)) * COLS + (col % COLS)) % view.count;
}

/** Mittelpunkt der Instanz `tile` in Weltpixeln; Ursprung Bildmitte, y nach oben. */
export function tilePosition(view: GridView, tile: number) {
	const fullW = view.cols * view.spacing;
	const fullH = view.rows * view.spacing;
	return {
		x: mod((tile % view.cols) * view.spacing + view.dragX, fullW) - fullW / 2,
		y: -(mod(Math.floor(tile / view.cols) * view.spacing + view.dragY, fullH) - fullH / 2)
	};
}

/** Umkehrung des Vertex-Shaders: Pixel im Container -> Weltpixel. */
export function screenToWorld(view: GridView, px: number, py: number) {
	const sx = (px / view.width) * 2 - 1;
	const sy = 1 - (py / view.height) * 2;
	const s = Math.hypot(sx, sy);
	if (s === 0) return { x: 0, y: 0 };

	// Die Verzerrung ist radial, ändert die Richtung also nicht: s = t * (1 + k*t^2)
	// nach t auflösen genügt. 4 Fixpunktschritte reichen für k < 1.
	const aspect = view.width / view.height;
	const m = Math.hypot(sx * aspect, sy) / (s * Math.hypot(aspect, 1));
	const k = view.distortion * m * m;
	let t = s;
	for (let i = 0; i < 4; i++) t = s / (1 + k * t * t);

	return { x: ((sx * t) / s) * (view.width / 2), y: ((sy * t) / s) * (view.height / 2) };
}

/** Index der Instanz unter dem Punkt, oder -1 im Zwischenraum. */
export function tileAt(view: GridView, px: number, py: number) {
	const { x, y } = screenToWorld(view, px, py);
	const mx = mod(x + (view.cols * view.spacing) / 2 - view.dragX, view.cols * view.spacing);
	const my = mod(-y + (view.rows * view.spacing) / 2 - view.dragY, view.rows * view.spacing);
	const col = Math.round(mx / view.spacing);
	const row = Math.round(my / view.spacing);

	// Auf dem Gitter, aber im Gap zwischen zwei Kacheln?
	if (Math.abs(mx - col * view.spacing) > view.tile / 2) return -1;
	if (Math.abs(my - row * view.spacing) > view.tile / 2) return -1;

	return mod(row, view.rows) * view.cols + mod(col, view.cols);
}

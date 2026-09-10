import fragment from '$lib/webgl/fragment.glsl?raw';
import vertex from '$lib/webgl/vertex.glsl?raw';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl';
import {
	COLS,
	fitCount,
	gapSize,
	projectAt,
	projectRows,
	screenToWorld,
	tileAt,
	tilePosition,
	tileSize,
	type GridView
} from './grid-math.ts';

gsap.registerPlugin(Draggable, InertiaPlugin);

const REST = 0.2;
const DRAGGED = 0.45;

/** Wie stark die Kachel direkt unter dem Zeiger wächst … */
const GROW = 0.125;
/** … und wie weit die Anziehung reicht, in Kachelabständen. */
const REACH = 1.8;

/** Was das Raster von einem Projekt braucht – der Rest bleibt in Svelte. */
type Tile = { title: string; image: string };

type Callbacks = {
	/** Projekt unter dem Zeiger (-1 = keins) und dessen Position im Container. */
	onHover: (project: number, x: number, y: number) => void;
	onSelect: (project: number) => void;
};

/**
 * Baut das unendliche Kachelraster in `canvas` auf: WebGL, Drag und Hit-Test.
 * `container` ist die Zieh- und Zeigerfläche. Gibt die Aufräumfunktion zurück.
 */
export function createGrid(
	canvas: HTMLCanvasElement,
	container: HTMLElement,
	projects: Tile[],
	{ onHover, onSelect }: Callbacks
) {
	const renderer = new Renderer({ canvas, dpr: Math.min(window.devicePixelRatio, 2), alpha: true });
	const gl = renderer.gl;

	// Orthografisch in CSS-Pixeln: Weltkoordinaten == Layout-Pixel.
	const camera = new Camera(gl, { near: -1000, far: 1000 }); // orthographic() folgt in resize()
	const scene = new Transform();

	const geometry = new Plane(gl, { widthSegments: 16, heightSegments: 16 });
	const textures = projects.map(({ image, title }) => {
		const texture = new Texture(gl);
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => (texture.image = img);
		img.onerror = () => console.warn(`Bild nicht geladen: ${title}`);
		img.src = image;
		return texture;
	});

	// Von gsap getweent, vom Shader und vom Hit-Test gelesen.
	const uDistortion = { value: REST };
	const uAspect = { value: 1 };

	// Ein einziges Programm für alle Kacheln; tMap wird pro Mesh kurz vor dem
	// Draw gesetzt, das spart N-1 Shader-Compiles.
	const program = new Program(gl, {
		vertex,
		fragment,
		// Die runden Ecken sind transparent: ohne Blending stanzen sie schwarze
		// Kerben in die Kachel dahinter, sobald eine gewachsene sie überlappt.
		transparent: true,
		uniforms: { tMap: { value: textures[0] }, uDistortion, uAspect }
	});

	const view: GridView = {
		count: projects.length,
		width: 1,
		height: 1,
		tile: 0,
		spacing: 1,
		cols: 0,
		rows: 0,
		dragX: 0,
		dragY: 0,
		distortion: REST
	};

	let meshes: Mesh[] = [];
	/** Aktueller Wachstumsfaktor je Instanz, gegen das Ziel gedämpft. */
	let grown: number[] = [];
	let hoveredTile = -1;
	let dragging = false;
	let inside = false;
	let pointerX = 0;
	let pointerY = 0;

	function build() {
		const cols = Math.max(view.cols, fitCount(view.width, view.spacing, COLS));
		const rows = Math.max(view.rows, fitCount(view.height, view.spacing, projectRows(view.count)));
		if (cols === view.cols && rows === view.rows) return; // nur wachsen, nie neu bauen beim Verkleinern

		for (const mesh of meshes) mesh.setParent(null);
		view.cols = cols;
		view.rows = rows;
		hoveredTile = -1; // Indizes verschieben sich, alter Hover ist ungültig
		meshes = [];
		grown = new Array(cols * rows).fill(1);

		for (let i = 0; i < cols * rows; i++) {
			const project = projectAt(view, i);
			const mesh = new Mesh(gl, { geometry, program });
			mesh.scale.set(view.tile, view.tile, 1);
			mesh.onBeforeRender(() => (program.uniforms.tMap.value = textures[project]));
			mesh.setParent(scene);
			meshes.push(mesh);
		}
	}

	function layout() {
		for (let i = 0; i < meshes.length; i++) {
			const { x, y } = tilePosition(view, i);
			meshes[i].position.set(x, y, 0);
		}
	}

	/** Instanz unter der zuletzt bekannten Zeigerposition, bei aktueller Verzerrung. */
	function tileUnderPointer() {
		view.distortion = uDistortion.value;
		return tileAt(view, pointerX, pointerY);
	}

	/** `moved` = der Zeiger selbst hat sich bewegt, nicht nur das Raster darunter. */
	function updateHover(moved = false) {
		const next = dragging || !inside ? -1 : tileUnderPointer();
		if (next === hoveredTile && !moved) return;

		hoveredTile = next;
		onHover(next < 0 ? -1 : projectAt(view, next), pointerX, pointerY);
	}

	function resize() {
		view.width = container.clientWidth;
		view.height = container.clientHeight;
		renderer.setSize(view.width, view.height);
		camera.orthographic({
			left: -view.width / 2,
			right: view.width / 2,
			bottom: -view.height / 2,
			top: view.height / 2
		});
		uAspect.value = view.width / view.height;

		const tile = tileSize(view.width);
		if (tile !== view.tile) {
			view.tile = tile;
			view.spacing = tile + gapSize(tile);
			view.cols = view.rows = 0; // erzwingt den Neuaufbau mit der neuen Kachelgröße
		}

		build();
		layout();
		updateHover();
	}

	/** Der Zeiger kommt in Viewport-Koordinaten, gerechnet wird im Container. */
	function setPointer(clientX: number, clientY: number) {
		const rect = container.getBoundingClientRect();
		pointerX = clientX - rect.left;
		pointerY = clientY - rect.top;
		inside = true;
	}

	const proxy = document.createElement('div');
	const [draggable] = Draggable.create(proxy, {
		type: 'x,y',
		trigger: container,
		inertia: true,
		// Sonst schluckt Draggable das contextmenu-Event und schickt stattdessen
		// einen synthetischen Klick – Rechtsklick würde ein Projekt öffnen.
		allowContextMenu: true,
		onPress: () => {
			// Touch feuert kein pointermove vor dem Tap.
			setPointer(draggable.pointerX, draggable.pointerY);
			dragging = true;
			updateHover();
			gsap.to(uDistortion, { value: DRAGGED, duration: 0.6, ease: 'power2.out' });
		},
		onRelease: () => {
			dragging = false;
			updateHover();
			gsap.to(uDistortion, { value: REST, duration: 0.9, ease: 'power2.out' });
		},
		onDrag: apply,
		onThrowUpdate: apply,
		onClick: () => {
			// Bewusst nicht über hoveredTile: der Klick kommt aus dem nativen click-Event,
			// und auf dem Handy hat pointerleave den Hover davor schon gelöscht.
			const tile = tileUnderPointer();
			if (tile >= 0) onSelect(projectAt(view, tile));
		}
	});

	function apply() {
		view.dragX = draggable.x;
		view.dragY = draggable.y;
		layout();
		updateHover();
	}

	function onPointerMove(event: PointerEvent) {
		setPointer(event.clientX, event.clientY);
		updateHover(true);
	}

	function onPointerLeave() {
		// Ohne dieses Flag gäbe es kein "draußen": tileAt() rechnet modulo und
		// bildet jede noch so weit entfernte Koordinate wieder aufs Raster ab.
		inside = false;
		updateHover();
	}

	/**
	 * Kacheln wachsen mit der Nähe zum Zeiger. Läuft pro Frame statt über gsap,
	 * weil sich auch beim Ziehen jede Distanz ändert; die Dämpfung glättet
	 * Zeigersprünge und das Auf- und Zuklappen beim Betreten und Verlassen.
	 */
	function grow() {
		view.distortion = uDistortion.value;
		const focus = inside && !dragging ? screenToWorld(view, pointerX, pointerY) : null;
		const reach = view.spacing * REACH;

		for (let i = 0; i < meshes.length; i++) {
			const { position, scale } = meshes[i];
			let target = 1;
			if (focus) {
				const d = Math.hypot(position.x - focus.x, position.y - focus.y) / reach;
				if (d < 1) target = 1 + GROW * (1 - d * d) ** 2;
			}

			grown[i] += (target - grown[i]) * 0.15;
			scale.set(view.tile * grown[i], view.tile * grown[i], 1);
			// Gewachsene Kacheln nach vorn, sonst schneiden die Nachbarn sie an.
			position.z = grown[i] - 1;
		}
	}

	let frame = requestAnimationFrame(function render() {
		frame = requestAnimationFrame(render);
		grow();
		renderer.render({ scene, camera });
	});

	resize();
	window.addEventListener('resize', resize);
	container.addEventListener('pointermove', onPointerMove);
	container.addEventListener('pointerleave', onPointerLeave);

	return () => {
		cancelAnimationFrame(frame);
		window.removeEventListener('resize', resize);
		container.removeEventListener('pointermove', onPointerMove);
		container.removeEventListener('pointerleave', onPointerLeave);
		draggable.kill();
		gsap.killTweensOf(uDistortion);
		// Sonst bleibt pro Mount ein GL-Kontext liegen und der Browser wirft ab
		// etwa 16 Stück den ältesten weg – das Raster wird beim Zurücknavigieren schwarz.
		gl.getExtension('WEBGL_lose_context')?.loseContext();
	};
}

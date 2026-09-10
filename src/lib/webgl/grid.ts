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
	tileAt,
	tilePosition,
	tileSize,
	type GridView
} from './grid-math.ts';

gsap.registerPlugin(Draggable, InertiaPlugin);

const REST = 0.2;
const DRAGGED = 0.45;

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

	// Ein einziges Programm für alle Kacheln; tMap und uHover werden pro Mesh
	// kurz vor dem Draw gesetzt, das spart N-1 Shader-Compiles.
	const program = new Program(gl, {
		vertex,
		fragment,
		uniforms: { tMap: { value: textures[0] }, uHover: { value: 0 }, uDistortion, uAspect }
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
	let hoverAmount: number[] = [];
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
		gsap.killTweensOf(hoverAmount);
		view.cols = cols;
		view.rows = rows;
		hoveredTile = -1; // Indizes verschieben sich, alter Hover ist ungültig
		meshes = [];
		hoverAmount = new Array(cols * rows).fill(0);

		for (let i = 0; i < cols * rows; i++) {
			const project = projectAt(view, i);
			const mesh = new Mesh(gl, { geometry, program });
			mesh.scale.set(view.tile, view.tile, 1);
			mesh.onBeforeRender(() => {
				program.uniforms.tMap.value = textures[project];
				program.uniforms.uHover.value = hoverAmount[i];
			});
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

		if (next !== hoveredTile) {
			if (hoveredTile >= 0)
				gsap.to(hoverAmount, { [hoveredTile]: 0, duration: 0.4, ease: 'power2.out' });
			if (next >= 0) gsap.to(hoverAmount, { [next]: 1, duration: 0.4, ease: 'power2.out' });
			hoveredTile = next;
		}
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

	let frame = requestAnimationFrame(function render() {
		frame = requestAnimationFrame(render);
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
		gsap.killTweensOf([hoverAmount, uDistortion]);
		// Sonst bleibt pro Mount ein GL-Kontext liegen und der Browser wirft ab
		// etwa 16 Stück den ältesten weg – das Raster wird beim Zurücknavigieren schwarz.
		gl.getExtension('WEBGL_lose_context')?.loseContext();
	};
}

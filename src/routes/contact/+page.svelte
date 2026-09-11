<script lang="ts">
	import { createPoints } from '$lib/points';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let canvas: HTMLCanvasElement;
	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout>;

	onMount(() => createPoints(canvas, 'Ready to talk?'));

	async function copy() {
		try {
			await navigator.clipboard.writeText(data.user.email);
			copied = true;
			clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 2000);
		} catch {
			// kein Clipboard-Zugriff: der Link darunter bleibt der Weg raus
		}
	}
</script>

<svelte:head><title>Contact — Enis Erdem Ciftci</title></svelte:head>

<div class="relative h-dvh w-full overflow-hidden bg-black">
	<canvas bind:this={canvas} class="pointer-events-none absolute inset-0 h-full w-full"></canvas>

	<h1 class="sr-only">Ready to talk?</h1>

	<button
		onclick={copy}
		class="absolute top-[65%] left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/40 px-6 py-2 text-sm tracking-[0.2em] text-white/70 uppercase transition-colors hover:border-white hover:text-white"
	>
		{copied ? 'Copied' : data.user.email}
	</button>

	<footer class="absolute bottom-6 w-full text-center text-xs tracking-wide text-white/30">
		Designed &amp; built by {data.user.name}
	</footer>
</div>

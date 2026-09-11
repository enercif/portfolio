<script lang="ts">
	import { getDirectusAssetUrl } from '$lib/directus/directus';
	import { createInk } from '$lib/webgl/ink';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let stage: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let over: HTMLVideoElement;
	let under: HTMLVideoElement;
	let inked = $state(false);

	const play = (v: HTMLVideoElement) => {
		v.muted = true;
		v.play().catch(() => {});
	};

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		inked = true;
		return createInk(canvas, stage, over, under);
	});
</script>

<svelte:head><title>About — Enis Erdem Ciftci</title></svelte:head>

<div class="flex h-lvh w-full flex-col bg-black md:flex-row">
	<div bind:this={stage} class="relative h-[50svh] touch-none overflow-hidden md:h-full md:w-1/2">
		<video
			bind:this={over}
			class={['absolute inset-0 h-full w-full object-cover', inked && 'opacity-0']}
			crossorigin="anonymous"
			src={getDirectusAssetUrl(data.user.overlay.id)}
			{@attach play}
			autoplay
			loop
			muted
			playsinline
		></video>
		<video
			bind:this={under}
			class="absolute inset-0 h-full w-full object-cover opacity-0"
			crossorigin="anonymous"
			src={getDirectusAssetUrl(data.user.underlay.id)}
			{@attach play}
			autoplay
			loop
			muted
			playsinline
		></video>
		<canvas
			bind:this={canvas}
			class={['absolute inset-0 h-full w-full', !inked && 'hidden']}
			aria-hidden="true"
		></canvas>
	</div>
</div>

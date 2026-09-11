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

	// muted als Attribut reicht nicht: nach der Hydration ist die Property nicht
	// zuverlaessig gesetzt, Firefox blockt den Autoplay dann weg.
	const play = (v: HTMLVideoElement) => {
		v.muted = true;
		v.play().catch(() => {});
	};

	const df = new Intl.DateTimeFormat('de-DE', { month: 'short', year: 'numeric' });
	const period = (start: string, end?: string | null) =>
		`${df.format(new Date(start))} – ${end ? df.format(new Date(end)) : 'Heute'}`;

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		inked = true;
		return createInk(canvas, stage, over, under);
	});
</script>

<svelte:head><title>About - Enis Erdem Ciftci</title></svelte:head>

<div class="flex h-dvh w-full flex-col bg-white md:flex-row dark:bg-black">
	<div bind:this={stage} class="relative h-1/2 touch-none overflow-hidden md:h-full md:w-1/2">
		<!-- Beide Videos bleiben im Layout, sonst pausiert Safari die Dekodierung.
		     Sichtbar ist im WebGL-Fall nur noch das Canvas darueber. -->
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

	<section
		class="flex flex-1 flex-col gap-12 overflow-y-auto px-6 py-10 text-black md:justify-center md:px-14 md:py-16 dark:text-white"
	>
		<div
			class="order-1 max-w-prose text-base leading-relaxed text-black/90 md:order-2 md:text-lg dark:text-white/90 [&_a]:underline [&_p+p]:mt-4"
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html data.user.description}
		</div>

		<ol class="order-2 flex flex-col md:order-1">
			{#each data.experience as job (job.id)}
				<li class="border-t border-black/15 py-5 last:border-b dark:border-white/15">
					<div class="flex flex-row items-center justify-between">
						<h2 class="mt-1 text-xl font-semibold md:text-2xl">{job.name}</h2>
						<p class="font-mono text-xs tracking-wider text-black/75 dark:text-white/75">
							{period(job.start, job.end)}
						</p>
					</div>

					<p class="text-sm text-black/60 md:text-base dark:text-white/60">{job.position}</p>
					{#if job.description}
						<div class="mt-2 max-w-prose text-sm text-black/50 dark:text-white/50 [&_p+p]:mt-2">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html job.description}
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	</section>
</div>

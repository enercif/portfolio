<script lang="ts">
	import { createPoints } from '$lib/points';
	import { socialIcons } from '$lib/socials';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let canvas: HTMLCanvasElement;
	let copied = $state(false);
	let email = $state('');
	let timer: ReturnType<typeof setTimeout>;

	onMount(() => {
		email = atob(data.email);
		return createPoints(canvas, 'Ready to talk?');
	});

	async function copy() {
		try {
			await navigator.clipboard.writeText(email);
			copied = true;
			clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 2000);
		} catch {
			// kein Clipboard-Zugriff: der Link darunter bleibt der Weg raus
		}
	}
</script>

<svelte:head><title>Contact - Enis Erdem Ciftci</title></svelte:head>

<div class="relative h-dvh w-full overflow-hidden">
	<canvas bind:this={canvas} class="pointer-events-none absolute inset-0 h-full w-full"></canvas>

	<h1 class="sr-only">Ready to talk?</h1>

	<button
		onclick={copy}
		class:invisible={!email}
		class="absolute top-[65%] left-1/2 z-40 -translate-x-1/2 rounded-full border border-current/60 px-6 py-2 text-sm tracking-[0.2em] text-current/70 uppercase transition-colors hover:border-current hover:text-current"
	>
		{copied ? 'Copied' : email}
	</button>

	<footer
		class="absolute z-40 flex w-full flex-col-reverse items-center gap-4 text-xs tracking-wide max-md:top-6 md:bottom-6 md:flex-col"
	>
		{#if data.user.socials?.length}
			<ul class="flex gap-5">
				{#each data.user.socials as social (social.link)}
					<li>
						<a
							href={social.link}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={social.type}
							class="block text-current/50 transition-colors hover:text-current"
						>
							<svg viewBox="0 0 24 24" class="size-5 fill-current" aria-hidden="true">
								<path d={socialIcons[social.type]} />
							</svg>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
		<p class="text-current/30">Designed &amp; built by {data.user.name}</p>
	</footer>
</div>

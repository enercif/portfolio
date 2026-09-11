<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getDirectusAssetUrl } from '$lib/directus/directus';
	import { createGrid } from '$lib/webgl/grid';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const projects = $derived(
		data.projects.map(({ slug, name, thumbnail }) => ({
			slug,
			title: name,
			image: `${getDirectusAssetUrl(thumbnail.id)}?width=600&height=600&fit=cover&format=webp`
		}))
	);

	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;

	let hoveredProject = $state(-1);
	let pointer = $state({ x: 0, y: 0 });

	onMount(() => {
		console.log('Projects:', projects);
		if (!projects.length) return;
		return createGrid(canvas, container, projects, {
			onHover: (project, x, y) => {
				hoveredProject = project;
				pointer = { x, y };
			},
			onSelect: (project) => goto(resolve('/p/[slug]', { slug: projects[project].slug }))
		});
	});
</script>

<svelte:head><title>Home - Enis Erdem Ciftci</title></svelte:head>

<div
	bind:this={container}
	class="relative h-dvh w-full touch-none overflow-hidden bg-white select-none dark:bg-black"
	class:cursor-pointer={hoveredProject >= 0}
	class:cursor-grab={hoveredProject < 0}
>
	<canvas bind:this={canvas} class="absolute inset-0 h-full w-full"></canvas>

	<div
		class="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center px-20 py-4 sm:bottom-16"
	>
		<div
			class="absolute inset-0 -z-10 mask-[radial-gradient(ellipse_at_center,black_0%,black_40%,transparent_80%)]
           backdrop-blur
           [-webkit-mask-image:radial-gradient(ellipse_at_center,black_0%,black_40%,transparent_80%)]"
		></div>

		<h1
			class="text-4xl font-bold tracking-wide text-nowrap text-black sm:bottom-40 sm:text-8xl dark:text-white"
		>
			{data.user.name}
		</h1>
		<img
			src={getDirectusAssetUrl(data.user.signature.id)}
			alt="Signature"
			class="-mt-6 h-30 sm:-mt-15 sm:h-48"
		/>
	</div>

	{#if hoveredProject >= 0}
		<span
			class="pointer-events-none absolute top-0 left-0 text-xl font-medium text-black mix-blend-difference dark:text-white"
			style="transform: translate({pointer.x + 8}px, {pointer.y + 8}px)"
		>
			{projects[hoveredProject].title}
		</span>
	{/if}

	<ul class="sr-only">
		{#each projects as project (project.slug)}
			<li><a href={resolve('/p/[slug]', { slug: project.slug })}>{project.title}</a></li>
		{/each}
	</ul>
</div>

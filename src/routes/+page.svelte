<script lang="ts">
	import { getDirectusAssetUrl } from '$lib/directus/directus';
	import { scrollState } from '$lib/state/scroll.state.svelte';
	import { createGrid } from '$lib/webgl/grid';
	import SquareArrowOutUpRight from '@lucide/svelte/icons/square-arrow-out-up-right';
	import XIcon from '@lucide/svelte/icons/x';
	import { watch } from 'runed';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const projects = $derived(
		data.projects
			.map(({ id, name, tags, description, images, link }) => {
				const ids = (images ?? []).flatMap(({ directus_files_id: file }) =>
					file && typeof file === 'object' ? [file.id] : []
				);
				return {
					id,
					title: name,
					tags,
					link,
					description,
					images: ids.map(
						(id) => `${getDirectusAssetUrl(id)}?width=600&height=600&fit=cover&format=webp`
					)
				};
			})
			.filter(({ images }) => images.length)
	);

	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let dialog: HTMLDialogElement;

	let hoveredProject = $state(-1);
	let openProject = $state(-1);
	let pointer = $state({ x: 0, y: 0 });

	function open(project: number) {
		openProject = project;
		dialog.showModal();
	}

	onMount(() => {
		if (!projects.length) return;
		return createGrid(canvas, container, projects, {
			onHover: (project, x, y) => {
				hoveredProject = project;
				pointer = { x, y };
			},
			onSelect: open
		});
	});

	watch(
		() => openProject,
		(project) => {
			scrollState.active = project < 0;
		}
	);
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
		{#snippet label(blend: string)}
			<span
				class="pointer-events-none absolute top-0 left-0 text-xl font-medium {blend}"
				style="transform: translate({pointer.x + 8}px, {pointer.y + 8}px)"
			>
				{projects[hoveredProject].title}
			</span>
		{/snippet}
		{@render label('text-black mix-blend-color')}
		{@render label('text-white mix-blend-difference')}
	{/if}

	<ul class="sr-only">
		{#each projects as project, i (project.id)}
			<li><button onclick={() => open(i)}>{project.title}</button></li>
		{/each}
	</ul>
</div>

<dialog
	bind:this={dialog}
	onclose={() => (openProject = -1)}
	class="m-auto max-h-[85dvh] w-[min(52rem,92vw)] rounded-2xl bg-white p-0 text-black backdrop:bg-black/50 backdrop:backdrop-blur-sm dark:bg-black dark:text-white"
>
	{#if openProject >= 0}
		{@const project = projects[openProject]}
		<div class="max-h-[85dvh] overflow-y-auto p-8">
			<div class="flex items-start justify-between gap-4">
				{#if project.link}
					<a
						href={project.link}
						target="_blank"
						rel="noopener noreferrer"
						class="flex flex-row items-center hover:underline"
					>
						<h2 class="text-3xl font-bold">{project.title}</h2>
						<SquareArrowOutUpRight size={20} class="ml-2 inline-block" />
					</a>
				{:else}
					<h2 class="text-3xl font-bold">{project.title}</h2>
				{/if}
				<button
					onclick={() => dialog.close()}
					aria-label="Schließen"
					class="text-2xl leading-none opacity-60 hover:opacity-100"
				>
					<XIcon /></button
				>
			</div>

			{#if project.tags?.length}
				<ul class="mt-4 flex flex-wrap gap-2">
					{#each project.tags as tag (tag)}
						<li class="rounded-full border border-current/20 px-3 py-1 text-sm">{tag}</li>
					{/each}
				</ul>
			{/if}

			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<p class="mt-6 whitespace-pre-line">{@html project.description}</p>

			<div class="flex flex-row gap-4 overflow-x-scroll sm:gap-8">
				{#each project.images as image (image)}
					<img
						src={image}
						alt=""
						class="mt-6 aspect-square h-50 rounded-lg sm:h-100"
						loading="lazy"
					/>
				{/each}
			</div>
		</div>
	{/if}
</dialog>

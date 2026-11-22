<script lang="ts">
	import { getDirectusAssetUrl } from '$lib/directus/directus';
	import { scrollState } from '$lib/state/scroll.state.svelte';
	import { createGrid } from '$lib/webgl/grid';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
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
				const asset = (id: string, size: number) =>
					`${getDirectusAssetUrl(id)}?width=${size}&height=${size}&fit=cover&format=webp`;
				return {
					id,
					title: name,
					tags,
					link,
					description,
					images: ids.map((id) => asset(id, 600)),
					large: ids.map((id) => asset(id, 1400)),
					thumbs: ids.map((id) => asset(id, 300))
				};
			})
			.filter(({ images }) => images.length)
	);

	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let dialog: HTMLDialogElement;

	let hoveredProject = $state(-1);
	let openProject = $state(-1);
	let openImage = $state(0);
	let pointer = $state({ x: 0, y: 0 });
	let thumbs = $state<HTMLDivElement>();

	// Dialog oeffnet/schliesst als Kreis vom Klickpunkt, wie der Seitenwechsel
	let origin = '50% 50%';
	const circle = (r: string) => `circle(${r} at ${origin})`;
	const reveal = (from: string, to: string) =>
		dialog.animate(
			{ clipPath: [circle(from), circle(to)] },
			{
				duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600,
				easing: 'cubic-bezier(.7,0,.2,1)'
			}
		);

	function open(project: number, from?: { x: number; y: number }) {
		openProject = project;
		openImage = 0;
		origin = from ? `${from.x}px ${from.y}px` : '50% 50%';
		dialog.showModal();
		dialog.scrollTop = 0;
		reveal('0', '150vmax');
	}

	function close() {
		reveal('150vmax', '0').onfinish = () => dialog.close();
	}

	function showImage(i: number) {
		const count = projects[openProject].large.length;
		openImage = (i + count) % count;
		thumbs?.children[openImage]?.scrollIntoView({
			block: 'nearest',
			inline: 'nearest',
			behavior: 'smooth'
		});
	}

	onMount(() => {
		if (!projects.length) return;
		return createGrid(canvas, container, projects, {
			onHover: (project, x, y) => {
				hoveredProject = project;
				pointer = { x, y };
			},
			onSelect: (project) => open(project, pointer)
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
	oncancel={(e) => {
		e.preventDefault();
		close();
	}}
	onkeydown={(e) => {
		if (e.key === 'ArrowRight') showImage(openImage + 1);
		if (e.key === 'ArrowLeft') showImage(openImage - 1);
	}}
	class="m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-white p-0 text-black backdrop:bg-transparent dark:bg-black dark:text-white"
>
	{#if openProject >= 0}
		{@const project = projects[openProject]}
		<div
			class="sticky top-0 z-10 flex items-center justify-between px-[6vw] py-4 text-white mix-blend-difference"
		>
			<span>Projekt {String(openProject + 1).padStart(2, '0')}</span>
			<button
				onclick={close}
				aria-label="Schließen"
				class="grid size-10 place-items-center rounded-full hover:bg-white/15"
			>
				<XIcon />
			</button>
		</div>

		<h2
			class="mx-[6vw] mt-[4vh] mb-[4vh] flex flex-row justify-center text-center text-[11vw] leading-[0.9] font-black tracking-tight wrap-anywhere uppercase"
		>
			{#if project.link}
				<a
					href={project.link}
					target="_blank"
					rel="noopener noreferrer"
					class="relative underline decoration-[0.06em] underline-offset-[0.08em] hover:decoration-[0.1em]"
				>
					{project.title}
				</a>
				<ArrowUpRight aria-hidden="true" class="size-[0.2em]" strokeWidth={3} />
			{:else}
				{project.title}
			{/if}
		</h2>

		{#if project.tags?.length}
			<ul class="mx-[6vw] flex flex-wrap justify-center gap-2.5">
				{#each project.tags as { name, color } (name)}
					<li
						class="flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs tracking-[0.2em] uppercase"
						style:border-color="color-mix(in srgb, {color} 50%, transparent)"
					>
						<span class="size-2 rounded-full" style:background-color={color}></span>
						<span class="opacity-70">{name}</span>
					</li>
				{/each}
			</ul>
		{/if}

		<div
			class="mx-[6vw] my-[6vh] grid items-start gap-[6vw] md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
		>
			<div
				class="leading-relaxed whitespace-pre-line md:sticky md:top-20 [&>p+p]:opacity-60 [&>p:first-child]:mt-0 [&>p:first-child]:text-2xl [&>p:first-child]:leading-snug [&>p:first-child]:font-medium"
			>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html project.description}
			</div>

			<div>
				<img
					src={project.large[openImage]}
					alt=""
					class="aspect-square w-full rounded-md object-cover"
				/>

				{#if project.large.length > 1}
					<div class="mt-3 flex items-center gap-2">
						{#snippet arrow(step: number, label: string)}
							<button
								onclick={() => showImage(openImage + step)}
								aria-label={label}
								class="grid size-8 shrink-0 place-items-center rounded-full border border-current/15 opacity-60 hover:border-current hover:opacity-100"
							>
								{step < 0 ? '←' : '→'}
							</button>
						{/snippet}
						{@render arrow(-1, 'Vorheriges Bild')}
						<div
							bind:this={thumbs}
							class="flex flex-1 snap-x snap-mandatory [scrollbar-width:none] gap-2 overflow-x-auto"
						>
							{#each project.thumbs as thumb, i (thumb)}
								<button
									onclick={() => showImage(i)}
									aria-label="Bild {i + 1} anzeigen"
									aria-current={i === openImage}
									class="aspect-square shrink-0 basis-[calc((100%-1.5rem)/4)] snap-start opacity-40 transition-opacity hover:opacity-100 aria-[current=true]:opacity-100"
								>
									<img src={thumb} alt="" loading="lazy" class="size-full rounded object-cover" />
								</button>
							{/each}
						</div>
						{@render arrow(1, 'Nächstes Bild')}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</dialog>

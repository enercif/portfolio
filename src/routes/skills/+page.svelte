<script lang="ts">
	import gsap from 'gsap';
	import { onMount } from 'svelte';

	let { data } = $props();
	const COPIES = [0, 1, 2, 3];
	const SHIFT = 100 / COPIES.length;

	let root: HTMLDivElement;
	const tweens: gsap.core.Tween[] = [];

	onMount(() => {
		const ctx = gsap.context(() => {
			const bands = gsap.utils.toArray<HTMLElement>('.band');

			bands.forEach((band, i) => {
				const rtl = i % 2 === 0;
				tweens[i] = gsap.fromTo(
					band.querySelector('.track'),
					{ xPercent: rtl ? 0 : -SHIFT },
					{
						xPercent: rtl ? -SHIFT : 0,
						duration: 20 + i * 3,
						ease: 'none',
						repeat: -1
					}
				);
			});

			if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
				gsap.from(bands, {
					xPercent: (i: number) => (i % 2 === 0 ? -130 : 130),
					autoAlpha: 0,
					duration: 1.2,
					ease: 'power3.out',
					stagger: 0.12,
					delay: 0.75
				});
		}, root);

		return () => ctx.revert();
	});

	let active = $state(-1);

	function activate(i: number) {
		active = i;
		tweens.forEach((t, j) =>
			gsap.to(t, { timeScale: j === i ? 0.12 : 1, duration: 0.6, overwrite: true })
		);
	}

	const onMouse = (e: PointerEvent, i: number) => e.pointerType === 'mouse' && activate(i);
	const onTap = (e: PointerEvent, i: number) =>
		e.pointerType !== 'mouse' && activate(active === i ? -1 : i);
</script>

<svelte:head><title>Skills — Enis Erdem Ciftci</title></svelte:head>

<div bind:this={root} class="relative h-dvh w-full overflow-hidden bg-black">
	<div
		class="absolute top-1/2 left-1/2 flex w-[150vw] -translate-x-1/2 -translate-y-1/2 rotate-[-10deg] flex-col gap-10 sm:gap-18"
	>
		{#each data.skills as { group, skills }, i (group)}
			<div
				class={[
					'band touch-manipulation transition-[filter] duration-700',
					active === i ? 'grayscale-0' : 'grayscale'
				]}
				role="list"
				onpointerenter={(e) => onMouse(e, i)}
				onpointerleave={(e) => onMouse(e, -1)}
				onpointerdown={(e) => onTap(e, i)}
			>
				<div class="track flex w-max items-center gap-10">
					{#each COPIES as copy (copy)}
						<div class="flex items-center gap-10" aria-hidden={copy > 0}>
							<span
								class="rounded-full border border-white/40 px-6 py-2 text-[clamp(0.8rem,1.4vw,1.4rem)] font-medium tracking-[0.3em] text-white/60 uppercase"
								>{group}</span
							>
							{#each skills as { name, color } (name)}
								<span
									class="text-[clamp(3rem,5vw,5.5rem)] leading-none font-black tracking-tight uppercase"
									style:color
									role="listitem">{name}</span
								>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>

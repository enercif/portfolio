<script lang="ts">
	import { onNavigate } from '$app/navigation';
	import { navigationLinks } from '$lib/navigation';
	import gsap from 'gsap';

	const SECTION_COLORS: Record<string, string> = {
		'/': '#ff4d2e',
		'/skills': '#2f6bff',
		'/about': '#ffb703',
		'/contact': '#12b886'
	};
	const ROWS = Array.from({ length: 6 });

	let root: HTMLDivElement;
	let color = $state(SECTION_COLORS['/']);
	let title = $state('');

	onNavigate((nav) => {
		const to = nav.to?.url.pathname ?? '';
		if (!SECTION_COLORS[to] || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
			return;

		color = SECTION_COLORS[to];
		title = navigationLinks.find((l) => l.href === to)?.name ?? '';

		return new Promise((resolve) => {
			const cols = root.querySelectorAll('.col');
			const lines = root.querySelectorAll('.line > span');
			// desktop: mittlere Säule startet zuerst; mobil laufen alle drei als eine Wand
			const lead = window.innerWidth >= 768 ? 0.09 : 0;

			gsap
				.timeline()
				.set(root, { autoAlpha: 1, yPercent: 0 })
				.set(cols, { yPercent: 100 })
				.set(lines, { yPercent: 110 })
				.to(cols, {
					yPercent: 0,
					duration: 0.6,
					ease: 'power3.inOut',
					stagger: { each: lead, from: 'center' }
				})
				.to(lines, { yPercent: 0, duration: 0.5, ease: 'power3.out', stagger: 0.06 }, '-=0.1')
				.to(lines, { yPercent: -110, duration: 0.45, ease: 'power3.in', stagger: 0.06 }, '+=0.5')
				// Seite wird unter der Farbwand getauscht
				.add(resolve as gsap.Callback)
				.to(root, { yPercent: -100, duration: 0.7, ease: 'power3.inOut' }, '+=0.25')
				.set(root, { autoAlpha: 0 });
		});
	});
</script>

<div bind:this={root} class="pointer-events-none invisible fixed inset-0 z-100">
	<div class="absolute inset-0 flex overflow-hidden">
		{#each [0, 1, 2] as i (i)}
			<!-- -mr-px: Säulen 1px überlappen, sonst Subpixel-Naht zwischen den Layern -->
			<div class="col -mr-px h-full flex-1" style:background-color={color}></div>
		{/each}
	</div>

	<div class="absolute inset-0 flex flex-col justify-center">
		<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
		{#each ROWS as _, i (i)}
			<div class="line overflow-hidden">
				<span
					class="block text-center text-[11vw] leading-[0.92] font-black tracking-tight text-black uppercase"
					>{title}</span
				>
			</div>
		{/each}
	</div>
</div>

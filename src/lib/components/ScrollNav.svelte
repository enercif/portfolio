<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { navigationLinks } from '$lib/navigation';

	// wheel pixels needed to fill the circle
	const THRESHOLD = 500;
	const R = 60;
	const C = 2 * Math.PI * R;

	let accum = $state(0);
	let dir = $state(0);
	let busy = false;
	let decay: ReturnType<typeof setTimeout>;

	const index = $derived(navigationLinks.findIndex((l) => l.href === page.url.pathname));
	const target = $derived(dir === 0 ? undefined : navigationLinks[index + dir]);
	const progress = $derived(Math.min(accum / THRESHOLD, 1));

	function reset() {
		accum = 0;
		dir = 0;
	}

	function onwheel(e: WheelEvent) {
		if (busy || index < 0) return;
		const d = Math.sign(e.deltaY);
		const el = document.documentElement;
		const atEdge =
			d > 0 ? el.scrollTop + window.innerHeight >= el.scrollHeight - 1 : d < 0 && el.scrollTop <= 0;

		if (!atEdge || !navigationLinks[index + d]) return reset();

		if (d !== dir) reset();
		dir = d;
		accum += Math.abs(e.deltaY);

		clearTimeout(decay);
		decay = setTimeout(reset, 750);

		if (accum >= THRESHOLD) {
			busy = true;
			const back = d < 0;
			goto(navigationLinks[index + d].href).then(() => {
				if (back) window.scrollTo(0, document.documentElement.scrollHeight);
				reset();
				busy = false;
			});
		}
	}
</script>

<svelte:window {onwheel} />

{#if target}
	{@const S = 2 * R + 8}
	{@const M = R + 4}
	<div
		class="pointer-events-none fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 text-white"
	>
		<svg width={S} height={S} viewBox="0 0 {S} {S}">
			<circle
				cx={M}
				cy={M}
				r={R}
				fill="rgb(0 0 0 / 0.4)"
				stroke="rgb(255 255 255 / 0.2)"
				stroke-width="3"
			/>
			<circle
				cx={M}
				cy={M}
				r={R}
				fill="none"
				stroke="currentColor"
				stroke-width="3"
				stroke-linecap="round"
				stroke-dasharray={C}
				stroke-dashoffset={C * (1 - progress)}
				transform="rotate(-90 {M} {M})"
				style="transition: stroke-dashoffset 200ms linear"
			/>
			<path
				d="M-10 -5 L0 5 L10 -5"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				transform="translate({M} {M - 18}) rotate({dir > 0 ? 0 : 180})"
			/>
			<text
				x={M}
				y={M + 16}
				text-anchor="middle"
				dominant-baseline="central"
				fill="currentColor"
				font-size="14">{target.name}</text
			>
		</svg>
	</div>
{/if}

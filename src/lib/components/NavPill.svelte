<script lang="ts">
	import { page } from '$app/state';
	import { navigationLinks } from '$lib/navigation';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import { mode, toggleMode } from 'mode-watcher';
	import { tick } from 'svelte';

	async function toggle(e: MouseEvent) {
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const x = r.left + r.width / 2;
		const y = r.top + r.height / 2;

		if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches)
			return toggleMode();

		// tick(), damit mode-watcher die Klasse setzt, bevor der Snapshot faellt
		const vt = document.startViewTransition(async () => {
			toggleMode();
			await tick();
		});

		await vt.ready;
		const r2 = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
		document.documentElement.animate(
			{ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r2}px at ${x}px ${y}px)`] },
			{
				duration: 600,
				easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
				pseudoElement: '::view-transition-new(root)'
			}
		);
	}
</script>

<nav
	class="fixed top-14 left-1/2 z-40 -translate-x-1/2 rounded-full bg-gray-200/75 px-2 py-2 backdrop-blur-3xl sm:py-3 dark:bg-gray-800/75"
>
	<ul class="flex flex-row items-center gap-1 text-black sm:gap-2 dark:text-white">
		{#each navigationLinks as link (link.href)}
			{@const isActive = page.url.pathname === link.href}
			<li>
				<a
					href={link.href}
					class={[
						'rounded-full  px-3 py-2 text-sm text-nowrap transition-colors duration-150 sm:text-base',
						isActive && 'bg-black text-white dark:bg-white dark:text-black',
						!isActive && 'hover:bg-black/10 dark:hover:bg-white/20'
					]}>{link.name}</a
				>
			</li>
		{/each}
		<li class="mx-1 border-l border-black/15 dark:border-white/15">
			<button
				onclick={toggle}
				aria-label={mode.current === 'dark' ? 'Light mode' : 'Dark mode'}
				class="ml-1 block rounded-full p-2 transition-colors duration-150 hover:bg-black/10 dark:hover:bg-white/20"
			>
				{#if mode.current === 'dark'}
					<Sun size={20} />
				{:else}
					<Moon size={20} />
				{/if}
			</button>
		</li>
	</ul>
</nav>

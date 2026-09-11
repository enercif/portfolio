<script lang="ts">
	import { page } from '$app/state';
	import { navigationLinks } from '$lib/navigation';
</script>

<nav
	class="fixed top-14 left-1/2 z-40 -translate-x-1/2 rounded-full bg-gray-800/75 px-2 py-3 backdrop-blur-3xl"
>
	<ul class="flex flex-row gap-2 text-white">
		{#each navigationLinks as link (link.href)}
			{@const isActive = page.url.pathname === link.href}
			<li>
				<a
					href={link.href}
					class={[
						'rounded-full  px-3 py-2 text-nowrap transition-colors duration-150',
						isActive && 'bg-white text-black',
						!isActive && 'hover:bg-white/20'
					]}>{link.name}</a
				>
			</li>
		{/each}
	</ul>
</nav>

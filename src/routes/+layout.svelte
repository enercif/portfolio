<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import ScrollNav from '$lib/components/ScrollNav.svelte';
	import NavPill from '$lib/components/NavPill.svelte';
	import PageTransition from '$lib/components/PageTransition.svelte';
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<ScrollNav />
<PageTransition />

<NavPill />
{@render children()}

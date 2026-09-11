<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import ScrollNav from '$lib/components/ScrollNav.svelte';
	import NavPill from '$lib/components/NavPill.svelte';
	import PageTransition from '$lib/components/PageTransition.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<!-- disableTransitions: der Kreis im NavPill uebernimmt den Wechsel, mode-watcher darf
     die Klasse nicht per requestAnimationFrame nachschieben -->
<ModeWatcher defaultMode="dark" disableTransitions={false} />

<ScrollNav />
<PageTransition />

<NavPill />
{@render children()}

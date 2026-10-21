<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';

	const tayFlapjackWoff2 = `${base}/fonts/tay-flapjack/TAYFlapjack.woff2`;
	const tayFlapjackWoff = `${base}/fonts/tay-flapjack/TAYFlapjack.woff`;

	onMount(() => {
		const font = new FontFace('TAY Flapjack', `url('${tayFlapjackWoff2}') format('woff2'), url('${tayFlapjackWoff}') format('woff')`, {
			weight: '400',
			style: 'normal',
			display: 'swap'
		});
		void font.load().then((loaded) => document.fonts.add(loaded));
	});

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preload" as="font" href={tayFlapjackWoff2} type="font/woff2" crossorigin="anonymous" />
	<link rel="stylesheet" href="https://use.typekit.net/vnb2eck.css" />
</svelte:head>

<header class="site-header">
	<a href="https://graffu.com/" class="site-name" aria-label="Graffu home">GRAFFU</a>
	<p class="site-tagline">Visual stories that simply explain data.</p>
</header>

{@render children()}

<style>
	.site-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		padding: 0 1.5rem;
		background: #fefcf8;
		border-bottom: 1px solid #fefcf8;
	}

	.site-name {
		font-family: 'TAY Flapjack', serif;
		font-size: 2.75rem;
		font-weight: 700;
		line-height: 0.75;
		letter-spacing: 0.02em;
		margin-top: 1rem;
		color: #000;
		text-decoration: none;
		white-space: nowrap;
	}
	.site-tagline {
		margin: 0.25rem 0 1rem;
		color: oklch(0.373 0.034 259.733);
		font-family: 'TAY Flapjack', serif;
		font-size: 0.875rem;
		font-weight: 400;
		line-height: 1.25;
	}
	.site-name:focus-visible { outline: 3px solid #087e59; outline-offset: 4px; }
	@media (max-width: 760px) {
		.site-header { padding-inline: 1rem; }
	}
</style>

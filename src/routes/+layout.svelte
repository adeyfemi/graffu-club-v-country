<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.png';
	import { base } from '$app/paths';
	import { SITE_URL } from '$lib/constants.js';
	import { onMount } from 'svelte';

	const tayFlapjackWoff2 = `${base}/fonts/tay-flapjack/TAYFlapjack.woff2`;
	const tayFlapjackWoff = `${base}/fonts/tay-flapjack/TAYFlapjack.woff`;
	const sourceSerif400Woff2 = `${base}/fonts/source-serif-4/source-serif-4-latin-400-normal.woff2`;
	const sourceSerif400Woff = `${base}/fonts/source-serif-4/source-serif-4-latin-400-normal.woff`;
	const sourceSerif400ItalicWoff2 = `${base}/fonts/source-serif-4/source-serif-4-latin-400-italic.woff2`;
	const sourceSerif400ItalicWoff = `${base}/fonts/source-serif-4/source-serif-4-latin-400-italic.woff`;
	const sourceSerif700Woff2 = `${base}/fonts/source-serif-4/source-serif-4-latin-700-normal.woff2`;
	const sourceSerif700Woff = `${base}/fonts/source-serif-4/source-serif-4-latin-700-normal.woff`;
	const sourceSerif700ItalicWoff2 = `${base}/fonts/source-serif-4/source-serif-4-latin-700-italic.woff2`;
	const sourceSerif700ItalicWoff = `${base}/fonts/source-serif-4/source-serif-4-latin-700-italic.woff`;

	onMount(() => {
		const fontFaces = [
			new FontFace('TAY Flapjack', `url('${tayFlapjackWoff2}') format('woff2'), url('${tayFlapjackWoff}') format('woff')`, {
				weight: '400',
				style: 'normal',
				display: 'swap'
			}),
			new FontFace('Source Serif 4', `url('${sourceSerif400Woff2}') format('woff2'), url('${sourceSerif400Woff}') format('woff')`, {
				weight: '400',
				style: 'normal',
				display: 'swap'
			}),
			new FontFace(
				'Source Serif 4',
				`url('${sourceSerif400ItalicWoff2}') format('woff2'), url('${sourceSerif400ItalicWoff}') format('woff')`,
				{
					weight: '400',
					style: 'italic',
					display: 'swap'
				}
			),
			new FontFace('Source Serif 4', `url('${sourceSerif700Woff2}') format('woff2'), url('${sourceSerif700Woff}') format('woff')`, {
				weight: '700',
				style: 'normal',
				display: 'swap'
			}),
			new FontFace(
				'Source Serif 4',
				`url('${sourceSerif700ItalicWoff2}') format('woff2'), url('${sourceSerif700ItalicWoff}') format('woff')`,
				{
					weight: '700',
					style: 'italic',
					display: 'swap'
				}
			)
		];

		void Promise.all(
			fontFaces.map(async (fontFace) => {
				const loadedFont = await fontFace.load();
				document.fonts.add(loadedFont);
			})
		);
	});

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- Preload critical webfonts -->
	<link rel="preload" as="font" href={tayFlapjackWoff2} type="font/woff2" crossorigin="anonymous" />
	<link rel="preload" as="font" href={sourceSerif400Woff2} type="font/woff2" crossorigin="anonymous" />
</svelte:head>

<header class="site-header">
	<a href="{SITE_URL}/" class="site-name">GRAFFU</a>
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
		background: var(--color-cream-50);
		border-bottom: 1px solid var(--color-cream-50);
	}

	.site-name {
		font-family: var(--font-display);
		font-size: 2.75rem;
		font-weight: 700;
		line-height: 0.75;
		margin-top: 1rem;
		text-decoration: none;
		letter-spacing: 0.02em;
	}

	.site-tagline {
		font-family: var(--font-display);
		font-size: 0.875rem;
		font-weight: 400;
		line-height: 1.25;
		margin: 0.25rem 0 1rem;
		color: var(--color-gray-700);
	}
</style>

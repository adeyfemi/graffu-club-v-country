<script>
	import Infobox from '$lib/Infobox.svelte';
	import Scrolly from '$lib/Scrolly.svelte';
	import WorldMap from '$lib/charts/WorldMap.svelte';
	import FlowLayer from '$lib/charts/FlowLayer.svelte';
	import CombinedFlowLayer from '$lib/charts/CombinedFlowLayer.svelte';
	import InteractiveExplorer from '$lib/InteractiveExplorer.svelte';
	import { MAP_WIDTH, MAP_HEIGHT, DEFAULT_MAP_SCALE, getZoomToFit } from '$lib/mapZoom.js';
	import { tweened } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';
	import { getAllCombinedFlows } from '$lib/getAllCombinedFlows.js';
	import { TOURNAMENT_YEARS, SITE_URL } from '$lib/constants.js';
	import teams from '../data/teams.json';
	import confederations from '../data/confederations.json';
	import RetentionOverTime from '$lib/charts/RetentionOverTime.svelte';
	import ConfederationShareOverTime from '$lib/charts/ConfederationShareOverTime.svelte';
	// Slimmed squad data — only the `club_nation` field the visuals read.
	// Regenerate with `npm run slim-data` after editing any data/<year>/squads.json.
	import squadClubNations from '../data/squad-club-nations.json';
	import steps from '../data/scrolly-steps.json';

	/** @type {Record<number, Record<string, Array<{ club_nation: string }>>>} */
	const allSquads = /** @type {any} */ (squadClubNations);

	const introStep = steps.find(s => s.type === 'intro');
	const outroStep = steps.find(s => s.type === 'outro');
	const scrollySteps = steps.filter(s => s.type !== 'intro' && s.type !== 'outro');

	const years = TOURNAMENT_YEARS;

	// ── Combined flows (all years, all nations) ──────────────────────────────

	/** @type {Record<string, string>} */
	const nationToConfederation = Object.fromEntries(teams.map((t) => [t.nation, t.confederation]));
	const combinedFlows = getAllCombinedFlows(allSquads, nationToConfederation);

	// ── Scrollytelling ─────────────────────────────────────────────────────────

	let activeStep = $state(0);
	let scrollySectionEl = $state(/** @type {HTMLElement | null} */ (null));
	let scrollyVisible = $state(false);

	$effect(() => {
		if (!scrollySectionEl) return;
		const obs = new IntersectionObserver(
			([entry]) => { scrollyVisible = entry.isIntersecting; },
			{ threshold: 0 }
		);
		obs.observe(scrollySectionEl);
		return () => obs.disconnect();
	});

	const currentScrollyStep = $derived(scrollySteps[activeStep] ?? scrollySteps[0]);
	const scrollyYear = $derived(currentScrollyStep.year ?? years[0]);
	const scrollyNation = $derived(currentScrollyStep.nation ?? '');
	const scrollySquads = $derived(allSquads[scrollyYear] ?? {});

	// ── Map zoom ───────────────────────────────────────────────────────────────
	// Projection constants and getZoomToFit live in $lib/mapZoom.js.

	// Honor the OS "reduce motion" setting for the JS-driven map-zoom tweens.
	// Browser-only ($effect never runs during SSR), so matchMedia is safe here.
	const ZOOM_DURATION = 700;
	let prefersReducedMotion = $state(false);
	$effect(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		prefersReducedMotion = mq.matches;
		const onChange = (/** @type {MediaQueryListEvent} */ e) => (prefersReducedMotion = e.matches);
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});
	const zoomTween = () => ({ duration: prefersReducedMotion ? 0 : ZOOM_DURATION });

	const mapScale = tweened(DEFAULT_MAP_SCALE, { duration: ZOOM_DURATION, easing: cubicInOut });
	const mapTranslate = tweened(/** @type {[number, number]} */ ([MAP_WIDTH / 2, MAP_HEIGHT / 2]), { duration: ZOOM_DURATION, easing: cubicInOut });

	// Read the map container's actual rendered size so we can tell getZoomToFit exactly
	// how much of the SVG coordinate space is visible (the scrolly map is center-cropped
	// on mobile, so the SVG element is wider than the container).
	let mapContainerWidth = $state(0);
	let mapContainerHeight = $state(0);

	// When the SVG element is wider than the container (mobile center-crop), only a
	// central strip of the 960-unit SVG x-axis is visible. Visible width in SVG units =
	// containerWidth / (svgElementWidth / MAP_WIDTH) = containerWidth * MAP_HEIGHT / containerHeight.
	// On desktop the SVG fits fully, so fitWidth = MAP_WIDTH and we shift right to 2/3.
	const scrollyIsCropped = $derived(
		mapContainerWidth > 0 && mapContainerHeight > 0 &&
		mapContainerWidth < mapContainerHeight * MAP_WIDTH / MAP_HEIGHT
	);
	const scrollyFitWidth = $derived(
		scrollyIsCropped
			? mapContainerWidth * MAP_HEIGHT / mapContainerHeight
			: MAP_WIDTH * 2 / 3
	);
	const scrollyCenterX = $derived(scrollyIsCropped ? MAP_WIDTH / 2 : MAP_WIDTH * 2 / 3);

	$effect(() => {
		const players = scrollySquads[scrollyNation] ?? [];
		const target = getZoomToFit(scrollyNation, players, { fitWidth: scrollyFitWidth, centerX: scrollyCenterX, bottomPad: scrollyIsCropped ? 90 : 0 });
		mapScale.set(target.scale, zoomTween());
		mapTranslate.set(target.translate, zoomTween());
	});

	// ── Interactive section ──────────────────────────────────────────────────
	// The year/nation explorer (its own map, stacked bar, and state) lives in
	// $lib/InteractiveExplorer.svelte.

	/**
	 * Converts [n] footnote markers in prose text to superscript HTML.
	 * Escapes the surrounding text first so only the intended <sup> markup is
	 * emitted — literal &, <, > in prose render as text, and the function stays
	 * safe even if the prose source ever stops being author-controlled.
	 * @param {string} text
	 */
	function renderRef(text) {
		const escaped = text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
		return escaped.replace(/\[(\d+)\]/g, '<sup class="fn-ref">$1</sup>');
	}

	// ── Page metadata ────────────────────────────────────────────────────────
	const pageTitle = 'Club vs Country — GRAFFU';
	const pageDescription =
		'Since 1994, African footballers have become the world’s most exported talent — yet the clubs and leagues that develop them have barely registered on football’s biggest stage. An interactive visual essay.';
	const canonical = `${SITE_URL}/`;
	const ogImage = `${SITE_URL}/og-club-vs-country.jpg`;

	// Escape `<` so the serialized data can never break out of the <script> tag.
	const jsonLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: 'Club vs Country',
		description: pageDescription,
		url: canonical,
		image: ogImage,
		isPartOf: { '@type': 'WebSite', name: 'GRAFFU', url: `${SITE_URL}/` }
	}).replace(/</g, '\\u003c');

	const FOOTNOTES = [
		{
			id: 1,
			text: 'Squad data compiled from FIFA official World Cup squad lists and Wikipedia tournament records, 1994–2026. Domestic retention rate is defined as the share of a squad’s players based at clubs in their home country at the time of each tournament.'
		},
	];

	const CREDITS = [
		{
			id: 1,
			text: 'Founder/editor: Femi Adeyinka'
		},
		{
			id: 2,
			text: 'Data analysis/design/development: Tyler Machado'
		}
	];
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<link rel="canonical" href={canonical} />

	<meta property="og:type" content="article" />
	<meta property="og:site_name" content="GRAFFU" />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={ogImage} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	<meta name="twitter:image" content={ogImage} />

	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `<script type="application/ld+json">${jsonLd}</scr` + `ipt>`}
</svelte:head>

<!-- ── Hero: combined flow map with overlaid story header ──────────────── -->
<section class="hero-section">
	<div class="hero-map-wrap">
		<div class="hero-map">
			<WorldMap />
			<CombinedFlowLayer flows={combinedFlows} animate={true} />
		</div>
		<div class="hero-legend">
			<div class="hero-legend-dots">
				{#each confederations as confed (confed.confederation)}
					<span class="legend-item">
						<span class="legend-dot" style="background: {confed.color};"></span>
						{confed.confederation}
					</span>
				{/each}
			</div>
			<p class="combined-flow-desc">
				Player flows from national squad to club nation, aggregated across all World Cup tournaments 1994–2026.
				Arcs colored by source confederation. Filled circles = domestic retention.
			</p>
		</div>
	</div>
	<header class="story-header">
		<p class="story-eyebrow hidden md:block">African Football at the World Cup</p>
		<h1 class="story-headline">Club vs Country</h1>
		<p class="story-deck">
			Since 1994, African footballers have become the world’s most exported talent, yet the clubs and leagues that develop them have barely registered on football’s biggest stage.
		</p>
	</header>
</section>

<!-- ── Intro ────────────────────────────────────────────────────────────── -->
{#if introStep}
		{@const introParagraphs = introStep.text.split('\n\n')}
	<section class="prose-section prose-with-infobox">
		<div class="prose-copy">
			{#each introParagraphs as paragraph, i (i)}
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<p>{@html renderRef(paragraph)}</p>
			{/each}
		</div>
		<aside class="prose-infobox">
			<Infobox title="Basics of soccer squads">
				<p>In international soccer, 11 players are on the pitch at any given time, but each nation in the World Cup has 26 players on its squad in total (up from 22 or 23 in previous years).</p>
				<p>The stars of global soccer often play for two teams simultaneously; they represent their country’s national team in international competitions like the World Cup, but they spend most of the year with, and make most of their salaries from, club teams that could be based in their home country or anywhere else. Think clubs like Arsenal in the English Premier League, Barcelona in Spain’s La Liga, Orlando Pirates in South Africa’s Premier Soccer League and so on.</p>
				<p>The 2026 tournament is the first to feature 48 teams competing, up from 32 in other years since the 1990s.</p>
				<p>Every continent has a "confederation" that governs football in that region, although some countries choose to play in a geographically different confederation (e.g. Australia in AFC, Israel in UEFA).</p>
				<ul>
					<li><strong>UEFA</strong> — Europe</li>
					<li><strong>CONMEBOL</strong> — South America</li>
					<li><strong>CONCACAF</strong> — North & Central America and the Caribbean</li>
					<li><strong>AFC</strong> — Asia</li>
					<li><strong>CAF</strong> — Africa</li>
					<li><strong>OFC</strong> — Oceania (mostly island nations in the Pacific)</li>
				</ul>
			</Infobox>
		</aside>
	</section>
{/if}

<!-- ── Scrollytelling section ────────────────────────────────────────────── -->
<section class="scrolly-outer" bind:this={scrollySectionEl}>
	<div class="sticky-vis">
		<div class="sticky-layout">
			<div class="sticky-margin"></div>
			<div class="map-container" style="position: relative;" bind:clientWidth={mapContainerWidth} bind:clientHeight={mapContainerHeight}>
				<WorldMap scale={$mapScale} translate={$mapTranslate} />
				{#if scrollyNation}
					<FlowLayer squads={scrollySquads} nation={scrollyNation} scale={$mapScale} translate={$mapTranslate} />
				{/if}
			</div>
		</div>
	</div>

	<div class="steps-wrapper">
		<Scrolly bind:value={activeStep}>
			{#each scrollySteps as step, i (i)}
				<div class="step">
					<div class="step-card" class:active={activeStep === i}>
						<p class="step-title">{step.title}</p>
						<p class="step-text">{step.text}</p>
					</div>
				</div>
			{/each}
			<div class="step-spacer"></div>
		</Scrolly>
	</div>
</section>

<details class="map-legend-accordion" class:scrolly-active={scrollyVisible}>
	<summary>
		<div class="mla-header">
			<svg class="mla-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
				<path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/>
			</svg>
			<span class="mla-title">Map key</span>
		</div>
		<svg class="mla-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
			<line x1="12" y1="5" x2="12" y2="19"></line>
			<line x1="5" y1="12" x2="19" y2="12"></line>
		</svg>
	</summary>
	<ul class="mla-body">
		<li><strong>Filled circles:</strong> players who remain in their home country's domestic leagues ("domestic retention").</li>
		<li><strong>Curved arc lines:</strong> players who have moved abroad to play in foreign leagues, with the destination country indicated by where the arc terminates.</li>
		<li><strong>Thicker the arc:</strong> more players have moved to non-domestic clubs.</li>
		<li><strong>Larger circle over a country:</strong> more of that nation's squad is playing domestically.</li>
	</ul>
</details>

<!-- ── Outro ────────────────────────────────────────────────────────────── -->
{#if outroStep}
	<section class="prose-section">
		{#each outroStep.text.split('\n\n') as paragraph, i (i)}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<p>{@html renderRef(paragraph)}</p>
		{/each}
	</section>
{/if}

<div class="charts-row">
	<RetentionOverTime />
</div>

<div class="charts-row">
	<ConfederationShareOverTime />
</div>

<section class="prose-section">
	<p>
		The interactive map below shows all player flows from the squads of every World Cup tournament between 1994 and 2026. The size of the circles indicates the number of players who stayed in their home country's leagues, while the arcs show the most common international moves. Use the dropdown menus to explore.
	</p>
</section>

<!-- ── Interactive section ───────────────────────────────────────────────── -->
<InteractiveExplorer {allSquads} {years} />

<!-- ── Methodology ──────────────────────────────────────────────────────── -->
<section class="methodology-section">
	<h3 class="methodology-heading">Methodology &amp; Sources</h3>
	<ol class="methodology-list">
		{#each FOOTNOTES as note (note.id)}
			<li id="fn-{note.id}">{note.text}</li>
		{/each}
	</ol>
	<h3 class="methodology-heading">Credits</h3>
	<ol class="methodology-list">
		{#each CREDITS as credit (credit.id)}
			<li>{credit.text}</li>
		{/each}
	</ol>
</section>

<style>
	/* ── Scrollytelling ─────────────────────────────────────────────────────── */

	.scrolly-outer {
		position: relative;
		padding-top: 52px;
	}

	.sticky-vis {
		position: sticky;
		top: 0;
		height: 100vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.sticky-layout {
		width: 100%;
		display: block;
	}

	.sticky-margin {
		display: none;
	}

	.map-container {
		width: 100%;
	}

	.badge-year {
		font-size: 2.5rem;
		font-weight: 700;
		color: rgba(0, 0, 0, 0.15);
		line-height: 1;
	}

	.badge-nation {
		font-size: 0.85rem;
		font-weight: 600;
		color: rgba(0, 0, 0, 0.3);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.steps-wrapper {
		position: relative;
		z-index: 2;
		margin-top: -100vh;
		pointer-events: none;
	}

	.step {
		min-height: 85vh;
		display: flex;
		align-items: center;
		padding: 2rem;
		pointer-events: none;
	}

	.step-card {
		pointer-events: auto;
		max-width: 360px;
		background: rgba(255, 255, 255, 0.93);
		padding: 1.5rem 1.75rem;
		border-radius: 6px;
		box-shadow: 0 2px 16px rgba(0, 0, 0, 0.1);
		transition: opacity 0.4s ease;
		opacity: 0.35;
	}

	.step-card.active {
		opacity: 1;
	}

	.step-title {
		font-size: 1rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: #888;
		margin: 0 0 0.6rem;
	}

	.step-text {
		font-size: 0.95rem;
		line-height: 1.6;
		color: #222;
		margin: 0;
	}

	.step-spacer {
		height: 40vh;
	}

	@media (max-width: 768px) {
		.sticky-vis {
			justify-content: flex-end;
		}

		.map-container {
			height: 60vh;
			overflow: hidden;
		}

		.map-container :global(.map-wrap) {
			display: flex;
			justify-content: center;
			height: 100%;
		}

		.map-container :global(.world-svg) {
			height: 100%;
			width: calc(60vh * 960 / 500);
			max-width: none;
			flex-shrink: 0;
		}

		.map-container :global(.flow-layer) {
			height: 100%;
			width: calc(60vh * 960 / 500);
			max-width: none;
			left: 50%;
			transform: translateX(-50%);
		}

		.step {
			align-items: flex-start;
			padding: 0 1rem;
		}

		.step-card {
			max-width: 100%;
			padding: 0.75rem 1rem;
			box-shadow: none;
			border: 1px solid #e0e0e0;
		}

		.scrolly-outer {
			padding-top: 0;
		}
	}

	@media (min-width: 1100px) {
		.sticky-layout {
			width: 100%;
			display: block;
			padding: 0 1.5rem;
		}

		.sticky-margin {
			display: none;
		}
	}

	/* ── Hero section ──────────────────────────────────────────────────────── */

	.hero-section {
		width: 100%;
		background: #f5f4f0;
		display: flex;
		flex-direction: column;
	}

	.hero-map-wrap {
		position: relative;
		width: 100%;
		overflow: hidden;
		order: 2;
	}

	.hero-map {
		position: relative;
		width: 100%;
	}

	/* ── Story header ──────────────────────────────────────────────────────── */

	.story-header {
		order: 1;
		padding: 1rem 1rem 1.25rem;
		border-bottom: 1px solid #e0e0e0;
	}

	/* ── Hero legend ────────────────────────────────────────────────────────── */

	.hero-legend {
		order: 3;
		padding: 0.75rem 1rem 1rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.hero-legend-dots {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1.25rem;
		margin-bottom: 0.4rem;
	}

	@media (min-width: 769px) {
		.hero-section {
			display: block;
		}

		.story-header {
			border-bottom: none;
			padding: 1rem 1.25rem 1.5rem;
			margin-left: auto;
			max-width: 54%;
			margin-top: -5rem;
			position: relative;
			z-index: 1;
		}

		.hero-legend {
			position: absolute;
			left: 0;
			bottom: 0;
			max-width: 38%;
			padding: 0.6rem 1rem 0.5rem;
			background: rgba(245, 244, 240, 0.85);
			border-radius: 0 4px 0 0;
			border-bottom: none;
			order: unset;
		}
	}

	.story-eyebrow {
		font-size: 1rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: -0.02em;
		color: #999;
		margin: 0 0 0.33rem;
	}

	.story-headline {
		font-size: clamp(2.5rem, 5.5vw, 4.25rem);
		letter-spacing: -0.04em;
		font-weight: 400;
		line-height: 1.05;
		margin: 0 0 0.33rem;
		color: #111;
	}

	.story-deck {
		font-size: 1xrem;
		line-height: 1.2;
		color: #444;
		margin: 0 0 0.33rem;
		max-width: 580px;
	}

	/* ── Charts row ──────────────────────────────────────────────────────── */

	.charts-row {
		display: flex;
		flex-direction: column;
		max-width: 860px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	/* ── Prose sections ────────────────────────────────────────────────────── */

	.prose-section {
		max-width: 680px;
		margin: 0 auto;
		padding: 3rem 2rem;
		line-height: 1.7;
		color: #222;
	}

	.prose-section p {
		margin: 0 0 1.25rem;
		font-size: 0.95rem;
	}

	.prose-section p:last-child {
		margin-bottom: 0;
	}

	.prose-with-infobox {
		display: grid;
		gap: 1.5rem;
	}

	.prose-copy {
		min-width: 0;
	}

	.prose-infobox {
		width: 100%;
	}

	/* ── Map legend accordion ───────────────────────────────────────────────── */

	.map-legend-accordion {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: rgba(249, 247, 240, 0.96);
		border: 1px solid rgba(17, 17, 17, 0.1);
		border-bottom: none;
		box-shadow: 0 -4px 20px rgba(17, 17, 17, 0.08);
		border-radius: 12px 12px 0 0;
		overflow: clip;
		z-index: 9999;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.2s ease;
	}

	.map-legend-accordion.scrolly-active {
		opacity: 1;
		pointer-events: auto;
	}

	@media (min-width: 769px) {
		.map-legend-accordion {
			bottom: 1.5rem;
			right: 1.5rem;
			left: auto;
			width: 280px;
			border: 1px solid rgba(17, 17, 17, 0.1);
			box-shadow: 0 8px 32px rgba(17, 17, 17, 0.1);
			border-radius: 12px;
		}
	}

	.map-legend-accordion summary {
		list-style: none;
		cursor: pointer;
		padding: 0.85rem 1.1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.map-legend-accordion summary::-webkit-details-marker {
		display: none;
	}

	.mla-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.mla-icon {
		width: 1.1rem;
		height: 1.1rem;
		flex-shrink: 0;
		color: var(--color-cream-900);
		opacity: 0.85;
	}

	.mla-title {
		font-family: var(--font-display);
		font-size: 1rem;
		font-weight: 400;
		letter-spacing: -0.05em;
		text-transform: uppercase;
		color: var(--color-cream-900);
		line-height: 1;
	}

	.mla-toggle {
		width: 1.1rem;
		height: 1.1rem;
		flex-shrink: 0;
		color: var(--color-cream-900);
		opacity: 0.7;
		transition: transform 0.2s ease;
	}

	.map-legend-accordion[open] .mla-toggle {
		transform: rotate(45deg);
	}

	.mla-body {
		margin: 0;
		padding: 0 1.1rem 1rem 1.75rem;
		display: grid;
		gap: 0.55rem;
	}

	.mla-body li {
		font-size: 0.85rem;
		line-height: 1.5;
		color: #1b1b1b;
	}

	@media (min-width: 1100px) {
		.prose-with-infobox {
			max-width: 1040px;
			grid-template-columns: minmax(0, 680px) minmax(240px, 280px);
			align-items: start;
			column-gap: 2rem;
		}

		.prose-infobox {
			position: sticky;
			top: calc(var(--nav-height) + 1.5rem);
		}
	}

	.chart-container {
		width: 100%;
		max-width: 800px;
		padding: 0rem;
		margin-bottom: 1.5rem;
	}

	:global(.layercake-container) {
		height: 20px !important;
	}

	h2 {
		margin-top: 0;
		font-size: 1.5rem;
		margin-bottom: 0.25rem;
	}

	.confederation-section {
		width: 100%;
		max-width: 800px;
		margin-bottom: 2.5rem;
	}

	.confederation-section h2 {
		margin-bottom: 0.5rem;
	}

	.confed-row {
		display: grid;
		grid-template-columns: 100px 1fr 90px;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.confed-header-row {
		display: grid;
		grid-template-columns: 100px 1fr 90px;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.confed-axis-label-left {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #999;
		text-align: right;
	}

	.confed-axis-label-right {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #999;
	}

	.confed-label {
		font-size: 0.85rem;
		font-weight: 600;
		text-align: right;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.25rem;
	}

	.confed-arrow {
		color: #bbb;
		font-weight: 400;
	}

	.confed-bar-wrap {
		height: 40px;
	}

	:global(.confed-bar-wrap .layercake-container) {
		height: 40px !important;
	}

	.confed-count {
		font-size: 1rem;
		color: #888;
	}

	/* ── Methodology / footnotes ─────────────────────────────────────────────── */

	.methodology-section {
		max-width: 680px;
		margin: 0 auto;
		padding: 2rem 2rem 4rem;
		border-top: 1px solid #e0e0e0;
	}

	.methodology-heading {
		font-size: 1rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #aaa;
		margin: 0 0 0.75rem;
	}

	.methodology-list {
		font-size: 0.825rem;
		line-height: 1.65;
		color: #777;
		padding-left: 1.5rem;
		margin: 0;
	}

	.methodology-list li {
		margin-bottom: 0.5rem;
	}

	:global(.fn-ref) {
		font-size: 0.65em;
		vertical-align: super;
		color: #999;
		font-weight: 600;
	}

	.combined-flow-desc {
		font-family: var(--font-display);
		letter-spacing: -0.01em;
		font-size: 0.85rem;
		line-height: 1.25;
		color: #777;
		max-width: 640px;
		margin: 0;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: #444;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.legend-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}
</style>

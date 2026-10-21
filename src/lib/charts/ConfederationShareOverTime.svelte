<script>
	import clubConf1994 from '../../data/1994/club-confederation.json';
	import clubConf1998 from '../../data/1998/club-confederation.json';
	import clubConf2002 from '../../data/2002/club-confederation.json';
	import clubConf2006 from '../../data/2006/club-confederation.json';
	import clubConf2010 from '../../data/2010/club-confederation.json';
	import clubConf2014 from '../../data/2014/club-confederation.json';
	import clubConf2018 from '../../data/2018/club-confederation.json';
	import clubConf2022 from '../../data/2022/club-confederation.json';
	import clubConf2026 from '../../data/2026/club-confederation.json';

	/**
	 * Club confederation data by year
	 * @type {Record<number, any>}
	 */
	const clubConfData = {
		1994: clubConf1994,
		1998: clubConf1998,
		2002: clubConf2002,
		2006: clubConf2006,
		2010: clubConf2010,
		2014: clubConf2014,
		2018: clubConf2018,
		2022: clubConf2022,
		2026: clubConf2026
	};

	import { TOURNAMENT_YEARS as YEARS } from '$lib/constants.js';

	const CONF_META = [
		{ name: 'AFC',      highlight: false, color: '#CC0000' },
		{ name: 'CAF',      highlight: true,  color: '#009900' },
		{ name: 'CONCACAF', highlight: false, color: '#0000CC' },
		{ name: 'CONMEBOL', highlight: false, color: '#FF9900' },
		{ name: 'OFC',      highlight: false, color: '#FFB6C1' },
	];

	/** @type {Array<{ name: string; values: number[]; highlight: boolean; color: string }>} */
	const CONFEDERATIONS = CONF_META.map(({ name, highlight, color }) => ({
		name,
		highlight,
		color,
		values: YEARS.map((year) => {
			const data = clubConfData[year];
			if (!data || !data[name]) return 0;
			return Math.round(data[name].players_pct * 100);
		})
	}));

	const W = 640;
	const H = 260;
	const M = { top: 16, right: 72, bottom: 36, left: 36 };
	const IW = W - M.left - M.right;
	const IH = H - M.top - M.bottom;

	const xMin = YEARS[0];
	const xMax = YEARS[YEARS.length - 1];

	/** @param {number} year */
	function x(year) {
		return ((year - xMin) / (xMax - xMin)) * IW;
	}

	/** @param {number} value */
	function y(value) {
		return IH - (value / 25) * IH;
	}

	/** @param {number[]} values */
	function points(values) {
		return YEARS.map((yr, i) => `${x(yr)},${y(values[i])}`).join(' ');
	}

	const yTicks = [0, 5, 10, 15, 20, 25];
</script>

<figure class="conf-share-chart">
	<figcaption>
		<strong>Share of total World Cup players by club confederation, 1994–2026</strong>
		<span class="sub">Percentage of all tournament players who play their club football in each confederation (excluding UEFA)</span>
	</figcaption>
	<svg
		viewBox="0 0 {W} {H}"
		class="chart-svg"
		role="img"
		aria-label="Line chart showing each confederation's share of total World Cup players from 1994 to 2026, by where players play their club football (UEFA excluded). CAF, highlighted, holds a small and declining share — falling from around 5–6% in the 1990s to 2–4% by 2026 — even as more African nations qualify, reflecting how African players are based at clubs abroad."
	>
		<g transform="translate({M.left},{M.top})">
			<!-- Grid lines and Y labels -->
			{#each yTicks as tick}
				<line x1={0} y1={y(tick)} x2={IW} y2={y(tick)} class="grid-line" />
				<text x={-6} y={y(tick)} dy="0.35em" class="axis-label axis-label--y">{tick}%</text>
			{/each}

			<!-- X labels -->
			{#each YEARS as yr}
				<text x={x(yr)} y={IH + 20} class="axis-label axis-label--x axis-label--x-desktop">{yr}</text>
				<text
					x={x(yr)}
					y={IH + 20}
					class="axis-label axis-label--x axis-label--x-mobile"
					transform={`rotate(-45 ${x(yr)} ${IH + 20})`}
				>{yr}</text>
			{/each}

			<!-- Lines — draw non-highlighted first so CAF renders on top -->
			{#each CONFEDERATIONS as conf}
				{@const lx = x(YEARS[YEARS.length - 1])}
				{@const ly = y(conf.values[conf.values.length - 1])}
				<polyline
					points={points(conf.values)}
					fill="none"
					stroke={conf.color}
					stroke-width={conf.highlight ? 2.5 : 1.5}
					stroke-linejoin="round"
					stroke-linecap="round"
					opacity={conf.highlight ? 1 : 0.3}
				/>
				<circle cx={lx} cy={ly} r={conf.highlight ? 4 : 3} fill={conf.color} opacity={conf.highlight ? 1 : 0.3} />
				<text
					x={lx + 7}
					y={ly}
					dy="0.35em"
					class="conf-label"
					class:conf-label--highlight={conf.highlight}
					style:fill={conf.color}
					style:opacity={conf.highlight ? '1' : '0.35'}
				>{conf.name}</text>
			{/each}
		</g>
	</svg>
</figure>

<style>
	.conf-share-chart {
		width: 100%;
		margin: 0 auto 2.5rem;
		padding: 0 1.5rem;
	}

	figcaption {
		margin-bottom: 0.75rem;
	}

	figcaption strong {
		display: block;
		font-family: var(--font-display);
		font-size: 1.1rem;
		font-weight: 700;
		color: #111;
		margin-bottom: 0.3rem;
	}

	.sub {
		font-family: var(--font-display);
		font-size: 0.95rem;
		color: #888;
	}

	.chart-svg {
		width: 100%;
		height: auto;
		overflow: visible;
		display: block;
	}

	.grid-line {
		stroke: #e8e8e8;
		stroke-width: 1;
	}

	.axis-label {
		font-size: 14px;
		fill: #aaa;
		font-family: var(--font-display);
	}

	.axis-label--y {
		text-anchor: end;
	}

	.axis-label--x {
		text-anchor: middle;
	}

	.axis-label--x-mobile {
		display: none;
	}

	.conf-label {
		font-size: 14px;
		font-family: var(--font-display);
	}

	.conf-label--highlight {
		font-size: 15px;
		font-weight: 400;
	}

	@media (max-width: 640px) {
		/* SVG text scales with the viewBox; increase source sizes on small screens. */
		.axis-label {
			font-size: 28px;
		}

		.axis-label--x-desktop {
			display: none;
		}

		.axis-label--x-mobile {
			display: block;
			text-anchor: end;
		}

		.conf-label {
			font-size: 20px;
		}

		.conf-label--highlight {
			font-size: 22px;
		}
	}
</style>

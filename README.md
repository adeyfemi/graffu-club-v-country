# Club vs Country

An interactive visual essay from [GRAFFU](https://graffu.com/) about where African World Cup players play their club football, 1994–2026.

**Live:** https://graffu.com/club-v-country/

Built with SvelteKit 2 (Svelte 5 runes), Tailwind 4, LayerCake and d3, and prerendered to static files with `@sveltejs/adapter-static`.

## Developing

```sh
npm install
npm run dev
```

The app runs under its base path even in development. Open **http://localhost:5173/club-v-country/**; the bare `localhost:5173/` returns a 404.

| Command           | What it does                          |
| ----------------- | ------------------------------------- |
| `npm run dev`     | Dev server                            |
| `npm run build`   | Static build into `build/`            |
| `npm run preview` | Serve the build at `/club-v-country/` |
| `npm run check`   | `svelte-check` type checking          |
| `npm run lint`    | Prettier + ESLint                     |
| `npm run format`  | Prettier write                        |

## Data

All data lives in `src/data/` and is imported directly into components (no runtime fetches).

- `src/data/<year>/squads.json`: raw squad lists per tournament (player → club nation)
- `src/data/<year>/retention.json`, `club-confederation.json`: derived per-year stats
- `src/data/squad-club-nations.json`: slimmed copy of all squads, the only squad file shipped to the browser
- `src/data/teams.json`, `confederations.json`: nation → confederation and colors
- `src/data/scrolly-steps.csv` → `scrolly-steps.json`: the scrollytelling copy

Scripts in `scripts/`:

| Command                                        | What it does                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `npm run scrape-wiki -- <year>`                | Scrape a tournament's squads from Wikipedia                                                |
| `node scripts/normalize-club-nations.js --all` | Normalize `club_nation` values to country names (`--dry-run` available)                    |
| `node scripts/compute-retention.js`            | Regenerate each year's `retention.json`                                                    |
| `node scripts/compute-club-confederation.js`   | Regenerate each year's `club-confederation.json`                                           |
| `npm run slim-data`                            | Regenerate `squad-club-nations.json`. **Run after editing any `squads.json`.**             |
| `npm run copy`                                 | Convert `scrolly-steps.csv` to JSON. **Run after editing the copy.**                       |
| `npm run fetch-data`                           | Fetch team data from API-Football (needs `FOOTBALL_API_KEY` in `.env`, see `.env.example`) |

To add a tournament, add the year to `TOURNAMENT_YEARS` in `src/lib/constants.js` and to the `years` arrays in the compute scripts.

## Deployment

The site is deployed as its own Netlify site. Visitors reach it through the GRAFFU home site, which proxies it as a subfolder:

```
https://graffu.com/club-v-country/*  →  https://<this-site>.netlify.app/:splat   (200 rewrite)
```

The home site's rewrite strips the `/club-v-country` prefix before forwarding, so this site's files live at its root. The page itself still runs at `/club-v-country/`, so every URL it emits must carry that prefix. Otherwise the browser asks graffu.com for `/_app/...`, which is the home site's path, not this one's.

How that's handled:

- **Base path.** `svelte.config.js` sets `kit.paths.base` to `/club-v-country`. Set the `BASE_PATH` environment variable to override it, or `BASE_PATH=''` for a root build.
- **Absolute asset URLs.** `kit.paths.relative: false` makes the build emit `/club-v-country/_app/...` instead of `./_app/...`. Relative URLs would break when someone visits `graffu.com/club-v-country` without the trailing slash.
- **This site's own URL.** `netlify.toml` rewrites `/club-v-country/*` to `/:splat`, so `https://<this-site>.netlify.app/club-v-country/` works too.
- **SEO URLs.** The canonical, Open Graph and JSON-LD URLs are built from `SITE_URL` (`src/lib/constants.js`) plus `base`. `static/sitemap.xml` and `static/robots.txt` hardcode the full `https://graffu.com/club-v-country/` URLs.

### Rules for new code

- Use `base` from `$app/paths` for anything in `static/` (`` `${base}/fonts/...` ``) and `resolve('/route')` for internal links. Never write a bare `"/something"`.
- Import images and data through Vite (`import img from '$lib/assets/x.png'`) where possible; Vite prefixes those automatically.
- Links to the GRAFFU homepage use `SITE_URL` (the header logo links to `https://graffu.com/`, not this project's root).
- To check a build, run `npm run build && npm run preview`, open `/club-v-country/`, and confirm that no request in the Network tab goes to an unprefixed path.

### Renaming the subfolder

The path `club-v-country` must match the home site's rewrite. If that rewrite changes, update all of these together:

- `svelte.config.js` (`paths.base`)
- `netlify.toml` (both `from` values)
- `static/sitemap.xml`
- `static/robots.txt`
- the Live URL at the top of this README

### Not handled in this repo

These live in the home site's config:

- **robots.txt.** Crawlers only read `robots.txt` at the domain root, so `static/robots.txt` here has no effect on graffu.com. The home site's `robots.txt` should reference `https://graffu.com/club-v-country/sitemap.xml`.
- **No trailing slash.** A home-site rule for `/club-v-country/*` may not match the bare `/club-v-country`, so the home site needs its own rule for that path.

import adapter from '@sveltejs/adapter-static';
import { relative, sep } from 'node:path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// defaults to rune mode for the project, except for `node_modules`. Can be removed in svelte 6.
		runes: ({ filename }) => {
			const relativePath = relative(import.meta.dirname, filename);
			const pathSegments = relativePath.toLowerCase().split(sep);
			const isExternalLibrary = pathSegments.includes('node_modules');

			return isExternalLibrary ? undefined : true;
		}
	},
	kit: {
		adapter: adapter({ fallback: '404.html' }),
		paths: {
			// Served at https://graffu.com/club-vs-country/ via a proxy rewrite on the home site.
			// BASE_PATH overrides this; set BASE_PATH='' for a root build.
			base: process.env.BASE_PATH ?? '/club-vs-country',
			// Emit absolute, base-prefixed asset URLs so they resolve whether or not the
			// proxied URL has a trailing slash.
			relative: false
		}
	}
};

export default config;

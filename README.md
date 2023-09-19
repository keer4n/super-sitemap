<div align="center">
  <img src="https://github.com/jasongitmail/super-sitemap/assets/50032291/21f48ff3-aba5-49b9-a857-3c0b6806750a" alt="project banner" />
  <h1 align="center">Super Sitemap</h1>

  <a href="https://github.com/jasongitmail/super-sitemap/actions/workflows/ci.yml">
    <img alt="unit tests badge" src="https://img.shields.io/github/actions/workflow/status/jasongitmail/super-sitemap/ci.yml?label=tests">
  </a>
  <a href="https://github.com/jasongitmail/super-sitemap/blob/main/LICENSE">
    <img alt="license badge" src="https://img.shields.io/npm/l/super-sitemap?color=limegreen">
  </a>
  <a href="https://www.npmjs.com/package/super-sitemap">
    <img alt="npm badge" src="https://img.shields.io/npm/v/super-sitemap?color=limegreen">
  </a>
  <br/>
  <p>SvelteKit sitemap focused on ease of use and making it impossible to forget to add your paths.</p>
</div>

## Table of Contents

- [Features](#features)
- [Limitations](#limitations)
- [Installation](#installation)
- [Usage](#usage)
  - [Basic example](#basic-example)
  - [The "everything" example](#the-everything-example)
  - [Sampled URLs](#sampled-urls)
  - [Sampled Paths](#sampled-paths)
- [Robots.txt](#robotstxt)
- [Note on prerendering](#note-on-prerendering)
- [Example output](#example-output)
- [Changelog](#changelog)

## Features

- 🤓 Supports any rendering method.
- 🪄 Automatically collects routes from `/src/routes` using Vite + data for route
  parameters provided by you.
- 🧠 Easy maintenance–accidental omission of data for parameterized routes
  throws an error and requires the developer to either explicitly exclude the
  route pattern or provide an array of data for that param value.
- 👻 Exclude specific routes or patterns using regex patterns (e.g.
  `^/dashboard.*`, paginated URLs, etc).
- 🚀 Defaults to 1h CDN cache, no browser cache.
- 💆 Set custom headers to override [default headers](https://github.com/jasongitmail/super-sitemap/blob/main/src/lib/sitemap.ts#L84-L85):
  `sitemap.response({ headers: {'cache-control: '...'}, ...})`.
- 🫡 Uses [SvelteKit's recommended sitemap XML
  structure](https://kit.svelte.dev/docs/seo#manual-setup-sitemaps).
- 💡 Google, and other modern search engines, [ignore `priority` and
  `changefreq`](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap#xml)
  and use their own heuristics to determine when to crawl pages on your site. As
  such, these properties are not included by default to minimize KB size and
  enable faster crawling. Optionally, you can enable them like so:
  `sitemap.response({ changefreq:'daily', priority: 0.7, ...})`.
- 🧪 Well tested.
- 🫶 Built with TypeScript.

## Limitations

- A future version could build a [sitemap
  index](https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps)
  when total URLs exceed >50,000, which is the max quantity Google will read in
  a single `sitemap.xml` file.
- Excludes `lastmod` from each item, but a future version could include it for
  parameterized data items. Obviously, `lastmod` would be indeterminate for
  non-parameterized routes, such as `/about`. Due to this, Google would likely
  ignore `lastmod` anyway since they only respect if it's ["consistently and
  verifiably
  accurate"](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap#additional-notes-about-xml-sitemaps).
- [Image](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps)
  or
  [video](https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps)
  sitemap extensions.

## Installation

`npm i -D super-sitemap`

or

`bun add -d super-sitemap`

Then see [Usage](#usage) and [Robots.txt](#robotstxt) sections.

## Usage

Before getting started, create these three env files within your project. These will define the site
origin used for URLs within for your sitemap:

```sh
# .env
PUBLIC_ORIGIN='https://example.com'
```

```sh
# .env.development
PUBLIC_ORIGIN='http://localhost:5173'
```

```sh
# .env.testing
PUBLIC_ORIGIN='http://localhost:4173'
```

### Basic example

JavaScript:

```js
// /src/routes/sitemap.xml/+server.js
import * as sitemap from 'super-sitemap';

export const GET = async () => {
  return await sitemap.response({
    origin: 'https://example.com'
  });
};
```

TypeScript:

```ts
// /src/routes/sitemap.xml/+server.ts
import * as sitemap from 'super-sitemap';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  return await sitemap.response({
    origin: 'https://example.com'
  });
};
```

### The "everything" example

All aspects of the below example are optional, except for `origin` and
`paramValues` to provide data for parameterized routes.

JavaScript:

```js
// /src/routes/sitemap.xml/+server.js
import * as env from '$env/static/public';
import * as sitemap from 'super-sitemap';
import * as blog from '$lib/data/blog';

export const prerender = true; // optional

export const GET = async () => {
  // Get data for parameterized routes
  let blogSlugs, blogTags;
  try {
    [blogSlugs, blogTags] = await Promise.all([blog.getSlugs(), blog.getTags()]);
  } catch (err) {
    throw error(500, 'Could not load data for param values.');
  }

  return await sitemap.response({
    origin: env.PUBLIC_ORIGIN,
    excludePatterns: [
      '^/dashboard.*', // e.g. routes starting with `/dashboard`
      `.*\\[page=integer\\].*` // e.g. routes containing `[page=integer]`–e.g. `/blog/2`
    ],
    paramValues: {
      '/blog/[slug]': blogSlugs, // e.g. ['hello-world', 'another-post']
      '/blog/tag/[tag]': blogTags, // e.g. ['red', 'green', 'blue']
      '/campsites/[country]/[state]': [
        ['usa', 'new-york'],
        ['usa', 'california'],
        ['canada', 'toronto']
      ]
    },
    headers: {
      'custom-header': 'foo' // case insensitive; xml content type & 1h CDN cache by default
    },
    additionalPaths: [
      '/foo.pdf' // e.g. to a file in your static dir
    ],
    changefreq: 'daily', // excluded by default b/c ignored by modern search engines
    priority: 0.7, // excluded by default b/c ignored by modern search engines
    sort: 'alpha' // default is false; 'alpha' sorts all paths alphabetically.
  });
};
```

TypeScript:

```ts
// /src/routes/sitemap.xml/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import * as env from '$env/static/public';
import * as sitemap from 'super-sitemap';
import * as blog from '$lib/data/blog';

export const prerender = true; // optional

export const GET: RequestHandler = async () => {
  // Get data for parameterized routes
  let blogSlugs, blogTags;
  try {
    [blogSlugs, blogTags] = await Promise.all([blog.getSlugs(), blog.getTags()]);
  } catch (err) {
    throw error(500, 'Could not load data for param values.');
  }

  return await sitemap.response({
    origin: env.PUBLIC_ORIGIN,
    excludePatterns: [
      '^/dashboard.*', // e.g. routes starting with `/dashboard`
      `.*\\[page=integer\\].*` // e.g. routes containing `[page=integer]`–e.g. `/blog/2`
    ],
    paramValues: {
      '/blog/[slug]': blogSlugs, // e.g. ['hello-world', 'another-post']
      '/blog/tag/[tag]': blogTags, // e.g. ['red', 'green', 'blue']
      '/campsites/[country]/[state]': [
        ['usa', 'new-york'],
        ['usa', 'california'],
        ['canada', 'toronto']
      ]
    },
    headers: {
      'custom-header': 'foo' // case insensitive; xml content type & 1h CDN cache by default
    },
    additionalPaths: [
      '/foo.pdf' // e.g. to a file in your static dir
    ],
    changefreq: 'daily', // excluded by default b/c ignored by modern search engines
    priority: 0.7, // excluded by default b/c ignored by modern search engines
    sort: 'alpha' // default is false; 'alpha' sorts all paths alphabetically.
  });
};
```

## Sampled URLs

Sampled URLs provides a utility to obtain a sample URL for each unique route on your site–i.e.:

1.  the URL for every static route (e.g. `/`, `/about`, `/pricing`, etc.), and
2.  one URL for each parameterized route (e.g. `/blog/[slug]`)

This can be helpful for writing functional tests, performing SEO analyses of your public pages, &
similar.

This data is generated by analyzing your site's `sitemap.xml`, so keep in mind that it will not
contain any URLs excluded by `excludePatterns` in your sitemap config.

```js
import { sampledUrls } from 'super-sitemap';

const urls = await sampledUrls('http://localhost:5173/sitemap.xml');
// [
//   'http://localhost:5173/',
//   'http://localhost:5173/about',
//   'http://localhost:5173/pricing',
//   'http://localhost:5173/features',
//   'http://localhost:5173/login',
//   'http://localhost:5173/signup',
//   'http://localhost:5173/blog',
//   'http://localhost:5173/blog/hello-world',
//   'http://localhost:5173/blog/tag/red',
// ]
```

### Limitations

1. Result URLs will not include any `additionalPaths` from your sitemap config because it's
   impossible to identify those by a pattern given only your routes and `sitemap.xml` as inputs.
2. `sampledUrls()` does not distinguish between routes that differ only due to a pattern matcher.
   For example, `/foo/[foo]` and `/foo/[foo=integer]` will evaluated as `/foo/[foo]` and one sample
   URL will be returned.

## Sampled Paths

Same as [Sampled URLs](#sampled-urls), except it returns paths.

```js
import { sampledPaths } from 'super-sitemap';

const urls = await sampledPaths('http://localhost:5173/sitemap.xml');
// [
//   '/about',
//   '/pricing',
//   '/features',
//   '/login',
//   '/signup',
//   '/blog',
//   '/blog/hello-world',
//   '/blog/tag/red',
// ]
```

## Robots.txt

It's important to create a `robots.txt` so search engines know where to find your sitemap.

You can create it at `/static/robots.txt`:

```text
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
```

Or, at `/src/routes/robots.txt/+server.ts`, to use `PUBLIC_ORIGIN` that you [set in your project's
`.env` files](#usage) earlier:

```ts
import * as env from '$env/static/public';

export const prerender = true;

export async function GET(): Promise<Response> {
  // prettier-ignore
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${env.PUBLIC_ORIGIN}/sitemap.xml`
  ].join('\n').trim();

  const headers = {
    'Content-Type': 'text/plain'
  };

  return new Response(body, { headers });
}
```

## Note on prerendering

💡 If you set `export const prerender = true;` within your
`/src/routes/sitemap.xml/+server.ts` file, you can find `sitemap.xml` is
generated in your `.svelte-kit` build dir ✅.

But when you run `npm run preview`, you will notice the SvelteKit preview server
sets a `text/html` content type on the response 😱. This is [due to the preview
server's limitations](https://github.com/sveltejs/kit/issues/9408), because it's
the web server's responsibility to set the content type response header when
serving static files.

However, production hosts like Cloudflare, Vercel, Netlify, & others are
smarter and set `'content-type': 'application/xml'` when serving your
prerendered `sitemap.xml` file 😅. Or if not prerendering your sitemap,
`'content-type': 'application/xml'` is set by Super Sitemap's default response
headers 👌.

The above is also true for `robots.txt`, which uses a `text/plain` mime type.

## Example output

```xml
<urlset
    xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:news="https://www.google.com/schemas/sitemap-news/0.9"
    xmlns:xhtml="https://www.w3.org/1999/xhtml"
    xmlns:mobile="https://www.google.com/schemas/sitemap-mobile/1.0"
    xmlns:image="https://www.google.com/schemas/sitemap-image/1.1"
    xmlns:video="https://www.google.com/schemas/sitemap-video/1.1">
    <url>
        <loc>https://example/</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://example/about</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://example/blog</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://example/login</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://example/pricing</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://example/privacy</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://example/signup</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://example/support</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://example/terms</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://example/blog/hello-world</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://example/blog/another-post</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://example/blog/tag/red</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://example/blog/tag/green</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://example/blog/tag/blue</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://example/campsites/usa/new-york</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://example/campsites/usa/california</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://example/campsites/canada/toronto</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>https://example/foo.pdf</loc>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
</urlset>
```

## Changelog

- `0.13.0` - Adds [`sampledUrls()`](#sampled-urls) and [`sampledPaths()`](#sampled-paths).
- `0.12.0` - Adds config option to sort `'alpha'` or `false` (default).
- `0.11.0` - BREAKING: Rename to `super-sitemap` on npm! 🚀
- `0.10.0` - Adds ability to use unlimited dynamic params per route! 🎉
- `0.9.0` - BREAKING: Adds configurable `changefreq` and `priority` and
  _excludes these by default_. See the README's features list for why.
- `0.8.0` - Adds ability to specify `additionalPaths` that live outside
  `/src/routes`, such as `/foo.pdf` located at `/static/foo.pdf`.

## Developing

```bash
git clone https://github.com/jasongitmail/super-sitemap.git
bun install
# Then edit files in `/src/lib`
```

## Publishing

A new version of this npm package is automatically published when the semver
version within `package.json` is incremented.

## Credits

- Built by [x.com/@zkjason\_](https://twitter.com/zkjason_)
- Made possible by [SvelteKit](https://kit.svelte.dev/) & [Svelte](https://svelte.dev/).

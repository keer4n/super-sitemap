import { XMLParser } from 'fast-xml-parser';

import { filterRoutes } from './sitemap';

/**
 * Given the URL to this project's sitemap, _which must have been generated by
 * Super Sitemap for this to work as designed_, returns an array containing:
 * 1. the URL of every static route, and
 * 2. one URL for every parameterized route.
 *
 * ```js
 * // Example result:
 * [ 'http://localhost:5173/', 'http://localhost:5173/about', 'http://localhost:5173/blog', 'http://localhost:5173/blog/hello-world', 'http://localhost:5173/blog/tag/red' ]
 * ```
 *
 * @public
 * @param sitemapUrl - E.g. http://localhost:5173/sitemap.xml
 * @returns Array of URLs, one for each route, sorted alphabetically
 *
 * @remarks
 * - This is intended as a utility to gather unique URLs for SEO analysis,
 *   functional tests for public routes, etc.
 * - As a utility, the design favors ease of use for the developer over runtime
 *   performance, and consequently consumes `/sitemap.xml` directly, to avoid
 *   the developer needing to recreate and maintain a duplicate sitemap config,
 *   param values, exclusion rules, etc.
 * - LIMITATIONS:
 *   1. The result does not include `additionalPaths` from the sitemap config
 *      b/c it's impossible to identify those by pattern using only the result.
 *   2. This does not distinguish between routes that differ only due to a
 *      pattern matcher–e.g.`/foo/[foo]` and `/foo/[foo=integer]` will evaluated
 *      as `/foo/[foo]` and one sample URL will be returned.
 */
export async function sampledUrls(sitemapUrl: string): Promise<string[]> {
  const response = await fetch(sitemapUrl);
  const sitemapXml = await response.text();
  return await _sampledUrls(sitemapXml);
}

/**
 * Given the URL to this project's sitemap, _which must have been generated by
 * Super Sitemap for this to work as designed_, returns an array containing:
 * 1. the path of every static route, and
 * 2. one path for every parameterized route.
 *
 * ```js
 * // Example result:
 * [ '/', '/about', '/blog', '/blog/hello-world', '/blog/tag/red' ]
 * ```
 *
 * @public
 * @param sitemapUrl - E.g. http://localhost:5173/sitemap.xml
 * @returns Array of paths, one for each route, sorted alphabetically
 *
 * @remarks
 * - This is intended as a utility to gather unique paths for SEO analysis,
 *   functional tests for public routes, etc.
 * - As a utility, the design favors ease of use for the developer over runtime
 *   performance, and consequently consumes `/sitemap.xml` directly, to avoid
 *   the developer needing to recreate and maintain a duplicate sitemap config,
 *   param values, exclusion rules, etc.
 * - LIMITATIONS:
 *   1. The result does not include `additionalPaths` from the sitemap config
 *      b/c it's impossible to identify those by pattern using only the result.
 *   2. This does not distinguish between routes that differ only due to a
 *      pattern matcher–e.g.`/foo/[foo]` and `/foo/[foo=integer]` will evaluated
 *      as `/foo/[foo]` and one sample path will be returned.
 */
export async function sampledPaths(sitemapUrl: string): Promise<string[]> {
  const response = await fetch(sitemapUrl);
  const sitemapXml = await response.text();
  return await _sampledPaths(sitemapXml);
}

/**
 * Given the body of this site's sitemap.xml, returns an array containing:
 * 1. the URL of every static (non-parameterized) route, and
 * 2. one URL for every parameterized route.
 *
 * @private
 * @param sitemapXml - The XML string of the sitemap to analyze. This must have
 *                     been created by Super Sitemap to work as designed.
 * @returns Array of URLs, sorted alphabetically
 */
export async function _sampledUrls(sitemapXml: string): Promise<string[]> {
  const parser = new XMLParser();
  const sitemap = parser.parse(sitemapXml);

  const urls = sitemap.urlset.url.map((x: any) => x.loc);
  let routes = Object.keys(import.meta.glob('/src/routes/**/+page.svelte'));

  // Filter to reformat from file paths into site paths. excludePatterns are
  // left empty because these were applied when sitemap.xml was generated.
  routes = filterRoutes(routes, []);

  const staticRoutes = [];
  const dynamicRoutes = [];
  for (const route of routes) {
    if (/\[.*\]/.test(route)) {
      dynamicRoutes.push(route);
    } else {
      staticRoutes.push(route);
    }
  }

  const ORIGIN = new URL(urls[0]).origin;

  const staticRouteUrls = new Set(staticRoutes.map((path) => ORIGIN + path));

  // Remove static route URLs.
  // - This is necessary for situations where the dev has used SvelteKit's route
  //   specificity rules, using paths like `/about` and `/[foo]`. As such, we
  //   must remove `/about` & other static routes, to get predictable results
  //   when we sample URLs for dynamic routes.
  const dynamicRouteUrls = urls.filter((url: string) => !staticRouteUrls.has(url));
  console.log('dynamicRouteUrls', dynamicRouteUrls);

  // Convert dynamic routes into regex patterns.
  // - Use Set to make unique. Duplicates could occur given we haven't applied
  //   excludePatterns to the dynamic **routes** (e.g. `/blog/[page=integer]`
  //   and `/blog/[slug]` both become `/blog/[^/]+`). When we sample URLs for
  //   each of these patterns, however the excluded patterns won't exist in the
  //   URLs from the sitemap, so it's not a problem.
  // - ORIGIN is required, otherwise a false match could be found when one
  //   pattern is a subset of a another. Merely terminating with "$" is not
  //   sufficient an overlapping subset could still be found from the end.
  let regexPatterns = new Set(
    dynamicRoutes.map((path: string) => {
      let regexPattern = path.replace(/\[[^\]]+\]/g, '[^/]+');
      return ORIGIN + regexPattern + '$';
    })
  );

  // Get up to one URL for each dynamic route's regex pattern.
  // - A regex pattern may exist in these routes that was excluded by the
  //   exclusionPatterns when the sitemap was generated. This is OK because no
  //   URLs will exist to be matched with them. We don't want to  require
  //   exclusionPatterns again to keep the DX simple. Such patterns won't return
  //   a match, which is what we want.
  const sampledDynamicUrls = findFirstMatches(regexPatterns, dynamicRouteUrls);

  return [...staticRouteUrls, ...sampledDynamicUrls].sort();
}

/**
 * Given the body of this site's sitemap.xml, returns an array containing:
 * 1. the path of every static (non-parameterized) route, and
 * 2. one path for every parameterized route.
 *
 * @private
 * @param sitemapXml - The XML string of the sitemap to analyze. This must have
 *                     been created by Super Sitemap to work as designed.
 * @returns Array of paths, sorted alphabetically
 */
export async function _sampledPaths(sitemapXml: string): Promise<string[]> {
  const urls = await _sampledUrls(sitemapXml);
  return urls.map((url: string) => new URL(url).pathname);
}

/**
 * Given a set of strings, return the first matching string for every regex
 * within a set of regex patterns. It is possible and allowed for no match to be
 * found for a given regex.
 *
 * @private
 * @param regexPatterns - Set of regex patterns to search for.
 * @param haystack - Array of strings to search within.
 * @returns Set of strings where each is the first match found for a pattern.
 *
 * @example
 * ```ts
 * const patterns = new Set(["a.*", "b.*"]);
 * const haystack = ["apple", "banana", "cherry"];
 * const result = findFirstMatches(patterns, haystack); // Set { 'apple', 'banana' }
 * ```
 */
export function findFirstMatches(regexPatterns: Set<string>, haystack: string[]): Set<string> {
  const firstMatches = new Set<string>();

  for (const pattern of regexPatterns) {
    const regex = new RegExp(pattern);

    for (const needle of haystack) {
      if (regex.test(needle)) {
        firstMatches.add(needle);
        break;
      }
    }
  }

  return firstMatches;
}

# Analytics loading

The blog, profile, toolbox and AniShelf marketing site use the existing
Cloudflare Web Analytics token with a local loader. The loader starts the beacon
in a new task after `window.load`, so a failed analytics download cannot delay
page readiness. It preserves the original proxied-site configuration, including
SPA tracking mode 2, the same-origin `/cdn-cgi/rum` collector and EU exclusion,
checking the visitor country through the same-origin `/cdn-cgi/trace` endpoint.
An unknown country or a failed country lookup skips analytics.

The blog's build also adds the loader to standalone lab pages, slides and
redirects. The public source HTML remains unchanged. Content is visible without
JavaScript; `main.js` provides the optional entrance animation independently of
`DOMContentLoaded`.

## Cutover

1. Deploy the loader to all four sites first. While automatic injection remains
   active, the loader detects the existing beacon and avoids duplicate pageviews.
2. Apply `infra/cloudflare/manual-analytics.json` to the `konakona.dev`
   configuration ruleset using `cf rulesets rules create` for the first cutover,
   or `cf rulesets rules update` for an existing rule. It turns off automatic
   RUM injection for GET/HEAD requests to only those four hosts. POST and OPTIONS
   requests must remain outside this rule so the collector stays enabled.
   Keep the zone's analytics site, token and other hosts' automatic injection
   enabled.
3. Verify browser HTML, not just curl's default response: Cloudflare may omit
   the automatic beacon for non-browser user agents. Each page should contain
   one local loader and one dynamically inserted, async beacon after load.
4. Hold the beacon download open for 30 seconds and verify that page readiness
   and content visibility complete beforehand. With the beacon available,
   verify the original token and SPA tracking in outgoing analytics payloads.

The existing Notes exclusion must remain in place. NAS File Browser and TV are
separate hosted applications and retain automatic injection until their serving
configuration has an equivalent replacement. qBittorrent currently blocks the
injected beacon through its CSP. The `slides` hostname and legacy blog/tools
domains redirect to the main sites and inherit their behavior.

For rollback, disable the new hostname rule before reverting the local loaders;
the duplicate check keeps the overlap safe.

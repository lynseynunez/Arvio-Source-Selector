# Arvio Universal Source Selector

Experimental Stremio-compatible add-on for Arvio. **Not deployed or device-tested yet.**

## Supported subscriptions
Netflix, Disney+, Peacock, Paramount+, Crunchyroll. Real-Debrid continues through existing Torrentio/Comet add-ons.

## How v0.2 works
1. Receives an IMDb movie or series ID from Arvio.
2. Uses TMDB's `/find` and `/watch/providers` endpoints to find US **flatrate** streaming availability.
3. Filters results to your subscriptions.
4. Returns `externalUrl` pointing to TMDB's title-specific viewing-options page. This is **not** a direct link into the provider app and **not** an episode-specific availability check.
5. Returns no streams when unconfigured, missing availability, or if TMDB fails.

## Setup
- Node.js 20 or later
- A TMDB API Read Access Token from https://www.themoviedb.org/settings/api
- Set environment variable `TMDB_BEARER_TOKEN` (do not commit tokens)
- Run `npm start`
- Test `http://localhost:3000/health` and `http://localhost:3000/manifest.json`
- Host the server on public HTTPS before installing its `https://YOUR-HOST/manifest.json` in Arvio.

## Known limitations
- The Stremio add-on API cannot force a unified **Always Ask** popup or merge/reorder other add-ons' Real-Debrid streams.
- TMDB availability is title-level for series, not guaranteed per episode.
- Streaming-provider IDs and availability must be validated with live TMDB responses.
- Links open TMDB viewing-options pages; direct app deep links require additional development and per-device testing.
- No streaming account credentials are collected.
- The prototype has not yet been deployed, installed, or tested in Arvio.

## Next
Validate provider IDs, configure the TMDB token securely, deploy to HTTPS, and test Android phone, tablet, and Chromecast behavior.

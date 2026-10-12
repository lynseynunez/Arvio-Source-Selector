# Arvio Source Selector

Early **prototype**, not yet ready for installation in Arvio.

## Goal
Offer user-selected playback sources across Crunchyroll, Netflix, Disney+, Peacock, Paramount+ and existing Real-Debrid add-ons on multiple devices.

## Current implementation
- Stremio-compatible manifest at `/manifest.json`
- Stream endpoint at `/stream/movie/tt0133093.json` (and series episode IDs)
- Returns an empty stream list deliberately until title identification and **US-specific subscription availability** are verified.
- Does not touch Torrentio, Comet, Real-Debrid, or the Arvio-Playlist repository.

## Run locally
Requires Node.js 20+. Run `npm start`, then visit `http://localhost:3000/manifest.json`.

## Next steps
1. Choose and integrate a legitimate availability metadata source.
2. Resolve IMDb title and episode IDs accurately.
3. Verify external URL compatibility on Android TV, Android mobile, and other Arvio clients.
4. Return only verified provider options with supported deep links.
5. Deploy to a public HTTPS host and test the manifest URL.

**Important:** A Stremio add-on cannot force Arvio to display an Always Ask dialog, nor can it intercept existing Real-Debrid streams. Existing add-ons remain separate playback choices.

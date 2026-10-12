import http from 'node:http';

const PORT = Number(process.env.PORT || 3000);
const TMDB_TOKEN = process.env.TMDB_BEARER_TOKEN;
const providers = new Map([
  [8, 'Netflix'], [9, 'Prime Video (not subscribed)'],
  [337, 'Disney+'], [386, 'Peacock'], [387, 'Peacock Premium'],
  [531, 'Paramount+'], [582, 'Paramount+ Premium'], [283, 'Crunchyroll']
]);
const subscribed = new Set(['Netflix', 'Disney+', 'Peacock', 'Peacock Premium', 'Paramount+', 'Paramount+ Premium', 'Crunchyroll']);
const manifest = {
  id: 'community.arvio.source.selector', version: '0.2.0',
  name: 'Arvio Source Selector',
  description: 'US subscription availability links for your streaming services; Real-Debrid remains in your existing add-ons.',
  resources: ['stream'], types: ['movie', 'series'], idPrefixes: ['tt'], catalogs: []
};
function respond(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=900' });
  res.end(JSON.stringify(data));
}
async function tmdb(path) {
  const response = await fetch('https://api.themoviedb.org/3' + path, {
    headers: { Authorization: 'Bearer ' + TMDB_TOKEN, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error('TMDB HTTP ' + response.status);
  return response.json();
}
async function streams(type, imdb) {
  if (!TMDB_TOKEN) return [];
  const found = await tmdb('/find/' + encodeURIComponent(imdb) + '?external_source=imdb_id');
  const result = (type === 'movie' ? found.movie_results : found.tv_results)?.[0];
  if (!result) return [];
  const kind = type === 'movie' ? 'movie' : 'tv';
  const watch = await tmdb('/' + kind + '/' + result.id + '/watch/providers');
  const us = watch.results?.US;
  if (!us?.link) return [];
  // TMDB flatrate means included with subscription, not rent/buy.
  const names = [...new Set((us.flatrate || []).filter(p => subscribed.has(providers.get(p.provider_id))).map(p => providers.get(p.provider_id).replace(/ Premium$/, '')))];
  return names.map(name => ({
    name: 'Watch on ' + name + ' (subscription)',
    title: name + ' • Open viewing options',
    externalUrl: us.link,
    description: 'Opens TMDB watch options; select ' + name + ' there. Exact episode and app deep linking not yet supported.'
  }));
}
http.createServer(async (req, res) => {
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  if (path === '/manifest.json') return respond(res, manifest);
  if (path === '/health') return respond(res, { ok: true, tmdbConfigured: Boolean(TMDB_TOKEN) });
  const match = path.match(/^\/stream\/(movie|series)\/(tt\d+)(?::\d+:\d+)?\.json$/);
  if (!match) return respond(res, { error: 'Not found' }, 404);
  try { return respond(res, { streams: await streams(match[1], match[2]) }); }
  catch (err) { console.error(err); return respond(res, { streams: [] }); }
}).listen(PORT, '0.0.0.0', () => console.log('Arvio Source Selector on port ' + PORT));
